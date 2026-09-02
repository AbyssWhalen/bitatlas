"""OCR 答案卷页面（扫描版答案 PDF 的兜底路线）。

用法：python tools/content-importer/src/ocr-answer-table.py --year 2019
对 local-data/work/rebuild/<year>/render/answers-N.jpg 逐页跑 rapidocr，
输出与 extract-year-pdf.py 几何片段同构的 JSON（供 build-year.mjs 统一解析）：
    local-data/work/rebuild/<year>/answer-ocr-fragments.json
"""

import argparse
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--pages", type=int, default=2, help="OCR 前 N 页答案渲染图")
    args = parser.parse_args()

    from rapidocr_onnxruntime import RapidOCR

    engine = RapidOCR()
    work_dir = PROJECT_ROOT / "local-data" / "work" / "rebuild" / str(args.year)
    render_dir = work_dir / "render"
    pages = []
    for page in range(1, args.pages + 1):
        image_path = render_dir / f"answers-{page}.jpg"
        if not image_path.exists():
            break
        result, _ = engine(str(image_path))
        fragments = []
        if result:
            for box, text, confidence in result:
                stripped = (text or "").strip()
                if stripped:
                    # box 左上角作为坐标；y 取 PDF 风格（页高内相对位置不重要，只需同页可比）
                    fragments.append({
                        "x": round(float(box[0][0]), 1),
                        "y": round(float(box[0][1]), 1),
                        "text": stripped,
                    })
        pages.append({"page": page, "fragments": fragments})
        print(f"{args.year} answers page {page}: {len(fragments)} ocr fragments")

    (work_dir / "answer-ocr-fragments.json").write_text(
        json.dumps(pages, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
