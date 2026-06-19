"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Bulletin, Matiere } from "@/app/src/interface/data";
import { BulletinPage } from "./BulletinPage";
import { printDomPagesAsPdf } from "./printDomPagesAsPdf";

type Props = {
  open: boolean;
  onClose: () => void;
  filename: string;

  bulletin: Bulletin;
  matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere" | "enseignant">>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
  faibleMoyenneClasse: number | null;
  forteMoyenneClasse: number | null;
};

function sanitizeUnsupportedColors(root: HTMLElement) {
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const el of all) {
    const s = el.style;
    const unsafe = (v: string) => typeof v === "string" && /(lab\(|lch\(|oklch\()/i.test(v);

    if (unsafe(s.color)) s.color = "#111827";
    if (unsafe(s.backgroundColor)) s.backgroundColor = "#ffffff";
    if (unsafe(s.borderColor)) s.borderColor = "#d1d5db";
    if (unsafe((s as CSSStyleDeclaration).outlineColor)) (s as CSSStyleDeclaration).outlineColor = "#d1d5db";
    if (unsafe((s as CSSStyleDeclaration).textDecorationColor))
      (s as CSSStyleDeclaration).textDecorationColor = "#111827";

    if (!s.backgroundColor) s.backgroundColor = "#ffffff";
  }
}

export default function PrintSingleBulletinHost({
  open,
  onClose,
  filename,
  bulletin,
  matiereInfoById,
  effectifClasse,
  moyenneGeneraleClasse,
  faibleMoyenneClasse,
  forteMoyenneClasse,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!containerRef.current) return;

      setPrinting(true);
      await new Promise((r) => setTimeout(r, 250));

      const page = containerRef.current.querySelector<HTMLElement>("[data-bulletin-page='true']");
      if (!page) throw new Error("Page bulletin introuvable dans le DOM.");

      try {
        if ("fonts" in document) {
          await (document as Document & { fonts: FontFaceSet }).fonts.ready;
        }

        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        sanitizeUnsupportedColors(page);

        await printDomPagesAsPdf({ pageElements: [page], filename });
      } finally {
        setPrinting(false);
        onClose();
      }
    };

    run().catch((e) => {
      console.error("❌ Erreur impression bulletin:", e);
      setPrinting(false);
      onClose();
    });
  }, [open, filename, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "210mm",
        background: "#fff",
        zIndex: -1,
        opacity: 0.01,
        pointerEvents: "none",
      }}
    >
      <div ref={containerRef}>
        <div data-bulletin-page="true">
          <BulletinPage
            bulletin={bulletin}
            matiereInfoById={matiereInfoById}
            effectifClasse={effectifClasse}
            moyenneGeneraleClasse={moyenneGeneraleClasse}
            faibleMoyenneClasse={faibleMoyenneClasse}
            forteMoyenneClasse={forteMoyenneClasse}
          />
        </div>
      </div>

      <div style={{ fontFamily: "Arial", fontSize: 12 }}>{printing ? "Impression..." : ""}</div>
    </div>
  );
}