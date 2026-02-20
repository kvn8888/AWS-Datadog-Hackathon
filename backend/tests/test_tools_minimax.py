"""Tests for MiniMax tool wrappers."""

import pytest
from unittest.mock import patch, MagicMock
from tools.minimax import generate_narration, generate_visual


# ---------------------------------------------------------------------------
# generate_narration
# ---------------------------------------------------------------------------
class TestGenerateNarration:
    @patch("tools.minimax.MINIMAX_API_KEY", "")
    def test_no_api_key_returns_empty(self):
        result = generate_narration("Hello world")
        assert result == ""

    @patch("tools.minimax.MINIMAX_API_KEY", "test-key")
    @patch("tools.minimax.httpx.Client")
    def test_successful_api_call(self, mock_client_cls):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"audio_url": "https://example.com/audio.mp3"}
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        result = generate_narration("Test text")
        assert result == "https://example.com/audio.mp3"
        mock_client.post.assert_called_once()

    @patch("tools.minimax.MINIMAX_API_KEY", "test-key")
    @patch("tools.minimax.httpx.Client")
    def test_api_error_returns_empty(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.side_effect = Exception("Connection failed")
        mock_client_cls.return_value = mock_client

        result = generate_narration("Test text")
        assert result == ""

    @patch("tools.minimax.MINIMAX_API_KEY", "test-key")
    @patch("tools.minimax.httpx.Client")
    def test_nested_response_format(self, mock_client_cls):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "data": {"audio": {"audio_url": "https://example.com/nested.mp3"}}
        }
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        result = generate_narration("Test text")
        assert result == "https://example.com/nested.mp3"


# ---------------------------------------------------------------------------
# generate_visual
# ---------------------------------------------------------------------------
class TestGenerateVisual:
    @patch("tools.minimax.MINIMAX_API_KEY", "")
    def test_no_api_key_returns_empty(self):
        result = generate_visual("A diagram of async flow")
        assert result == ""

    @patch("tools.minimax.MINIMAX_API_KEY", "test-key")
    @patch("tools.minimax.httpx.Client")
    def test_successful_api_call(self, mock_client_cls):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"image_url": "https://example.com/img.png"}
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client

        result = generate_visual("concept diagram")
        assert result == "https://example.com/img.png"

    @patch("tools.minimax.MINIMAX_API_KEY", "test-key")
    @patch("tools.minimax.httpx.Client")
    def test_api_error_returns_empty(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.side_effect = Exception("Timeout")
        mock_client_cls.return_value = mock_client

        result = generate_visual("diagram")
        assert result == ""
