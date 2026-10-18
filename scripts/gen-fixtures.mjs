// Generates synthetic acceptance fixtures into fixtures/ (git-ignored):
//   book-labels.pdf  312 pages, /PageLabels i..iv + 1.., outline, internal/external/blocked links
//   scan-500.pdf     500 image-only pages, like a scanned book (performance budgets)
// Usage: node scripts/gen-fixtures.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'fixtures');
mkdirSync(out, { recursive: true });

/** Minimal PDF writer: objects are strings or { dict, stream } with Buffer streams. */
function buildPdf(objects) {
  const chunks = [Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(offset);
    let body;
    if (typeof obj === 'string') {
      body = Buffer.from(`${i + 1} 0 obj\n${obj}\nendobj\n`, 'latin1');
    } else {
      const head = Buffer.from(`${i + 1} 0 obj\n<< ${obj.dict} /Length ${obj.stream.length} >>\nstream\n`, 'latin1');
      body = Buffer.concat([head, obj.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    }
    chunks.push(body);
    offset += body.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks);
}

function book() {
  const pages = 312;
  const front = 4; // i..iv
  // 1 catalog, 2 pages, 3 font, 4 outlines, 5.. outline items, then page + content pairs.
  const outlineItems = [
    { title: 'Preface', page: 0 },
    { title: 'Chapter 1. Links', page: front },
    { title: 'Chapter 2. Middle', page: 150 },
    { title: 'Appendix', page: pages - 1 },
  ];
  const firstItem = 5;
  const firstPage = firstItem + outlineItems.length;
  const pageObj = (i) => firstPage + i * 2;
  const label = (i) => (i < front ? ['i', 'ii', 'iii', 'iv'][i] : String(i - front + 1));

  const objects = [];
  objects.push(
    `<< /Type /Catalog /Pages 2 0 R /Outlines 4 0 R /PageMode /UseOutlines /PageLabels << /Nums [0 << /S /r >> ${front} << /S /D >>] >> >>`,
  );
  objects.push(`<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push(`<< /Type /Outlines /First ${firstItem} 0 R /Last ${firstItem + outlineItems.length - 1} 0 R /Count ${outlineItems.length} >>`);
  outlineItems.forEach((item, k) => {
    const prev = k > 0 ? `/Prev ${firstItem + k - 1} 0 R` : '';
    const next = k < outlineItems.length - 1 ? `/Next ${firstItem + k + 1} 0 R` : '';
    objects.push(`<< /Title (${item.title}) /Parent 4 0 R ${prev} ${next} /Dest [${pageObj(item.page)} 0 R /Fit] >>`);
  });

  const linkRect = (y) => `[72 ${y} 400 ${y + 18}]`;
  for (let i = 0; i < pages; i++) {
    const lines = [`BT /F1 28 Tf 72 720 Td (Page label ${label(i)}  -  page ${i + 1} of ${pages}) Tj ET`];
    let annots = '';
    if (i === front) {
      lines.push(
        'BT /F1 14 Tf 72 640 Td (Internal link: go to page 200 [label 196]) Tj ET',
        'BT /F1 14 Tf 72 600 Td (External link: https://example.com) Tj ET',
        'BT /F1 14 Tf 72 560 Td (Blocked: javascript:alert\\(1\\)) Tj ET',
        'BT /F1 14 Tf 72 520 Td (Blocked: file:///C:/Windows/notepad.exe) Tj ET',
        'BT /F1 14 Tf 72 480 Td (Blocked: /Launch notepad.exe) Tj ET',
        'BT /F1 14 Tf 72 440 Td (Search me: needle Needle needles) Tj ET',
      );
      annots = `/Annots [
        << /Type /Annot /Subtype /Link /Rect ${linkRect(636)} /Border [0 0 0] /Dest [${pageObj(199)} 0 R /XYZ 0 400 null] >>
        << /Type /Annot /Subtype /Link /Rect ${linkRect(596)} /Border [0 0 0] /A << /S /URI /URI (https://example.com) >> >>
        << /Type /Annot /Subtype /Link /Rect ${linkRect(556)} /Border [0 0 0] /A << /S /URI /URI (javascript:alert\\(1\\)) >> >>
        << /Type /Annot /Subtype /Link /Rect ${linkRect(516)} /Border [0 0 0] /A << /S /URI /URI (file:///C:/Windows/notepad.exe) >> >>
        << /Type /Annot /Subtype /Link /Rect ${linkRect(476)} /Border [0 0 0] /A << /S /Launch /F (notepad.exe) >> >>
      ]`;
    } else if (i % 37 === 0) {
      lines.push('BT /F1 14 Tf 72 640 Td (Another needle on this page.) Tj ET');
    }
    if (i === 199) lines.push('BT /F1 18 Tf 72 400 Td (>>> Link target lands here \\(y = 400\\) <<<) Tj ET');
    const content = Buffer.from(lines.join('\n'), 'latin1');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageObj(i) + 1} 0 R ${annots} >>`);
    objects.push({ dict: '', stream: content });
  }
  return buildPdf(objects);
}

function scan() {
  const pages = 500;
  const w = 1240;
  const h = 1754; // A4 at 150 dpi, 8-bit gray
  // One shared-looking but per-page varied image: white paper, dark "text lines", light noise.
  let seed = 1;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const kids = [];
  for (let p = 0; p < pages; p++) {
    const raw = Buffer.alloc(w * h, 245);
    for (let line = 0; line < 38; line++) {
      const y0 = 140 + line * 40;
      let x = 120;
      while (x < w - 140) {
        const word = 20 + Math.floor(rand() * 90);
        for (let y = y0; y < y0 + 16; y++) raw.fill(40 + Math.floor(rand() * 30), y * w + x, y * w + Math.min(x + word, w - 120));
        x += word + 12;
      }
    }
    for (let k = 0; k < 4000; k++) raw[Math.floor(rand() * raw.length)] = 200 + Math.floor(rand() * 40);
    const pageId = objects.length + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${pageId + 1} 0 R >> >> /Contents ${pageId + 2} 0 R >>`);
    objects.push({ dict: `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, stream: deflateSync(raw, { level: 6 }) });
    objects.push({ dict: '', stream: Buffer.from('q 595 0 0 842 0 0 cm /Im0 Do Q', 'latin1') });
  }
  objects[1] = `<< /Type /Pages /Count ${pages} /Kids [${kids.join(' ')}] >>`;
  return buildPdf(objects);
}

writeFileSync(join(out, 'book-labels.pdf'), book());
console.log('fixtures/book-labels.pdf');
writeFileSync(join(out, 'scan-500.pdf'), scan());
console.log('fixtures/scan-500.pdf');
