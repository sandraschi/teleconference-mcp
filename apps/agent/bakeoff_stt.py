"""
apps/agent/bakeoff_stt.py — STT provider bake-off (Whisper vs Deepgram vs Muse).

Runs the SAME audio file through each vendor's one-shot REST API and scores
WER against a reference transcript plus a simplified time-based DER against an
optional reference RTTM. Numbers decide — see docs/FEATURES.md section 18.

Usage:
    uv run python apps/agent/bakeoff_stt.py --audio meeting.wav \\
        --reference ref.txt [--rttm ref.rttm] \\
        [--providers whisper,deepgram,muse] [--out results.json]

Keys (only needed for providers you actually run):
    OPENAI_API_KEY, DEEPGRAM_API_KEY, META_API_KEY
    MUSE_TRANSCRIBE_BASE_URL (default https://api.meta.ai/v1)

Notes:
- This scores one-shot/file transcription, NOT live streaming latency or
  endpointing. Streaming behavior must be evaluated separately in the agent.
- WER is computed locally (no new deps): normalized edit distance on words.
- DER here is simplified: fraction of scored time where the hypothesis speaker
  disagrees with the RTTM reference, using word-level timestamps. Providers
  that return no word timestamps get DER "n/a" instead of a fake number.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys

try:
    import aiohttp
except ImportError as e:
    print("aiohttp is required (pip install aiohttp)", file=sys.stderr)
    raise SystemExit(2) from e


# ---------------------------------------------------------------------------
# Scoring (local, dependency-free)
# ---------------------------------------------------------------------------


def normalize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9'äöüß ]", " ", text)
    return [w for w in text.split() if w]


def wer(reference: str, hypothesis: str) -> dict:
    ref, hyp = normalize(reference), normalize(hypothesis)
    n, m = len(ref), len(hyp)
    if n == 0:
        return {"wer": None, "note": "empty reference"}
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    edits = prev[m]
    return {"wer": edits / n, "edits": edits, "ref_words": n, "hyp_words": m}


def simplified_der(rttm_path: str, words: list[dict]) -> dict:
    """Time-weighted speaker confusion vs RTTM. Needs word timestamps."""
    if not words or any(w.get("start") is None for w in words):
        return {"der": None, "note": "no word timestamps from provider"}
    ref_segs: list[tuple[float, float, str]] = []
    with open(rttm_path) as f:
        for line in f:
            parts = line.split()
            if len(parts) >= 8 and parts[0] == "SPEAKER":
                ref_segs.append((float(parts[3]), float(parts[3]) + float(parts[4]), parts[7]))
    if not ref_segs:
        return {"der": None, "note": "no SPEAKER lines in RTTM"}
    # Map hypothesis speaker labels onto reference labels by majority overlap.
    overlap: dict[tuple[str, str], float] = {}
    total = 0.0
    confused = 0.0
    step = 0.25
    t = min(s for s, _, _ in ref_segs)
    end = max(e for _, e, _ in ref_segs)
    # Build hyp segments from words (merge consecutive same-speaker words).
    hyp_segs: list[tuple[float, float, str]] = []
    for w in words:
        spk = str(w.get("speaker", "?"))
        if hyp_segs and hyp_segs[-1][2] == spk and w["start"] - hyp_segs[-1][1] < 1.0:
            hyp_segs[-1] = (hyp_segs[-1][0], w["end"], spk)
        else:
            hyp_segs.append((w["start"], w["end"], spk))

    def spk_at(segs, t):
        for s, e, sp in segs:
            if s <= t < e:
                return sp
        return None

    while t < end:
        r = spk_at(ref_segs, t)
        if r is not None:
            total += step
            h = spk_at(hyp_segs, t)
            if h is not None:
                overlap[(r, h)] = overlap.get((r, h), 0.0) + step
        t += step
    if total == 0:
        return {"der": None, "note": "no overlapping speech time"}
    # Greedy label mapping ref -> hyp by max overlap.
    mapping: dict[str, str] = {}
    used_h: set[str] = set()
    for r in {k[0] for k in overlap}:
        cands = sorted(
            ((h, v) for (rr, h), v in overlap.items() if rr == r and h not in used_h),
            key=lambda x: -x[1],
        )
        if cands:
            mapping[r] = cands[0][0]
            used_h.add(cands[0][0])
    t = min(s for s, _, _ in ref_segs)
    while t < end:
        r = spk_at(ref_segs, t)
        if r is not None:
            h = spk_at(hyp_segs, t)
            if h is None or mapping.get(r) != h:
                confused += step
        t += step
    return {"der": confused / total, "scored_sec": round(total, 1)}


# ---------------------------------------------------------------------------
# Provider adapters (one-shot REST) — each returns (text, words[])
# ---------------------------------------------------------------------------


async def run_whisper(session: aiohttp.ClientSession, audio: str) -> tuple[str, list]:
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")
    data = aiohttp.FormData()
    data.add_field("file", open(audio, "rb"), filename=os.path.basename(audio))
    data.add_field("model", "whisper-1")
    data.add_field("response_format", "verbose_json")
    async with session.post(
        "https://api.openai.com/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {key}"},
        data=data,
    ) as resp:
        body = await resp.json()
        if resp.status != 200:
            raise RuntimeError(f"whisper {resp.status}: {body}")
    words = [{"start": w["start"], "end": w["end"], "speaker": "?", "text": w["word"]} for w in body.get("words", [])]
    return body.get("text", ""), words


async def run_deepgram(session: aiohttp.ClientSession, audio: str) -> tuple[str, list]:
    key = os.environ.get("DEEPGRAM_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPGRAM_API_KEY not set")
    with open(audio, "rb") as f:
        payload = f.read()
    params = "model=nova-3&smart_format=true&diarize=true&utterances=true"
    async with session.post(
        f"https://api.deepgram.com/v1/listen?{params}",
        headers={"Authorization": f"Token {key}", "Content-Type": "audio/wav"},
        data=payload,
    ) as resp:
        body = await resp.json()
        if resp.status != 200:
            raise RuntimeError(f"deepgram {resp.status}: {body}")
    alt = body["results"]["channels"][0]["alternatives"][0]
    words = [
        {"start": w["start"], "end": w["end"], "speaker": str(w.get("speaker", "?")), "text": w["punctuated_word"]}
        for w in alt.get("words", [])
    ]
    return alt.get("transcript", ""), words


async def run_muse(session: aiohttp.ClientSession, audio: str) -> tuple[str, list]:
    key = os.environ.get("META_API_KEY", "")
    if not key:
        raise RuntimeError("META_API_KEY not set")
    base = os.environ.get("MUSE_TRANSCRIBE_BASE_URL", "https://api.meta.ai/v1").rstrip("/")
    data = aiohttp.FormData()
    data.add_field("file", open(audio, "rb"), filename=os.path.basename(audio))
    data.add_field("model", os.environ.get("MUSE_TRANSCRIBE_MODEL", "muse-voice-transcribe-1.0"))
    data.add_field("response_format", "verbose_json")
    async with session.post(
        f"{base}/audio/transcriptions",
        headers={"Authorization": f"Bearer {key}"},
        data=data,
    ) as resp:
        body = await resp.json()
        if resp.status != 200:
            raise RuntimeError(f"muse {resp.status}: {body}")
    words = [
        {
            "start": w.get("start"),
            "end": w.get("end"),
            "speaker": str(w.get("speaker", w.get("speaker_label", "?"))),
            "text": w.get("word", w.get("text", "")),
        }
        for w in body.get("words", [])
    ]
    text = body.get("text", "") or " ".join(w["text"] for w in words)
    return text, words


PROVIDERS = {"whisper": run_whisper, "deepgram": run_deepgram, "muse": run_muse}


async def main() -> None:
    ap = argparse.ArgumentParser(description="STT bake-off: same audio, N providers, WER/DER.")
    ap.add_argument("--audio", required=True)
    ap.add_argument("--reference", required=True, help="Reference transcript (.txt)")
    ap.add_argument("--rttm", default=None, help="Reference diarization (.rttm, optional)")
    ap.add_argument("--providers", default="whisper,deepgram,muse")
    ap.add_argument("--out", default=None, help="Write results JSON here")
    args = ap.parse_args()

    with open(args.reference) as f:
        reference = f.read()
    results: dict[str, dict] = {}
    async with aiohttp.ClientSession() as session:
        for name in [p.strip() for p in args.providers.split(",") if p.strip()]:
            if name not in PROVIDERS:
                results[name] = {"error": f"unknown provider (choose from {sorted(PROVIDERS)})"}
                continue
            try:
                text, words = await PROVIDERS[name](session, args.audio)
                row: dict = {"text": text[:500], "wer": wer(reference, text)}
                row["der"] = simplified_der(args.rttm, words) if args.rttm else {"der": None, "note": "no --rttm given"}
                row["speakers_seen"] = sorted({str(w.get("speaker")) for w in words})
                row["words"] = len(words)
                results[name] = row
            except Exception as e:  # bake-off must report, not crash
                results[name] = {"error": str(e)}

    print(f"\n{'provider':<10} {'WER':>7} {'DER':>7} {'words':>6} notes")
    for name, r in results.items():
        if "error" in r:
            print(f"{name:<10} {'FAIL':>7} {'':>7} {'':>6} {r['error'][:80]}")
            continue
        w, d = r["wer"], r["der"]
        ws = f"{w['wer']:.1%}" if w.get("wer") is not None else "n/a"
        ds = f"{d['der']:.1%}" if d.get("der") is not None else f"n/a ({d.get('note', '')[:40]})"
        print(f"{name:<10} {ws:>7} {ds:>7} {r['words']:>6} speakers={r['speakers_seen']}")
    if args.out:
        with open(args.out, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nFull results -> {args.out}")
    print("\nRead the transcripts by hand before trusting any number.")


if __name__ == "__main__":
    asyncio.run(main())
