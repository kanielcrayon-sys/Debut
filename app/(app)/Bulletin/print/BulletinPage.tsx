"use client";

import React, { forwardRef, useMemo } from "react";
import type { Bulletin, Matiere, Stat } from "@/app/src/interface/data";

type MatiereInfo = Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">;

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
}

const isFinalRepartition = (r: Bulletin["repartition"]): boolean => r === "Trimestre3" || r === "Semestre2";

export type BulletinPageProps = {
  bulletin: Bulletin;
  matiereInfoById: Record<string, MatiereInfo>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
};

export const BulletinPage = forwardRef<HTMLDivElement, BulletinPageProps>(function BulletinPage(
  { bulletin, matiereInfoById, effectifClasse, moyenneGeneraleClasse },
  ref
) {
  const { fondamentales, facultatives } = useMemo(() => {
    const fond: Stat[] = [];
    const fac: Stat[] = [];
    for (const st of bulletin.stats ?? []) {
      const info = matiereInfoById[st.id_matiere];
      if (info?.qualificatif === "Facultative") fac.push(st);
      else fond.push(st);
    }
    return { fondamentales: fond, facultatives: fac };
  }, [bulletin.stats, matiereInfoById]);

  const totalCoefFond = useMemo(
    () => fondamentales.reduce((acc, st) => acc + (matiereInfoById[st.id_matiere]?.coef ?? 1), 0),
    [fondamentales, matiereInfoById]
  );

  const totalNoteDefFond = useMemo(
    () => fondamentales.reduce((acc, st) => acc + (toNum(st.note_definitive) ?? 0), 0),
    [fondamentales]
  );

  const totalBonusFac = useMemo(() => {
    let bonus = 0;
    for (const st of facultatives) {
      const noteDef = toNum(st.note_definitive);
      if (noteDef === null) continue;
      if (noteDef <= 10) bonus += 0;
      else if (noteDef <= 14) bonus += noteDef - 10;
      else bonus += 5;
    }
    return Number(bonus.toFixed(2));
  }, [facultatives]);

  const moyenneAffichee = isFinalRepartition(bulletin.repartition) ? bulletin.moyenne_annuelle : bulletin.moyenne_trimestrielle;

  return (
    <div
      ref={ref}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "10mm",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#000",
        background: "#fff",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: "30%" }}>
          <div style={{ fontWeight: 700 }}>MINISTÈRE DES ENSEIGNEMENTS</div>
          <div>PRIMAIRE ET SECONDAIRE</div>
          <div style={{ marginTop: 6, fontSize: "10px" }}>ÉTABLISSEMENT: __________________</div>
        </div>

        <div style={{ width: "40%", textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "14px" }}>BULLETIN D&apos;ÉVALUATION</div>
          <div style={{ marginTop: 4 }}>
            Période: <b>{bulletin.repartition}</b> — <b>{bulletin.libelle_stat}</b>
          </div>
        </div>

        <div style={{ width: "30%", textAlign: "right" }}>
          <div>Année: {bulletin.annee}</div>
          <div>Date: {new Date(bulletin.date).toLocaleDateString("fr-FR")}</div>
        </div>
      </div>

      {/* IDENTITE */}
      <div style={{ marginTop: 10, border: "1px solid #000", padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div>
              Nom & Prénom:{" "}
              <b>
                {bulletin.eleve_nom} {bulletin.eleve_prenom}
              </b>
            </div>
            <div>
              Classe: <b>{bulletin.classe}</b>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              Moyenne: <b>{moyenneAffichee ?? ""}</b>
            </div>
            <div>
              Rang: <b>{bulletin.rang ?? ""}</b> / {effectifClasse}
            </div>
            <div>
              Moy Gen Classe: <b>{moyenneGeneraleClasse ?? ""}</b>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE FONDAMENTALES */}
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>MATIÈRES (Fondamentales)</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Matière", "Moy. Classe", "Moy.", "Coef", "Note Déf.", "Appréciation"].map((h) => (
                <th key={h} style={{ border: "1px solid #000", padding: 4, background: "#eee" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fondamentales.map((st) => {
              const info = matiereInfoById[st.id_matiere];
              return (
                <tr key={st.id_matiere}>
                  <td style={{ border: "1px solid #000", padding: 4 }}>{info?.libelle_matiere ?? st.id_matiere}</td>
                  <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{toNum(st.moyenne_classe) ?? ""}</td>
                  <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{toNum(st.moyenne_matiere) ?? ""}</td>
                  <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{info?.coef ?? st.coef ?? ""}</td>
                  <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{toNum(st.note_definitive) ?? ""}</td>
                  <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{st.observations ?? ""}</td>
                </tr>
              );
            })}

            <tr>
              <td style={{ border: "1px solid #000", padding: 4, fontWeight: 700 }}>TOTAL</td>
              <td style={{ border: "1px solid #000", padding: 4 }} />
              <td style={{ border: "1px solid #000", padding: 4 }} />
              <td style={{ border: "1px solid #000", padding: 4, textAlign: "center", fontWeight: 700 }}>{totalCoefFond}</td>
              <td style={{ border: "1px solid #000", padding: 4, textAlign: "center", fontWeight: 700 }}>{totalNoteDefFond.toFixed(2)}</td>
              <td style={{ border: "1px solid #000", padding: 4 }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLE FACULTATIVES (OPTIONNEL) */}
      {facultatives.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>MATIÈRES FACULTATIVES</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Matière", "Moy.", "Note Déf.", "Bonus"].map((h) => (
                  <th key={h} style={{ border: "1px solid #000", padding: 4, background: "#eee" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facultatives.map((st) => {
                const info = matiereInfoById[st.id_matiere];
                const noteDef = toNum(st.note_definitive);
                let bonus = 0;
                if (noteDef !== null) {
                  if (noteDef <= 10) bonus = 0;
                  else if (noteDef <= 14) bonus = noteDef - 10;
                  else bonus = 5;
                }
                return (
                  <tr key={st.id_matiere}>
                    <td style={{ border: "1px solid #000", padding: 4 }}>{info?.libelle_matiere ?? st.id_matiere}</td>
                    <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{toNum(st.moyenne_matiere) ?? ""}</td>
                    <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{noteDef ?? ""}</td>
                    <td style={{ border: "1px solid #000", padding: 4, textAlign: "center" }}>{bonus.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ border: "1px solid #000", padding: 4, fontWeight: 700 }}>TOTAL BONUS</td>
                <td style={{ border: "1px solid #000", padding: 4 }} />
                <td style={{ border: "1px solid #000", padding: 4 }} />
                <td style={{ border: "1px solid #000", padding: 4, textAlign: "center", fontWeight: 700 }}>
                  {totalBonusFac.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #000", padding: 8, minHeight: 80 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>OBSERVATIONS / DÉCISIONS</div>
          <div style={{ border: "1px dashed #666", minHeight: 50 }} />
        </div>
        <div style={{ border: "1px solid #000", padding: 8, minHeight: 80 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>SIGNATURES</div>
          <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between" }}>
            <div>Prof. titulaire</div>
            <div>Direction</div>
          </div>
        </div>
      </div>
    </div>
  );
});