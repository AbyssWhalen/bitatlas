from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parents[3]
RENDER_DIR = ROOT / "local-data" / "work" / "render"
OUTPUT_DIR = ROOT / "local-data" / "work" / "ocr"


def natural_page(path: Path) -> int:
    match = re.search(r"(\d+)$", path.stem)
    if not match:
        raise ValueError(f"Cannot determine page number from {path.name}")
    return int(match.group(1))


def serialize_box(box: object) -> list[list[float]]:
    return [[float(point[0]), float(point[1])] for point in box]  # type: ignore[index]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local OCR over rendered 408 PDF pages.")
    parser.add_argument("document", choices=("questions", "answers"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{args.document}.json"
    if output_path.exists() and not args.force:
        print(f"Using cached OCR: {output_path}")
        return

    image_paths = sorted(RENDER_DIR.glob(f"{args.document}-*.png"), key=natural_page)
    if not image_paths:
        raise FileNotFoundError(f"No rendered pages found for {args.document} in {RENDER_DIR}")

    engine = RapidOCR()
    pages = []
    for index, image_path in enumerate(image_paths, start=1):
        result, elapsed = engine(str(image_path))
        lines = []
        for box, text, confidence in result or []:
            lines.append({"box": serialize_box(box), "text": text.strip(), "confidence": float(confidence)})
        page = natural_page(image_path)
        pages.append({"page": page, "image": image_path.name, "lines": lines})
        print(f"[{index}/{len(image_paths)}] {image_path.name}: {len(lines)} lines, elapsed={elapsed}", flush=True)

    output_path.write_text(
        json.dumps({"document": args.document, "engine": "rapidocr_onnxruntime-1.4.4", "pages": pages}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()

