"use client";
import React, { forwardRef, useMemo } from "react";
import type { Bulletin, Matiere, Stat, Note } from "@/app/src/interface/data";

type MatiereInfo = Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">;

function toNum(v: unknown): number | null {
  const n = typeof v === "number"
    ? v
    : typeof v === "string"
    ? Number(v.replace(",", "."))
    : NaN;
  return Number.isFinite(n) ? n : null;
}
function getNoteStat(noteArray: Note[] = [], key: string): number | null {
  if (!Array.isArray(noteArray)) return null;
  const found = noteArray.find(n =>
    (n.type_evaluation || "").toLowerCase().includes(key.toLowerCase())
  );
  return found ? toNum(found.valeur) : null;
}

const isFinalRepartition = (r: Bulletin["repartition"]): boolean =>
  r === "Trimestre3" || r === "Semestre2";

export type BulletinPageProps = {
  bulletin: Bulletin;
  matiereInfoById: Record<string, MatiereInfo>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
  faibleMoyenneClasse: number | null;
  forteMoyenneClasse: number | null;
};

export const BulletinPage = forwardRef<HTMLDivElement, BulletinPageProps>(function BulletinPage(
  { bulletin, matiereInfoById, effectifClasse, moyenneGeneraleClasse, faibleMoyenneClasse, forteMoyenneClasse },
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

  const totalCoefFac = useMemo(
    () => facultatives.reduce((acc, st) => acc + (matiereInfoById[st.id_matiere]?.coef ?? 1), 0),
    [facultatives, matiereInfoById]
  );

  const totalNoteDefFac = useMemo(
    () => facultatives.reduce((acc, st) => acc + (toNum(st.note_definitive) ?? 0), 0),
    [facultatives]
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

  const ETABLISSEMENT_NOM = "COMPLEXE SCOLAIRE PAUL VALERY";
  const moyenneAffichee = isFinalRepartition(bulletin.repartition)
    ? bulletin.moyenne_annuelle
    : bulletin.moyenne_trimestrielle;

  const anneeScolaire =
    bulletin.annee && !isNaN(Number(bulletin.annee))
      ? `${bulletin.annee}-${Number(bulletin.annee) + 1}`
      : bulletin.annee;

  const tableauMoyennes = [
    { label: "TRIM", value: String(bulletin.repartition ?? "--").toUpperCase() },
    { label: "MOYENNE", value: <b className="text-lg">{moyenneAffichee ?? ""}</b> },
    { label: "RANG", value: <>{<b>{bulletin.rang ?? ""}</b>} / {effectifClasse || ""}</> },
    { label: "EFFECT", value: effectifClasse || "" },
    { label: "FAIBLE MOY", value: faibleMoyenneClasse ?? "" },
    { label: "FORTE MOY", value: forteMoyenneClasse ?? "" },
    { label: "MOY GEN", value: moyenneGeneraleClasse ?? "" }
  ];

  // Shared cell classes
  const th = "border border-black p-1 bg-gray-100 text-xs";
  const td = "border border-black p-1 text-xs";
  const tdCenter = td + " text-center";

  return (
    <div
      ref={ref}
      className="bg-white text-black font-sans text-[11px] min-h-[297mm] w-[210mm] p-[10mm] box-border relative"
    >
      {/* EN-TETE */}
      <div className="flex justify-between items-start mb-2">
        <div className="w-[43%]">
          <div className="font-bold">RÉPUBLIQUE TOGOLAISE</div>
          <div>MINISTÈRE DES ENSEIGNEMENTS PRIMAIRE ET SECONDAIRE</div>
          <div className="mt-1 text-[10px]">
            ÉTABLISSEMENT : <b>{ETABLISSEMENT_NOM}</b>
          </div>
          <div className="text-[10px]">
            Année scolaire : <b>{anneeScolaire}</b>
          </div>
        </div>
        <div className="text-center w-[30%]">
          <div className="font-extrabold text-base uppercase mb-0.5">BULLETIN D&#39;ÉVALUATION</div>
          <div>
            Période : <b>{bulletin.repartition || "--"}</b>
          </div>
        </div>
        <div className="w-[24%] text-right text-[11px]">
          <div className="mb-1">Date : {new Date(bulletin.date).toLocaleDateString("fr-FR")}</div>
          <div>
            Élève : <b>{bulletin.eleve_nom} {bulletin.eleve_prenom}</b>
          </div>
          <div>
            Classe : <b>{bulletin.classe}</b>
          </div>
        </div>
      </div>

      {/* CORPS : Trois blocs/tables alignés */}
      <div className="flex gap-3 items-stretch mb-2.5">
        {/* TABLE FONDAMENTAL */}
        <div className="flex-2 w-0 min-w-0">
          <div className="font-extrabold mb-1 text-center">MATIÈRES FONDAMENTALES</div>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr>
                <th className={th}>MATIÈRE</th>
                <th className={th}>MOYENNE DE CLASSE</th>
                <th className={th}>NOTE DE DEVOIR</th>
                <th className={th}>NOTE DE COMPO</th>
                <th className={th}>MOYENNE</th>
                <th className={th}>COEF</th>
                <th className={th}>NOTE DÉFINITIVE</th>
                <th className={th}>PROFESSEUR(S)</th>
                <th className={th}>APPRÉCIATIONS</th>
                <th className={th}>SIGNATURE</th>
              </tr>
            </thead>
            <tbody>
              {fondamentales.map((st) => {
                const info = matiereInfoById[st.id_matiere];
                const noteDevoir = getNoteStat(st.notes, "devoir");
                const noteCompo = getNoteStat(st.notes, "compo");
                return (
                  <tr key={st.id_matiere}>
                    <td className={td}>{info?.libelle_matiere ?? st.id_matiere}</td>
                    <td className={tdCenter}>{toNum(st.moyenne_classe) ?? ""}</td>
                    <td className={tdCenter}>{noteDevoir ?? ""}</td>
                    <td className={tdCenter}>{noteCompo ?? ""}</td>
                    <td className={tdCenter}>{toNum(st.moyenne_matiere) ?? ""}</td>
                    <td className={tdCenter}>{info?.coef ?? st.coef ?? ""}</td>
                    <td className={tdCenter}>{toNum(st.note_definitive) ?? ""}</td>
                    <td className={tdCenter}>{st.enseignant ?? ""}</td>
                    <td className={tdCenter}>{st.observations ?? ""}</td>
                    <td className={td} />
                  </tr>
                );
              })}
              <tr>
                <td className={td + " font-bold"}>TOTAL</td>
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={tdCenter + " font-bold"}>{totalCoefFond}</td>
                <td className={tdCenter + " font-bold"}>{totalNoteDefFond.toFixed(2)}</td>
                <td className={td} />
                <td className={td} />
                <td className={td} />
              </tr>
            </tbody>
          </table>

          {/* TABLE FACULTATIVES */}
          {facultatives.length > 0 && (
            <>
              <div className="font-extrabold my-1 text-center">MATIÈRES FACULTATIVES</div>
              <table className="w-full border-collapse mb-2">
                <thead>
                  <tr>
                    <th className={th}>MATIÈRE</th>
                    <th className={th}>MOYENNE DE CLASSE</th>
                    <th className={th}>NOTE DE DEVOIR</th>
                    <th className={th}>NOTE DE COMPO</th>
                    <th className={th}>MOYENNE</th>
                    <th className={th}>COEF</th>
                    <th className={th}>NOTE DÉFINITIVE</th>
                    <th className={th}>PROFESSEUR(S)</th>
                    <th className={th}>APPRÉCIATIONS</th>
                    <th className={th}>SIGNATURE</th>
                  </tr>
                </thead>
                <tbody>
                  {facultatives.map((st) => {
                    const info = matiereInfoById[st.id_matiere];
                    const noteDevoir = getNoteStat(st.notes, "devoir");
                    const noteCompo = getNoteStat(st.notes, "compo");
                    return (
                      <tr key={st.id_matiere}>
                        <td className={td}>{info?.libelle_matiere ?? st.id_matiere}</td>
                        <td className={tdCenter}>{toNum(st.moyenne_classe) ?? ""}</td>
                        <td className={tdCenter}>{noteDevoir ?? ""}</td>
                        <td className={tdCenter}>{noteCompo ?? ""}</td>
                        <td className={tdCenter}>{toNum(st.moyenne_matiere) ?? ""}</td>
                        <td className={tdCenter}>{info?.coef ?? st.coef ?? ""}</td>
                        <td className={tdCenter}>{toNum(st.note_definitive) ?? ""}</td>
                        <td className={tdCenter}>{st.enseignant ?? ""}</td>
                        <td className={tdCenter}>{st.observations ?? ""}</td>
                        <td className={td} />
                      </tr>
                    );
                  })}
                  <tr>
                    <td className={td + " font-bold"}>TOTAL</td>
                    <td className={td} />
                    <td className={td} />
                    <td className={td} />
                    <td className={td} />
                    <td className={tdCenter + " font-bold"}>{totalCoefFac}</td>
                    <td className={tdCenter + " font-bold"}>{totalNoteDefFac.toFixed(2)}</td>
                    <td className={td} />
                    <td className={td} />
                    <td className={td} />
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Tableau des moyennes à droite */}
        <div className="flex-1 border border-gray-800 bg-gray-50 text-xs max-w-[150px] min-w-[110px] h-fit">
          <table className="w-full border-collapse">
            <tbody>
              {tableauMoyennes.map((moy, idx) => (
                <tr key={moy.label}>
                  <td className={"border border-black p-1 font-bold w-[60px]" + (idx === 0 ? " bg-gray-100" : "")}>
                    {moy.label}
                  </td>
                  <td className={"border border-black p-1 text-center" + (idx === 0 ? " bg-gray-100" : "")}>
                    {moy.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex gap-3 mt-4">
        <div className="flex-2 border border-black p-2 min-h-[90px]">
          <div className="font-extrabold mb-1.5">OBSERVATIONS / DÉCISIONS DU CONSEIL DES PROFESSEURS</div>
          <div className="border-dashed border border-gray-500 min-h-[60px]" />
          <div className="flex gap-4 mt-1 text-[11px]">
            <div>Retards: ________ </div>
            <div>Absences: ________ </div>
            <div>Blâme: __________ </div>
          </div>
          <div className="flex gap-4 mt-0.5 text-[11px]">
            <div>Encouragement: __________ </div>
            <div>Tableau d&apos;honneur: __________ </div>
          </div>
        </div>
        <div className="flex-1 border border-black p-2 min-h-[90px]">
          <div className="font-extrabold mb-1.5">SIGNATURES</div>
          <div className="h-[44px] border-dashed border border-gray-500 mb-1.5"></div>
          <div className="flex justify-between text-xs">
            <div>Professeur titulaire</div>
            <div>Le Directeur</div>
          </div>
        </div>
      </div>
    </div>
  );
});