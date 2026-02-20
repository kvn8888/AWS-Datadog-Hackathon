"""MiniMax API tool wrappers for TTS narration and concept image generation.

Uses httpx directly — no official MiniMax Python SDK for TTS/images.
Endpoints: api.minimaxi.chat/v1/t2a_v2 (TTS), api.minimaxi.chat/v1/image/generation (images)
"""

import os
import httpx
from strands import tool

MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_BASE = "https://api.minimaxi.chat/v1"


@tool
def generate_narration(text: str, voice_id: str = "male-qn-qingse") -> str:
    """Generate TTS narration audio for a lesson using MiniMax speech-02-hd.

    Args:
        text: The lesson text to narrate
        voice_id: MiniMax voice ID (default: male-qn-qingse)

    Returns:
        Audio URL string, or empty string if generation fails
    """
    if not MINIMAX_API_KEY:
        return ""

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                f"{MINIMAX_BASE}/t2a_v2",
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "speech-02-hd",
                    "text": text[:5000],  # Limit text length
                    "voice_setting": {
                        "voice_id": voice_id,
                        "speed": 0.95,
                    },
                    "audio_setting": {
                        "format": "mp3",
                        "sample_rate": 32000,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # MiniMax may return audio_url or base64 data — adapt based on actual response
            return data.get("audio_url", data.get("data", {}).get("audio", {}).get("audio_url", ""))
    except Exception as e:
        print(f"MiniMax TTS error: {e}")
        return ""


@tool
def generate_visual(description: str) -> str:
    """Generate a concept visual/diagram for a lesson using MiniMax image-01.

    Args:
        description: Description of the concept to visualize

    Returns:
        Image URL string, or empty string if generation fails
    """
    if not MINIMAX_API_KEY:
        return ""

    try:
        with httpx.Client(timeout=90.0) as client:
            resp = client.post(
                f"{MINIMAX_BASE}/image/generation",
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "image-01",
                    "prompt": f"Clean minimal technical diagram: {description}. White background, professional style, no text overlays.",
                    "aspect_ratio": "16:9",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            # Adapt based on actual response shape
            return data.get("image_url", data.get("data", {}).get("image_url", ""))
    except Exception as e:
        print(f"MiniMax image gen error: {e}")
        return ""
