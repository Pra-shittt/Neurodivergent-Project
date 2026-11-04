import os
import re
import logging
import functools

# Compatibility patch for PyAV versions where av.open does not take metadata_errors
try:
    import av
    orig_av_open = av.open

    @functools.wraps(orig_av_open)
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return orig_av_open(*args, **kwargs)

    av.open = _safe_av_open
except Exception as e:
    logging.warning(f"Could not patch av.open: {e}")

from faster_whisper import WhisperModel

# Path to cached local model if present (for offline/isolated environments)
LOCAL_SNAPSHOT_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../models/hub/models--Systran--faster-whisper-base/snapshots/ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66",
    )
)
model_source = LOCAL_SNAPSHOT_DIR if os.path.isdir(LOCAL_SNAPSHOT_DIR) else "base"

_stt_model = None

def get_stt_model():
    global _stt_model
    if _stt_model is None:
        _stt_model = WhisperModel(model_source, device="cpu", compute_type="int8")
    return _stt_model

# Known Whisper phantom hallucinations on silence, breathing, or background noise
HALLUCINATION_PATTERNS = [
    r"thank(s)? (you )?for watching(\.|\!|\?)?",
    r"thanks for listening(\.|\!|\?)?",
    r"please subscribe.*",
    r"like and subscribe.*",
    r"subtitles by.*",
    r"subscribe to (my|the) channel.*",
    r"see you in the next (video|one).*",
    r"translated by.*",
    r"amara\.org.*",
    r"mbc.*",
    r"^\s*(you|bye|thank you|thanks|welcome|so)\.?\s*$",
]


def clean_transcript(text: str) -> str:
    """Removes common Whisper hallucinations, repetitive phantom tokens,
    and strips leading/trailing artifact punctuation.
    """
    if not text:
        return ""

    cleaned = text.strip()

    # Detect repeating n-gram loops (e.g. "Thank you. Thank you. Thank you." or "You. You. You.")
    words = [w.lower().strip(".,!?:;") for w in cleaned.split() if w.strip(".,!?:;")]
    if len(words) >= 4:
        # Check single-word repetition
        if len(set(words)) <= 1:
            return ""
        # Check 2-word or 3-word n-gram loops
        for n in [2, 3]:
            if len(words) >= n * 2:
                grams = [" ".join(words[i:i+n]) for i in range(0, (len(words) // n) * n, n)]
                if len(set(grams)) == 1:
                    return ""

    for pattern in HALLUCINATION_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()

    # Clean stray trailing punctuation left over from removed hallucination phrases
    cleaned = re.sub(r"[\s\.,;!?-]+$", "", cleaned).strip()

    # If nothing substantial remains
    if len(cleaned) < 2 or not any(c.isalnum() for c in cleaned):
        return ""

    return cleaned


def transcribe_audio_file(file_path: str) -> str:
    """Transcribe an audio file using Faster Whisper with VAD filtering,
    greedy decoding, and hallucination suppression.

    Args:
        file_path: Path to the audio file (e.g., .webm, .wav, .mp3).

    Returns:
        The concatenated transcript as a single string. Returns an empty string on error or silence.
    """
    try:
        if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
            return ""

        # Using vad_filter=True to strip non-speech background noise,
        # temperature=0.0 for deterministic decoding (no random sampling),
        # condition_on_previous_text=False to prevent hallucination carryover.
        model = get_stt_model()
        segments, info = model.transcribe(
            file_path,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=400,
                speech_pad_ms=200,
            ),
            temperature=0.0,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
        )

        texts = []
        for segment in segments:
            # Skip segments with high probability of no speech
            if getattr(segment, "no_speech_prob", 0) > 0.75:
                continue

            text = segment.text.strip()
            if text:
                texts.append(text)

        raw_transcript = " ".join(texts).strip()
        cleaned_transcript = clean_transcript(raw_transcript)
        return cleaned_transcript
    except Exception as e:
        logging.error(f"Error transcribing audio file {file_path}: {e}")
        return ""
