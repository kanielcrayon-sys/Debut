"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function forceSafeColorsForCapture(root: HTMLElement): () => void {
  const touched: Array<{ el: HTMLElement; cssText: string }> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  const hasUnsupported = (v: string) => /(lab\(|lch\(|oklch\()/i.test(v);

  for (const el of nodes) {
    const cs = window.getComputedStyle(el);

    const color = cs.color || "";
    const bg = cs.backgroundColor || "";
    const borderTop = cs.borderTopColor || "";
    const borderRight = cs.borderRightColor || "";
    const borderBottom = cs.borderBottomColor || "";
    const borderLeft = cs.borderLeftColor || "";
    const outline = cs.outlineColor || "";
    const textDec = cs.textDecorationColor || "";

    let changed = false;
    const prev = el.style.cssText;

    if (hasUnsupported(color)) {
      el.style.color = "#111827";
      changed = true;
    }
    if (hasUnsupported(bg)) {
      el.style.backgroundColor = "#ffffff";
      changed = true;
    }
    if (
      hasUnsupported(borderTop) ||
      hasUnsupported(borderRight) ||
      hasUnsupported(borderBottom) ||
      hasUnsupported(borderLeft)
    ) {
      el.style.borderColor = "#d1d5db";
      changed = true;
    }
    if (hasUnsupported(outline)) {
      el.style.outlineColor = "#d1d5db";
      changed = true;
    }
    if (hasUnsupported(textDec)) {
      el.style.textDecorationColor = "#111827";
      changed = true;
    }

    if (changed) touched.push({ el, cssText: prev });
  }

  return () => {
    for (const t of touched) t.el.style.cssText = t.cssText;
  };
}

export async function printDomPagesAsPdf(params: {
  pageElements: HTMLElement[];
  filename: string;
}) {
  const { pageElements, filename } = params;
  if (!pageElements.length) throw new Error("Aucune page à imprimer.");

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const restore = forceSafeColorsForCapture(el);

    try {
      if ("fonts" in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }

      const rect = el.getBoundingClientRect();
      const captureWidth = Math.max(1, Math.ceil(rect.width));
      const captureHeight = Math.max(1, Math.ceil(rect.height));

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
        logging: false,
        foreignObjectRendering: false,

        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,

        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,

        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            * {
              transform: none !important;
              filter: none !important;
              transition: none !important;
              animation: none !important;
              text-shadow: none !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL("image/png");

      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = imgW / imgH;

      let renderW = pageWidth;
      let renderH = renderW / ratio;

      if (renderH > pageHeight) {
        renderH = pageHeight;
        renderW = renderH * ratio;
      }

      const xPos = (pageWidth - renderW) / 2;
      const yPos = (pageHeight - renderH) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", xPos, yPos, renderW, renderH);
    } finally {
      restore();
    }
  }

  pdf.save(filename);
}