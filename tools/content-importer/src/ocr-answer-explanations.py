"""OCR 扫描版答案卷整页文本（解析占位年份的兜底路线）。

用法：python tools/content-importer/src/ocr-answer-explanations.py --year 2024 --threshold 160
对 local-data/work/rebuild/<year>/render/answers-N.jpg 逐页跑 rapidocr：
  - --threshold N：灰度二值化阈值。Neville 附录扫描页带浅灰斜向水印（“公众号：计算机考研数据”
    “微信：xlxj985211”，约 15-25% 不透明度），固定阈值可整体滤除灰水印、保住黑字正文，
    同时救回被水印压住的题号标记（如 2025 Q44）。0 表示关闭。
  - 连续字节级相同的页（源 PDF 重复页，如 2024 第 4 页）按 sha256 去重跳过。
  - 片段级水印过滤 + 行级噪声短语清洗（OCR 把水印并进文本框时的兜底）。
按 y 聚类成行、剔除卷头行，输出与 answer-pages.json 同构的文本页：
    local-data/work/rebuild/<year>/answer-ocr-pages.json  <- [{page, text}]
    local-data/work/rebuild/<year>/answer-ocr-raw.json    <- [{page, fragments}]（排查用）
build-year.mjs 读取 answer-ocr-pages.json 后，用 OCR 文本补齐 answer-pages.json 的空 text 作解析来源；
答案键仍走 answer-table-fragments/answer-ocr-fragments 的几何路线，互不影响。
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]

# 卷头/页眉行：无解析语义，进入块内只会形成噪声。
HEADER_PATTERNS = (
    "年计算机学科专业基础综合试题参考答案",
    "年全国硕士研究生招生考试计算机学科专业基础",
)

MARKER_PATTERN = re.compile(r"^\s*\d{1,2}\s*[.．、]?\s*【?(参考答案|答案要点|解[ \t]*[析答])")

# 水印 = “公众号：计算机考研数据” + “微信：xlxj985211” 的各种 OCR 截断/误读形态。
WATERMARK_SOURCE = "微信公众号计算机考研数据"
WATERMARK_ID_RE = re.compile(r"985211|85211|xlxj|x1xj", re.IGNORECASE)
WATERMARK_LABEL_RE = re.compile(r"^[\s：:·，、]*(?:微信|公众|公众号|号|微|信)[\s：:·，、]*$")

# 行级兜底：OCR 偶尔把水印并进正文文本框（“45.【答案要点】 真机考研数”），
# 片段级过滤救不了，按长前缀优先的短语表定点擦除。短语均为水印专名，
# 408 答案正文（组成原理/OS/网络/数据结构术语）不会包含这些组合。
LINE_NOISE_PHRASES = (
    "微信公众号：计算机考研数据",
    "公众号：计算机考研数据",
    "公众号·计算机考研数据",
    "公众号：计算机考研",
    "计算机考研数据",
    "计算机考研数",
    "计算机考研类",
    "计算机考研券",
    "计算机考研炭",
    "计算机考研老",
    "计算机老",
    "真机考研数",
    "算机考研数",
    "机考研数",
    "计算考数据",
    "计算考研数据",
    "考研数据",
    "考研数",
    "研数据",
    "公众号：",
    "公众号·",
    "微信：",
    "公众",
    "微信",
)
# 书籍页脚行：附录页码（“附录/85”，OCR 常误读为“赠录”“附录/B”）与
# “NN/2026年全国硕士研究生招生考试计算机学科专业基础考试大纲”式页脚
# （OCR 会把“硕士/研究生/招生”读成“矿究生/硬士/沼生”等，取多触发词兜底）。
# 408 答案正文不会出现“年全国+招生/硕士/研究生”组合，误伤风险为零。
FOOTER_LINE_RE = re.compile(
    r"^(?:[附赠]录\s*[/／·]\s*[\dB8olO]*$"
    r"|.*年全国.*(?:硕士|矿究|研究生|招生|沼生|硬士))"
)


def is_footer(line: str) -> bool:
    return bool(FOOTER_LINE_RE.match(line.strip()))


def is_watermark_fragment(text: str) -> bool:
    compact = re.sub(r"[\s：:·，、]", "", text)
    if not compact:
        return True
    if WATERMARK_ID_RE.search(compact):
        return True
    if len(compact) >= 3 and compact in WATERMARK_SOURCE:
        return True
    return bool(WATERMARK_LABEL_RE.match(text.strip()))


def is_header(line: str) -> bool:
    stripped = line.strip()
    if not stripped or not stripped[0].isdigit():
        return False
    return any(pattern in stripped for pattern in HEADER_PATTERNS)


def scrub_line(line: str) -> str:
    for phrase in LINE_NOISE_PHRASES:
        if phrase in line:
            line = line.replace(phrase, " ")
    return re.sub(r"[ \t]{2,}", " ", line).strip()


def fragments_to_text(fragments: list[dict]) -> str:
    lines = []
    current = None  # [y, [(x, text), ...]]
    for fragment in sorted(fragments, key=lambda item: (item["y"], item["x"])):
        if current is not None and abs(fragment["y"] - current[0]) <= 10:
            current[1].append((fragment["x"], fragment["text"]))
        else:
            if current is not None:
                lines.append(" ".join(text for _, text in sorted(current[1])))
            current = [fragment["y"], [(fragment["x"], fragment["text"])]]
    if current is not None:
        lines.append(" ".join(text for _, text in sorted(current[1])))
    scrubbed = (scrub_line(line) for line in lines)
    return "\n".join(
        line for line in scrubbed
        if line and not is_header(line) and not is_footer(line)
    )


def load_image(path: Path, threshold: int, scale: float):
    import cv2

    image = cv2.imread(str(path))
    if threshold:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, image = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    if scale and scale != 1.0:
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--pages", type=int, default=30, help="OCR 前 N 页答案渲染图（默认全部）")
    parser.add_argument("--threshold", type=int, default=0, help="灰度二值化阈值（0 关闭；扫描页水印建议 160）")
    parser.add_argument("--scale", type=float, default=1.0, help="OCR 前放大倍数（默认不放大）")
    args = parser.parse_args()

    from rapidocr_onnxruntime import RapidOCR

    engine = RapidOCR()
    work_dir = PROJECT_ROOT / "local-data" / "work" / "rebuild" / str(args.year)
    render_dir = work_dir / "render"
    pages = []
    raw_pages = []
    prev_digest = None
    for page in range(1, args.pages + 1):
        image_path = render_dir / f"answers-{page}.jpg"
        if not image_path.exists():
            break
        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        if digest == prev_digest:
            print(f"{args.year} answers page {page}: identical to previous page, skipped (source PDF duplicate)")
            continue
        prev_digest = digest
        result, _ = engine(load_image(image_path, args.threshold, args.scale))
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
        raw_pages.append({"page": page, "fragments": fragments})
        kept = [fragment for fragment in fragments if not is_watermark_fragment(fragment["text"])]
        dropped = len(fragments) - len(kept)
        text = fragments_to_text(kept)
        pages.append({"page": page, "text": text})
        markers = sum(1 for line in text.split("\n") if MARKER_PATTERN.match(line))
        print(f"{args.year} answers page {page}: {len(fragments)} fragments ({dropped} watermark), "
              f"{len(text)} chars, {markers} markers")

    (work_dir / "answer-ocr-pages.json").write_text(
        json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    (work_dir / "answer-ocr-raw.json").write_text(
        json.dumps(raw_pages, ensure_ascii=False), encoding="utf-8")
    print(f"written: {work_dir / 'answer-ocr-pages.json'} ({len(pages)} pages)")


if __name__ == "__main__":
    main()
