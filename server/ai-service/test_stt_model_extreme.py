import os
import sys
import wave
import struct
import random
import tempfile
import math
import logging

# Set up paths
AI_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.audio_stt import transcribe_audio_file, clean_transcript


def create_test_wav(duration_s=2.0, sample_rate=16000, generator_fn=None):
    """Creates a temporary wav file with generated audio samples."""
    num_samples = int(duration_s * sample_rate)
    samples = []
    for i in range(num_samples):
        if generator_fn:
            val = generator_fn(i, sample_rate)
        else:
            val = 0
        val = max(-32768, min(32767, int(val)))
        samples.append(val)

    data = struct.pack("<" + ("h" * num_samples), *samples)
    f = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    path = f.name
    f.close()

    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(data)

    return path


def run_extreme_tests():
    print("=" * 65)
    print("      NEUROPORTAL STT EXTREME STRESS & ROBUSTNESS TEST SUITE    ")
    print("=" * 65)

    test_results = []

    # -------------------------------------------------------------
    # Test 1: Absolute Silence (2.5 seconds of 0s)
    # -------------------------------------------------------------
    path = create_test_wav(duration_s=2.5, generator_fn=lambda i, sr: 0)
    try:
        res = transcribe_audio_file(path)
        passed = (res == "")
        test_results.append(("Absolute Silence (2.5s)", passed, f"Output: '{res}'"))
    finally:
        os.remove(path)

    # -------------------------------------------------------------
    # Test 2: Low-Amplitude Ambient Noise (Fan/AC/Computer hum)
    # -------------------------------------------------------------
    random.seed(12345)
    path = create_test_wav(
        duration_s=3.0,
        generator_fn=lambda i, sr: (
            50 * math.sin(2 * math.pi * 60 * (i / sr))  # 60Hz mains hum
            + random.randint(-120, 120)  # low ambient noise
        )
    )
    try:
        res = transcribe_audio_file(path)
        passed = (res == "")
        test_results.append(("Ambient Room Noise (60Hz hum + hiss)", passed, f"Output: '{res}'"))
    finally:
        os.remove(path)

    # -------------------------------------------------------------
    # Test 3: Sudden Clicks / Keyboard Typing Blips
    # -------------------------------------------------------------
    def keyboard_clicks(i, sr):
        # click every 0.4s
        if (i % int(0.4 * sr)) < 50:
            return 8000 * math.sin(2 * math.pi * 1000 * (i / sr))
        return random.randint(-40, 40)

    path = create_test_wav(duration_s=3.0, generator_fn=keyboard_clicks)
    try:
        res = transcribe_audio_file(path)
        passed = (res == "")
        test_results.append(("Keyboard Clicks & Taps", passed, f"Output: '{res}'"))
    finally:
        os.remove(path)

    # -------------------------------------------------------------
    # Test 4: Breathing / Microphone Puff
    # -------------------------------------------------------------
    def breath_puff(i, sr):
        # low rumble puff
        envelope = math.exp(-((i - 16000) ** 2) / (2 * 4000 ** 2))
        return envelope * 1500 * math.sin(2 * math.pi * 120 * (i / sr))

    path = create_test_wav(duration_s=2.5, generator_fn=breath_puff)
    try:
        res = transcribe_audio_file(path)
        passed = (res == "")
        test_results.append(("Microphone Breath Puff", passed, f"Output: '{res}'"))
    finally:
        os.remove(path)

    # -------------------------------------------------------------
    # Test 5: Empty / Corrupted File Handling
    # -------------------------------------------------------------
    corrupt_file = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
    corrupt_file.write(b"not an audio file at all")
    corrupt_path = corrupt_file.name
    corrupt_file.close()
    try:
        res = transcribe_audio_file(corrupt_path)
        passed = (res == "")
        test_results.append(("Corrupted Non-Audio File", passed, f"Output: '{res}'"))
    finally:
        os.remove(corrupt_path)

    # -------------------------------------------------------------
    # Test 6: Zero-Byte File Handling
    # -------------------------------------------------------------
    zero_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    zero_path = zero_file.name
    zero_file.close()
    try:
        res = transcribe_audio_file(zero_path)
        passed = (res == "")
        test_results.append(("0-Byte Empty File", passed, f"Output: '{res}'"))
    finally:
        os.remove(zero_path)

    # -------------------------------------------------------------
    # Test 7: Hallucination Filter Regex Assertions
    # -------------------------------------------------------------
    hallucination_cases = [
        ("Thank you for watching!", ""),
        ("Thanks for listening.", ""),
        ("Please subscribe to my channel", ""),
        ("Subtitles by Amara.org", ""),
        ("You.", ""),
        ("Bye.", ""),
        ("Thank you. Thank you. Thank you. Thank you.", ""),
        ("Today was bright and loud.", "Today was bright and loud"),
        ("Overwhelming day at work. Thank you for watching!", "Overwhelming day at work"),
    ]
    hallucination_passed = True
    for sample, expected in hallucination_cases:
        actual = clean_transcript(sample)
        if actual != expected:
            hallucination_passed = False
            print(f"  FAILED regex: '{sample}' -> got '{actual}', expected '{expected}'")

    test_results.append(("Hallucination Pattern Stripping", hallucination_passed, "Filtered all phantom phrases"))

    # -------------------------------------------------------------
    # Print Summary Report
    # -------------------------------------------------------------
    print("\n" + "-" * 65)
    print(f"{'TEST CASE':<40} | {'STATUS':<8} | {'DETAILS'}")
    print("-" * 65)
    all_ok = True
    for name, passed, detail in test_results:
        status_str = "PASS [OK]" if passed else "FAIL [X]"
        if not passed:
            all_ok = False
        print(f"{name:<40} | {status_str:<8} | {detail}")

    print("-" * 65)
    if all_ok:
        print(">>> ALL EXTREME ROBUSTNESS TESTS PASSED PERFECTLY! <<<")
    else:
        print(">>> SOME TESTS FAILED <<<")
    print("=" * 65)


if __name__ == "__main__":
    run_extreme_tests()

