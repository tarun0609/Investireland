/**
 * Extracts text lines from a PDF in the browser using pdf.js (Apache-2.0). The file never leaves the device,
 * and the password is only passed to pdf.js to decrypt the file in memory.
 */

type PdfJs = typeof import('pdfjs-dist');

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 300;

export class PdfPasswordError extends Error {
  constructor(public readonly reason: 'needed' | 'incorrect') {
    super(reason === 'needed' ? 'This PDF is password protected.' : 'That password is not correct.');
  }
}

export class PdfReadError extends Error {}

export interface PositionedText {
  str: string;
  x: number;
  y: number;
}

/** Groups positioned text into lines (top to bottom, left to right). Items within `tolerance` of a line's baseline join it. */
export function groupIntoLines(items: PositionedText[], tolerance = 2.5): string[] {
  const sorted = items.filter((i) => i.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; parts: PositionedText[] }[] = [];
  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (line) line.parts.push(item);
    else lines.push({ y: item.y, parts: [item] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((l) =>
      l.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

let browserPdfJs: Promise<PdfJs> | null = null;

/** Loads pdf.js and its worker on demand so the main bundle stays small. */
function loadBrowserPdfJs(): Promise<PdfJs> {
  browserPdfJs ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return browserPdfJs;
}

export async function extractPdfLines(data: ArrayBuffer | Uint8Array, password?: string, pdfjs?: PdfJs): Promise<string[]> {
  const lib = pdfjs ?? (await loadBrowserPdfJs());
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength > MAX_PDF_BYTES) throw new PdfReadError('This PDF is too large. The limit is 10 MB.');

  const task = lib.getDocument({ data: bytes, password: password || undefined, verbosity: lib.VerbosityLevel.ERRORS });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch (err) {
    void task.destroy();
    if (err instanceof lib.PasswordException || (err as { name?: string })?.name === 'PasswordException') {
      const code = (err as { code?: number }).code;
      throw new PdfPasswordError(code === lib.PasswordResponses.INCORRECT_PASSWORD ? 'incorrect' : 'needed');
    }
    throw new PdfReadError('This file couldn\u2019t be opened as a PDF.');
  }

  try {
    if (doc.numPages > MAX_PDF_PAGES) throw new PdfReadError(`This PDF has more than ${MAX_PDF_PAGES} pages.`);
    const lines: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: PositionedText[] = [];
      for (const item of content.items) {
        if ('str' in item && item.str) items.push({ str: item.str, x: item.transform[4], y: item.transform[5] });
      }
      lines.push(...groupIntoLines(items));
      page.cleanup();
    }
    return lines;
  } finally {
    await task.destroy();
  }
}
