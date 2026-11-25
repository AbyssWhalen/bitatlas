// Measure CSS foreground against rendered pixels with only text paint suppressed.
// This covers nested transparent backgrounds, gradients, and overlapping surfaces.
// Contrast uses un-antialiased foreground colors (WCAG relative luminance), not
// glyph-edge pixels. SVG/canvas diagrams and images require their own audit.
export async function collectText(page) {
  return page.evaluate(() => {
    const { document, getComputedStyle, NodeFilter, innerWidth, innerHeight } = globalThis;
    const canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(color) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v);
    }
    function selector(el) {
      if (el === document.body) return 'body';
      const tag = el.tagName.toLowerCase();
      return `${selector(el.parentElement)} > ${tag}${el.id ? `#${globalThis.CSS.escape(el.id)}` : ''}${Array.from(el.classList).map((c) => `.${globalThis.CSS.escape(c)}`).join('')}:nth-child(${[...el.parentElement.children].indexOf(el) + 1})`;
    }
    function record(el, text, rectangles, suffix = '') {
      // aria-hidden can still be painted (e.g. KaTeX's visual HTML layer).
      if (!text.trim() || el.closest('script,style,option,noscript,.sr-only') || (el.closest('svg') && el.tagName !== 'text')) return null;
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible' || parseFloat(style.fontSize) <= 0 || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return null;
      let opacity = 1;
      let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
      for (let current = el; current; current = current.parentElement) {
        const css = getComputedStyle(current);
        opacity *= parseFloat(css.opacity);
        const box = current.getBoundingClientRect();
        if (/(hidden|auto|scroll|clip)/.test(css.overflowX)) {
          clip.left = Math.max(clip.left, box.left); clip.right = Math.min(clip.right, box.right);
        }
        if (/(hidden|auto|scroll|clip)/.test(css.overflowY)) {
          clip.top = Math.max(clip.top, box.top); clip.bottom = Math.min(clip.bottom, box.bottom);
        }
      }
      const rects = [];
      for (const rect of rectangles) {
        const x = Math.max(clip.left, rect.left), y = Math.max(clip.top, rect.top);
        const right = Math.min(clip.right, rect.right), bottom = Math.min(clip.bottom, rect.bottom);
        if (right - x < 2 || bottom - y < 2) continue;
        const hit = document.elementFromPoint((x + right) / 2, (y + bottom) / 2);
        if (hit && !(hit === el || el.contains(hit) || hit.contains(el))) continue;
        rects.push({ x, y, width: right - x, height: bottom - y });
      }
      if (!rects.length) return null;
      const size = parseFloat(style.fontSize) * (el.tagName === 'text' ? Math.abs(el.getScreenCTM()?.a || 1) : 1);
      const weight = parseInt(style.fontWeight, 10);
      const painted = el.tagName === 'text' ? style.fill : style.color;
      const color = rgba(painted);
      color[3] *= opacity;
      return {
        selector: selector(el) + suffix, class: el.getAttribute('class'), text: text.trim().slice(0, 140),
        color: painted, rgba: color, opacity, fontSize: size, fontWeight: weight,
        threshold: size >= 24 || (size >= 18.6667 && weight >= 700) ? 3 : 4.5,
        disabled: el.matches(':disabled') || Boolean(el.closest('[aria-disabled=true]')),
        lab: Boolean(el.closest('.page[class*="-lab-page"]')), rects,
      };
    }
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const row = record(node.parentElement, node.textContent, [...range.getClientRects()]);
      if (row) rows.push(row);
    }
    for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea,select')) {
      const box = el.getBoundingClientRect(), css = getComputedStyle(el);
      const text = el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent || '' : el.value || el.placeholder;
      const padding = Math.max(parseFloat(css.paddingLeft), 3);
      const row = record(el, text, [{ left: box.left + padding, top: box.top + 3, right: box.right - 18, bottom: box.bottom - 3 }], ' [value]');
      if (row) {
        if (el.tagName !== 'SELECT' && !el.value && el.placeholder) {
          const placeholder = getComputedStyle(el, '::placeholder');
          row.color = placeholder.color;
          row.rgba = rgba(placeholder.color);
          row.rgba[3] *= row.opacity * parseFloat(placeholder.opacity);
          row.selector = row.selector.replace(' [value]', '::placeholder');
        }
        rows.push(row);
      }
    }
    return rows;
  });
}

export async function measureText(page, records) {
  const hidden = await page.addStyleTag({ content: '* { -webkit-text-fill-color: transparent !important; text-shadow: none !important; } input::placeholder, textarea::placeholder { -webkit-text-fill-color: transparent !important; } svg text { fill: transparent !important; }' });
  let bytes;
  try { bytes = await page.screenshot({ animations: 'disabled', caret: 'hide' }); }
  finally { await hidden.evaluate((node) => node.remove()); }
  const result = await page.evaluate(async ({ image, records }) => {
    const { document, Image } = globalThis;
    const img = new Image();
    img.src = `data:image/png;base64,${image}`; await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    function luminance(color) {
      const channels = color.map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    }
    function ratio(foreground, background) {
      const fg = foreground.slice(0, 3).map((v, i) => v * foreground[3] + background[i] * (1 - foreground[3]));
      const a = luminance(fg), b = luminance(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }
    return records.map((record) => {
      const samples = [];
      for (const rect of record.rects) {
        // Sample inside the text box across the painted backdrop, avoiding borders.
        for (const fraction of [.2, .5, .8]) {
          const x = Math.max(0, Math.min(img.width - 1, Math.floor(rect.x + rect.width * fraction)));
          const y = Math.max(0, Math.min(img.height - 1, Math.floor(rect.y + rect.height * .5)));
          const offset = (y * img.width + x) * 4;
          const background = [...pixels.slice(offset, offset + 3)];
          samples.push({ x, y, background, ratio: ratio(record.rgba, background) });
        }
      }
      const worst = samples.reduce((a, b) => a.ratio < b.ratio ? a : b);
      return { ...record, ...worst, pass: worst.ratio >= record.threshold, samples };
    });
  }, { image: bytes.toString('base64'), records });
  return { records: result, background: bytes };
}

export async function auditText(page) {
  const scroll = await page.evaluate(() => {
    const { document, getComputedStyle, innerHeight } = globalThis;
    const main = document.querySelector('.main-area');
    const inside = main && /(auto|scroll)/.test(getComputedStyle(main).overflowY) && main.scrollHeight > main.clientHeight;
    const target = inside ? main : document.scrollingElement;
    return { main: Boolean(inside), max: target.scrollHeight - target.clientHeight, step: (inside ? main.clientHeight : innerHeight) * .8 };
  });
  const all = new Map();
  const backgrounds = [];
  const positions = new Set([0]);
  for (let y = scroll.step; y < scroll.max; y += scroll.step) positions.add(Math.floor(y));
  positions.add(Math.max(0, scroll.max));
  for (const y of positions) {
    await page.evaluate(({ y, main }) => {
      const target = main ? globalThis.document.querySelector('.main-area') : globalThis.document.scrollingElement;
      target.scrollTop = y;
    }, { y, main: scroll.main });
    await page.evaluate(() => new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
    const measured = await measureText(page, await collectText(page));
    backgrounds.push({ scroll: y, bytes: measured.background });
    for (const row of measured.records) {
      const key = `${row.selector}|${row.text}`;
      const old = all.get(key);
      if (!old || row.ratio < old.ratio) all.set(key, { ...row, scroll: y });
    }
  }
  await page.evaluate(() => {
    globalThis.document.scrollingElement.scrollTop = 0;
    const main = globalThis.document.querySelector('.main-area');
    if (main) main.scrollTop = 0;
  });
  return { records: [...all.values()], backgrounds, limitations: ['Canvas-rendered text and source-image text are outside the DOM/SVG text measurement; audit separately.', 'Background sampled at three interior points per text rectangle after suppressing text paint.'] };
}
