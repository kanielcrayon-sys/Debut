"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function printDomPagesAsPdf(params: {
  pageElements: HTMLElement[];
  filename: string;
}) {
  const { pageElements, filename } = params;

  const pdf = new jsPDF("p", "mm", "a4");

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);

    if (i < pageElements.length - 1) pdf.addPage();
  }

  pdf.save(filename);
}