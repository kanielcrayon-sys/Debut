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
  matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere" | "enseignant">>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
  faibleMoyenneClasse: number | null;
  forteMoyenneClasse: number | null;
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
  faibleMoyenneClasse,
  forteMoyenneClasse,
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
    if (!open || !containerRef.current) return;

    setPrinting(true);

    // attendre 2 frames + petit délai pour s'assurer que toutes les pages sont rendues
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    );
    await new Promise((r) => setTimeout(r, 500));

    const pages = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>("[data-bulletin-page='true']")
    );

    if (!pages.length) {
      throw new Error("Aucune page bulletin trouvée pour impression.");
    }

    console.log("PAGES TO PRINT:", pages.length);

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
}, [open, filename, onClose, sorted.length]);

  if (!open) return null;

  return (
          <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "210mm",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
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
              faibleMoyenneClasse={faibleMoyenneClasse}
              forteMoyenneClasse={forteMoyenneClasse}
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