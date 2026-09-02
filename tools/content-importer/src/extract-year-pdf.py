"""Extract per-page text and page renders from a Neville-studio rebuild 408 paper.

Usage (project venv):
    python tools/content-importer/src/extract-year-pdf.py --year 2010

Inputs (git-ignored):
    local-data/sources/rebuild/<year>.pdf
    local-data/sources/rebuild/<year>-answer.pdf

Outputs:
    local-data/work/rebuild/<year>/paper-pages.json    [{ page, text, layoutText }]
    local-data/work/rebuild/<year>/answer-pages.json   [{ page, text, layoutText }]
    local-data/work/rebuild/<year>/render/paper-N.jpg
    local-data/work/rebuild/<year>/render/answers-N.jpg
"""

import argparse
import json
from pathlib import Path

from pypdf import PdfReader

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RENDER_SCALE = 1.6


def extract(reader: PdfReader) -> list[dict]:
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        pages.append({
            "page": index,
            "text": page.extract_text() or "",
            "layoutText": page.extract_text(extraction_mode="layout") or "",
        })
    return pages


def render(pdf_path: Path, out_dir: Path, prefix: str) -> list[str]:
    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(str(pdf_path))
    written = []
    try:
        for index in range(len(document)):
            bitmap = document[index].render(scale=RENDER_SCALE)
            image = bitmap.to_pil().convert("RGB")
            target = out_dir / f"{prefix}-{index + 1}.jpg"
            image.save(target, quality=82)
            written.append(str(target))
    finally:
        document.close()
    return written


def extract_fragments(reader: PdfReader, max_pages: int = 2) -> list[dict]:
    """按坐标收集答案卷前几页的文本片段（用于几何重建答案速对表）。"""
    pages = []
    for index, page in enumerate(reader.pages[:max_pages], start=1):
        fragments: list[dict] = []

        def visitor(text, cm, tm, font_dict, font_size, _fragments=fragments):
            stripped = (text or "").strip()
            if stripped:
                _fragments.append({"x": round(tm[4], 1), "y": round(tm[5], 1), "text": stripped})

        page.extract_text(visitor_text=visitor)
        pages.append({"page": index, "fragments": fragments})
    return pages


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    args = parser.parse_args()
    year = args.year

    sources = PROJECT_ROOT / "local-data" / "sources" / "rebuild"
    paper_pdf = sources / f"{year}.pdf"
    answer_pdf = sources / f"{year}-answer.pdf"
    for path in (paper_pdf, answer_pdf):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    work_dir = PROJECT_ROOT / "local-data" / "work" / "rebuild" / str(year)
    render_dir = work_dir / "render"
    render_dir.mkdir(parents=True, exist_ok=True)

    paper_pages = extract(PdfReader(str(paper_pdf)))
    answer_reader = PdfReader(str(answer_pdf))
    answer_pages = extract(answer_reader)
    (work_dir / "paper-pages.json").write_text(
        json.dumps(paper_pages, ensure_ascii=False, indent=1), encoding="utf-8")
    (work_dir / "answer-pages.json").write_text(
        json.dumps(answer_pages, ensure_ascii=False, indent=1), encoding="utf-8")
    (work_dir / "answer-table-fragments.json").write_text(
        json.dumps(extract_fragments(answer_reader), ensure_ascii=False), encoding="utf-8")

    paper_renders = render(paper_pdf, render_dir, "paper")
    answer_renders = render(answer_pdf, render_dir, "answers")
    print(f"{year}: {len(paper_pages)} paper pages, {len(answer_pages)} answer pages, "
          f"{len(paper_renders) + len(answer_renders)} renders -> {render_dir}")


if __name__ == "__main__":
    main()
