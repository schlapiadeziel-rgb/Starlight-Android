"""Fetch the exact licensed source photograph used by the offline Android app."""
from pathlib import Path
import hashlib
import os
import tempfile
import urllib.request

SOURCE = "https://cdn.eso.org/images/publicationjpg/eso0932a.jpg"
EXPECTED_SHA256 = "5363732a1629eed9df2f707b31eaae6b117c0ee35d7cc8d6ddd636bc6512302d"
EXPECTED_BYTES = 4857484
TARGET = Path(__file__).resolve().parents[1] / "app/src/main/assets/textures/milky-way.jpg"


def verified(path):
    return path.is_file() and path.stat().st_size == EXPECTED_BYTES and hashlib.sha256(path.read_bytes()).hexdigest() == EXPECTED_SHA256


def main():
    if verified(TARGET):
        print("Verified local ESO/S. Brunier panorama; no download needed.")
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temp = None
    try:
        with tempfile.NamedTemporaryFile(dir=TARGET.parent, suffix=".download", delete=False) as out:
            temp = Path(out.name)
            with urllib.request.urlopen(SOURCE, timeout=45) as response:
                count = 0
                while chunk := response.read(65536):
                    count += len(chunk)
                    if count > EXPECTED_BYTES:
                        raise ValueError("Panorama source changed: unexpected size")
                    out.write(chunk)
        if not verified(temp):
            raise ValueError("Panorama source changed: SHA-256 verification failed")
        os.replace(temp, TARGET)
        print("Bundled verified original ESO/S. Brunier panorama (4000 x 2000).")
    finally:
        if temp is not None and temp.exists():
            temp.unlink()


if __name__ == "__main__":
    main()
