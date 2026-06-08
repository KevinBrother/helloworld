import time


def delay(durationMs=0, **_kwargs):
    if durationMs is None:
        durationMs = 0
    duration_ms = float(durationMs)
    if duration_ms < 0:
        raise ValueError("durationMs must be non-negative")
    time.sleep(duration_ms / 1000)
