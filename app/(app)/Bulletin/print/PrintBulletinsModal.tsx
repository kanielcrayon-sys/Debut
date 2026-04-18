"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bulletin, Matiere } from "@/app/src/interface/data";
import { BulletinPage } from "./BulletinPage";
import { printDomPagesAsPdf } from "./printDomPagesAsPdf";

type Props = {
  open: boolean;
  onClose: () => void;

  classeLibelle: string;
  filename: string;

  bulletins: Bulletin[];

  matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">>;

  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
};

export default function PrintBulletinsModal({
  open,
  onClose,
  classeLibelle,
  filename,
  bulletins,
  matiereInfoById,
  effectifClasse,
  moyenneGeneraleClasse,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

  const sorted = useMemo(() => {
    return [...bulletins].sort((a, b) => {
      const sa = `${a.eleve_nom ?? ""} ${a.eleve_prenom ?? ""}`.toLowerCase();
      const sb = `${b.eleve_nom ?? ""} ${b.eleve_prenom ?? ""}`.toLowerCase();
      return sa.localeCompare(sb, "fr");
    });
  }, [bulletins]);

  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!containerRef.current) return;

      setPrinting(true);

      // important: laisser le DOM peindre
      await new Promise((r) => setTimeout(r, 300));

      const pages = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-bulletin-page='true']")
      );

      await printDomPagesAsPdf({
        pageElements: pages,
        filename,
      });

      setPrinting(false);
      onClose();
    };

    run().catch((e) => {
      console.error("❌ Erreur impression:", e);
      setPrinting(false);
      onClose();
    });
  }, [open, filename, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: "210mm",
      }}
    >
      <div ref={containerRef}>
        {sorted.map((b) => (
          <div
            key={b.id}
            data-bulletin-page="true"
            style={{
              pageBreakAfter: "always",
              breakAfter: "page",
            }}
          >
            <BulletinPage
              bulletin={b}
              matiereInfoById={matiereInfoById}
              effectifClasse={effectifClasse}
              moyenneGeneraleClasse={moyenneGeneraleClasse}
            />
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "Arial", fontSize: 12 }}>
        {printing ? `Impression des bulletins de ${classeLibelle}...` : ""}
      </div>
    </div>
  );
}