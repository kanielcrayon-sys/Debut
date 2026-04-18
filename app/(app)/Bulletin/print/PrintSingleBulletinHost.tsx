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
  matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
};

export default function PrintSingleBulletinHost({
  open,
  onClose,
  filename,
  bulletin,
  matiereInfoById,
  effectifClasse,
  moyenneGeneraleClasse,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!containerRef.current) return;

      setPrinting(true);
      await new Promise((r) => setTimeout(r, 200));

      const page = containerRef.current.querySelector<HTMLElement>("[data-bulletin-page='true']");
      if (!page) throw new Error("Page bulletin introuvable dans le DOM.");

      await printDomPagesAsPdf({ pageElements: [page], filename });

      setPrinting(false);
      onClose();
    };

    run().catch((e) => {
      console.error("❌ Erreur impression bulletin:", e);
      setPrinting(false);
      onClose();
    });
  }, [open, filename, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", left: "-10000px", top: 0, width: "210mm" }}>
      <div ref={containerRef}>
        <div data-bulletin-page="true">
          <BulletinPage
            bulletin={bulletin}
            matiereInfoById={matiereInfoById}
            effectifClasse={effectifClasse}
            moyenneGeneraleClasse={moyenneGeneraleClasse}
          />
        </div>
      </div>

      <div style={{ fontFamily: "Arial", fontSize: 12 }}>{printing ? "Impression..." : ""}</div>
    </div>
  );
}