"""Local speech for the Visio agent.

faster-whisper does speech-to-text. Piper does text-to-speech.
Neither needs an OpenAI key. Voice files live under LOCALAPPDATA.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from livekit import rtc
from livekit.agents import stt, tts, utils
from livekit.agents.types import (
    DEFAULT_API_CONNECT_OPTIONS,
    NOT_GIVEN,
    APIConnectOptions,
    NotGivenOr,
)

logger = logging.getLogger("ag-visio-agent")

PIPER_VOICE = os.environ.get("PIPER_VOICE", "en_US-lessac-medium")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base")
WHISPER_SAMPLE_RATE = 16000

_voice = None
_whisper = None


def voice_dir() -> Path:
    root = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "teleconference-mcp" / "voices"
    root.mkdir(parents=True, exist_ok=True)
    return root


def ensure_piper_voice(voice: str = PIPER_VOICE) -> Path:
    """Download the Piper onnx voice once. Returns the model path."""
    from piper.download_voices import download_voice

    dest = voice_dir()
    download_voice(voice, dest)
    return dest / f"{voice}.onnx"


def get_piper_voice():
    global _voice
    if _voice is None:
        from piper import PiperVoice

        model_path = ensure_piper_voice()
        logger.info("Loading Piper voice %s", model_path.name)
        _voice = PiperVoice.load(model_path)
    return _voice


def whisper_dir() -> Path:
    root = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "teleconference-mcp" / "whisper" / WHISPER_MODEL
    root.mkdir(parents=True, exist_ok=True)
    return root


def ensure_whisper_model() -> Path:
    """Download Systran faster-whisper weights into LOCALAPPDATA.

    The shared Hugging Face cache on this machine has 0-byte copies of these
    files, so the loader must not read that cache.
    """
    candidate = Path(WHISPER_MODEL)
    if candidate.is_dir() and (candidate / "model.bin").is_file():
        return candidate

    dest = whisper_dir()
    repo = os.environ.get("WHISPER_REPO", f"Systran/faster-whisper-{WHISPER_MODEL}")
    names = ("config.json", "model.bin", "tokenizer.json", "vocabulary.txt")
    for name in names:
        path = dest / name
        if path.is_file() and path.stat().st_size > 0:
            continue
        url = f"https://huggingface.co/{repo}/resolve/main/{name}?download=true"
        logger.info("Downloading %s", name)
        with urlopen(url) as response, path.open("wb") as out:
            shutil.copyfileobj(response, out)
    return dest


def get_whisper():
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel

        model_path = ensure_whisper_model()
        logger.info("Loading faster-whisper model %s", model_path)
        _whisper = WhisperModel(str(model_path), device="cpu", compute_type="int8")
    return _whisper


def _as_frame(buffer: utils.AudioBuffer) -> rtc.AudioFrame:
    if isinstance(buffer, list):
        return rtc.combine_audio_frames(buffer)
    return buffer


def _to_whisper_audio(frame: rtc.AudioFrame) -> np.ndarray:
    samples = np.frombuffer(bytes(frame.data), dtype=np.int16).astype(np.float32)
    samples /= 32768.0
    if frame.num_channels > 1:
        samples = samples.reshape(-1, frame.num_channels).mean(axis=1)
    if frame.sample_rate != WHISPER_SAMPLE_RATE and len(samples) > 1:
        out_len = max(1, int(len(samples) * WHISPER_SAMPLE_RATE / frame.sample_rate))
        samples = np.interp(
            np.linspace(0, len(samples) - 1, out_len),
            np.arange(len(samples)),
            samples,
        ).astype(np.float32)
    return np.ascontiguousarray(samples, dtype=np.float32)


def _transcribe(samples: np.ndarray) -> str:
    if samples.size == 0:
        return ""
    segments, _info = get_whisper().transcribe(
        samples,
        language="en",
        beam_size=1,
        vad_filter=False,
    )
    return " ".join(segment.text.strip() for segment in segments).strip()


class LocalWhisperSTT(stt.STT):
    """Batch Whisper. The session wraps it with the local VAD."""

    def __init__(self) -> None:
        super().__init__(capabilities=stt.STTCapabilities(streaming=False, interim_results=False))
        get_whisper()

    @property
    def model(self) -> str:
        return WHISPER_MODEL

    @property
    def provider(self) -> str:
        return "faster-whisper"

    async def _recognize_impl(
        self,
        buffer: utils.AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        del language, conn_options
        samples = _to_whisper_audio(_as_frame(buffer))
        text = await asyncio.to_thread(_transcribe, samples)
        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[stt.SpeechData(language="en", text=text)],
        )


class _PiperChunkedStream(tts.ChunkedStream):
    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        voice = get_piper_voice()
        chunks = await asyncio.to_thread(lambda: list(voice.synthesize(self.input_text)))
        if not chunks:
            return
        output_emitter.initialize(
            request_id="piper",
            sample_rate=chunks[0].sample_rate,
            num_channels=chunks[0].sample_channels,
            mime_type="audio/pcm",
        )
        for chunk in chunks:
            output_emitter.push(chunk.audio_int16_bytes)


class LocalPiperTTS(tts.TTS):
    """In-process Piper. Downloads en_US-lessac-medium on first use."""

    def __init__(self) -> None:
        voice = get_piper_voice()
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=voice.config.sample_rate,
            num_channels=1,
        )

    @property
    def model(self) -> str:
        return PIPER_VOICE

    @property
    def provider(self) -> str:
        return "piper"

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> tts.ChunkedStream:
        return _PiperChunkedStream(tts=self, input_text=text, conn_options=conn_options)
