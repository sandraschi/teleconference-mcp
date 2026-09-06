"""Tests for the vendored LLM provider registry (arxiv-mcp pilot pattern)."""

import json

import pytest
from conferencing_mcp import llm_providers


@pytest.fixture()
def isolated_data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("TELECONF_DATA_DIR", str(tmp_path))
    return tmp_path


def test_registry_shape():
    ids = [r["id"] for r in llm_providers.PROVIDERS]
    assert ids == ["ollama", "lmstudio", "vllm", "openai", "anthropic", "deepseek", "openrouter", "meta"]
    for row in llm_providers.PROVIDERS:
        assert row["kind"] in ("local", "cloud")
        if row["kind"] == "cloud":
            assert row["key_env"]
        else:
            assert row["key_env"] is None


def test_unknown_provider():
    with pytest.raises(ValueError, match="Known:"):
        llm_providers.require_provider("nope")


def test_keystore_roundtrip_0600(isolated_data_dir):
    llm_providers.save_key("openai", "sk-test-123")
    assert llm_providers.get_key("openai") == "sk-test-123"
    assert llm_providers.is_configured("openai") is True
    assert llm_providers.delete_key("openai") is True
    assert llm_providers.get_key("openai") == ""
    assert llm_providers.delete_key("openai") is False


def test_keystore_rejects_local_and_empty(isolated_data_dir):
    with pytest.raises(ValueError, match="takes no API key"):
        llm_providers.save_key("ollama", "x")
    with pytest.raises(ValueError, match="Empty API key"):
        llm_providers.save_key("openai", "  ")


def test_env_wins_over_keystore(isolated_data_dir, monkeypatch):
    llm_providers.save_key("openai", "sk-keystore")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-env")
    assert llm_providers.get_key("openai") == "sk-env"


def test_public_info_leaks_no_keys(isolated_data_dir, monkeypatch):
    llm_providers.save_key("openai", "sk-super-secret-value")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-secret")
    infos = llm_providers.public_provider_info()
    blob = json.dumps(infos)
    assert "sk-super-secret-value" not in blob
    assert "sk-ant-secret" not in blob
    by_id = {i["id"]: i for i in infos}
    assert by_id["openai"]["configured"] is True
    assert by_id["ollama"]["configured"] is True  # locals need no key


def test_settings_roundtrip(isolated_data_dir):
    saved = llm_providers.save_llm_settings("meta", "muse-spark-1.3")
    assert saved == {"provider": "meta", "model": "muse-spark-1.3"}
    assert llm_providers.load_llm_settings() == saved
    with pytest.raises(ValueError, match="Unknown provider"):
        llm_providers.save_llm_settings("nope", "x")


def test_anthropic_mapping():
    body = llm_providers._to_anthropic(
        "claude-sonnet-4-20250514",
        [
            {"role": "system", "content": "Be brief."},
            {"role": "user", "content": "Hi"},
        ],
    )
    assert body["system"] == "Be brief."
    assert body["messages"] == [{"role": "user", "content": "Hi"}]
    assert body["max_tokens"] == 1024
    text = llm_providers._from_anthropic({"content": [{"type": "text", "text": "Hello"}]})
    assert text == "Hello"


def test_onboarding_shape(isolated_data_dir):
    state = llm_providers.onboarding_state()
    assert {loc["id"] for loc in state["locals"]} == {"ollama", "lmstudio", "vllm"}
    assert "recommendation" in state and "path" in state["recommendation"]
