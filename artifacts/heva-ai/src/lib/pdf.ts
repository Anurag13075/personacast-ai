// Client-only PDF text extraction using pdfjs-dist
export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const maxPages = Math.min(doc.numPages, 40);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return { text: out.trim(), pages: doc.numPages };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
