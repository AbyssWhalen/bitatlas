const cjkStandardFontPdfBase64 = [
  'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwK',
  'L0YxIDIgMCBSIC9GMiAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2Rpbmcg',
  'L1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2Jq',
  'Cjw8Ci9CYXNlRm9udCAvU1RTb25nLUxpZ2h0IC9EZXNjZW5kYW50Rm9udHMgWyA8PAovQmFzZUZvbnQgL1NUU29uZy1MaWdo',
  'dCAvQ0lEU3lzdGVtSW5mbyA8PAovT3JkZXJpbmcgKEdCMSkgL1JlZ2lzdHJ5IChBZG9iZSkgL1N1cHBsZW1lbnQgMAo+PiAv',
  'RFcgMTAwMCAvRm9udERlc2NyaXB0b3IgPDwKL0FzY2VudCA3NTIgL0NhcEhlaWdodCA3MzcgL0Rlc2NlbnQgLTI3MSAvRmxh',
  'Z3MgNiAvRm9udEJCb3ggWyAtMjUgLTI1NCAxMDAwIDg4MCBdIC9Gb250TmFtZSAvU1RTb25nU3RkLUxpZ2h0IAogIC9JdGFs',
  'aWNBbmdsZSAwIC9MZWFkaW5nIDE0OCAvTWF4V2lkdGggMTAwMCAvTWlzc2luZ1dpZHRoIDUwMCAvU3RlbUggOTEgL1N0ZW1W',
  'IDU4IAogIC9UeXBlIC9Gb250RGVzY3JpcHRvciAvWEhlaWdodCA1NTMKPj4gL1N1YnR5cGUgL0NJREZvbnRUeXBlMCAvVHlw',
  'ZSAvRm9udCAKICAvVyBbIDEgWyAyMDcgMjcwIDM0MiA0NjcgNDYyIDc5NyA3MTAgMjM5IDM3NCBdIDEwIFsgMzc0IDQyMyA2',
  'MDUgMjM4IDM3NSAyMzggMzM0IDQ2MiBdIDE4IDI2IDQ2MiAyNyAyOCAyMzggCiAgMjkgMzEgNjA1IDMyIFsgMzQ0IDc0OCA2',
  'ODQgNTYwIDY5NSA3MzkgNTYzIDUxMSA3MjkgNzkzIAogIDMxOCAzMTIgNjY2IDUyNiA4OTYgNzU4IDc3MiA1NDQgNzcyIDYy',
  'OCAKICA0NjUgNjA3IDc1MyA3MTEgOTcyIDY0NyA2MjAgNjA3IDM3NCAzMzMgCiAgMzc0IDYwNiA1MDAgMjM5IDQxNyA1MDMg',
  'NDI3IDUyOSA0MTUgMjY0IAogIDQ0NCA1MTggMjQxIDIzMCA0OTUgMjI4IDc5MyA1MjcgNTI0IF0gODEgWyA1MjQgNTA0IDMz',
  'OCAzMzYgMjc3IDUxNyA0NTAgNjUyIDQ2NiA0NTIgCiAgNDA3IDM3MCAyNTggMzcwIDYwNSBdIF0KPj4gXSAvRW5jb2Rpbmcg',
  'L1VuaUdCLVVDUzItSCAvTmFtZSAvRjIgL1N1YnR5cGUgL1R5cGUwIC9UeXBlIC9Gb250Cj4+CmVuZG9iago0IDAgb2JqCjw8',
  'Ci9Db250ZW50cyA4IDAgUiAvTWVkaWFCb3ggWyAwIDAgNTk1IDg0MiBdIC9QYXJlbnQgNyAwIFIgL1Jlc291cmNlcyA8PAov',
  'Rm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAg',
  'L1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNSAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1Bh',
  'Z2VzIDcgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0',
  'aW9uRGF0ZSAoRDoyMDI2MDgwNzIwNDUxMCswOCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9k',
  'RGF0ZSAoRDoyMDI2MDgwNzIwNDUxMCswOCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVu',
  'c291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+',
  'CmVuZG9iago3IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgNCAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjggMCBv',
  'YmoKPDwKL0xlbmd0aCA0ODgKPj4Kc3RyZWFtCjEgMCAwIDEgMCAwIGNtICBCVCAvRjEgMTIgVGYgMTQuNCBUTCBFVApCVCAv',
  'RjIgMjAgVGYgMjQgVEwgRVQKQlQgMSAwIDAgMSA3MiA3NjAgVG0gL0YyIDIwIFRmIDI0IFRMIChcMDAwNFwwMDAwXDAwMDhc',
  'MDAwT1wwMDBTXDAwMCBOLWVcMjA3XDAwMCBcMDAwUFwwMDBEXDAwMEZcMDAwIHlcMjczflwyNzduMmdcMzIzKSBUaiBUKiBF',
  'VApCVCAvRjIgMTMgVGYgMTUuNiBUTCBFVApCVCAxIDAgMCAxIDcyIDcyMCBUbSAvRjIgMTMgVGYgMTUuNiBUTCAoXDIxM1wz',
  'NjdsQlJcMDA2XDIzMHUwXDAwMVcwV0BcMjE3bGNiMFwwMDFbUFwxNzdRUlwwMjJSXDAwNjBcMDAxZ1wwMDBcMjI1XDE3N1JN',
  'XDE3N1wwMDBTOVwyMjFNKSBUaiBUKiBFVApCVCAvRjEgMTEgVGYgMTMuMiBUTCBFVApCVCAxIDAgMCAxIDcyIDY4MCBUbSAo',
  'Tm9uLWVtYmVkZGVkIENJRCBmb250IHRlc3QgLyBTVFNvbmctTGlnaHQgLyBwYWdlIDEpIFRqIFQqIEVUCm4gNzAgNjQwIDQz',
  'MCA5MCByZSBTCiAKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAw',
  'MDAgbiAKMDAwMDAwMDEwMiAwMDAwMCBuIAowMDAwMDAwMjA5IDAwMDAwIG4gCjAwMDAwMDExNDIgMDAwMDAgbiAKMDAwMDAw',
  'MTMzNSAwMDAwMCBuIAowMDAwMDAxNDAzIDAwMDAwIG4gCjAwMDAwMDE2NjQgMDAwMDAgbiAKMDAwMDAwMTcyMyAwMDAwMCBu',
  'IAp0cmFpbGVyCjw8Ci9JRCAKWzwzNGJjNDE4ZTMwMGNjZmMwYmJkNDAzM2FjNjg1NGM2Nj48MzRiYzQxOGUzMDBjY2ZjMGJi',
  'ZDQwMzNhYzY4NTRjNjY+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJj',
  'ZSkKCi9JbmZvIDYgMCBSCi9Sb290IDUgMCBSCi9TaXplIDkKPj4Kc3RhcnR4cmVmCjIyNjEKJSVFT0YK',
].join('');

export function createCjkStandardFontPdf(): Buffer {
  return Buffer.from(cjkStandardFontPdfBase64, 'base64');
}

export function createTwoPagePdf(): Buffer {
  const pageOne = 'BT /F1 28 Tf 72 720 Td (Yanjing 408 Page One) Tj ET';
  const pageTwo = 'BT /F1 28 Tf 72 720 Td (Yanjing 408 Page Two) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(pageOne)} >>\nstream\n${pageOne}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    `<< /Length ${Buffer.byteLength(pageTwo)} >>\nstream\n${pageTwo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let source = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(source));
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n`;
  source += '0000000000 65535 f \n';
  source += offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(source);
}
