"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@mui/material";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

import { db } from "@/app/src/lib/firebase-client";
import type { Bulletin, Classe, Eleve, Matiere, Stat } from "@/app/src/interface/data";
import PrintSingleBulletinHost from "@/app/(app)/Bulletin/print/PrintSingleBulletinHost";

type StatType = "Stat1" | "Stat2" | "Stat3";
const isStatType = (v: string | null): v is StatType => v === "Stat1" || v === "Stat2" || v === "Stat3";

type Repartition = Stat["repartition"];
const isRepartition = (v: string | null): v is Repartition =>
  v === "Trimestre1" || v === "Trimestre2" || v === "Trimestre3" || v === "Semestre1" || v === "Semestre2";

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return NaN;
};

const fmt = (v: unknown) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
};

const formatAnneeScolaire = (startYear: number) => `${startYear}-${startYear + 1}`;

type StatistiqueDoc = Stat & {
  rang?: number;
  rang_label?: string;
  observations?: string;
};

type MoyenneGeneraleClasseDoc = { moyenneGenerale?: number };
type InscriptionYearDoc = { annee_scolaire?: number };

const getNoteValue = (s: StatistiqueDoc, type: "DEVOIR" | "COMPO") => {
  const notes = Array.isArray(s.notes) ? s.notes : [];
  const n = notes.find((x) => x.type_evaluation === type);
  return n?.valeur ?? null;
};

const getNbMatieres = (classe: Classe | null): number => {
  if (!classe) return 0;
  if (typeof classe.nombre_matiere === "number") return classe.nombre_matiere;
  if (Array.isArray(classe.id_matieres)) return classe.id_matieres.length;
  if (Array.isArray(classe.matieres)) return classe.matieres.length;
  return 0;
};

const isFinalRepartition = (r: Repartition | null): boolean => r === "Trimestre3" || r === "Semestre2";

export default function EleveStatPage() {
  const params = useParams<{ eleveId: string }>();
  const searchParams = useSearchParams();

  const eleveId = params.eleveId;

  const typeParam = searchParams.get("type");
  const statType: StatType | null = isStatType(typeParam) ? typeParam : null;

  const repartitionParamRaw = searchParams.get("repartition");
  const repartitionParam: Repartition | null = isRepartition(repartitionParamRaw) ? repartitionParamRaw : null;

  const anneeParamRaw = searchParams.get("annee");

  const [anneeScolaireActive, setAnneeScolaireActive] = useState<number | null>(null);
  const [anneeScolaireError, setAnneeScolaireError] = useState<string | null>(null);

  const anneeUrl = useMemo(() => {
    if (!anneeParamRaw) return null;
    const n = Number(anneeParamRaw);
    return Number.isFinite(n) ? n : null;
  }, [anneeParamRaw]);

  const [eleve, setEleve] = useState<Eleve | null>(null);
  const [classe, setClasse] = useState<Classe | null>(null);

  const [stats, setStats] = useState<StatistiqueDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [creatingBulletin, setCreatingBulletin] = useState(false);

  const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
  const [anneeSelected, setAnneeSelected] = useState<number | null>(null);

  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printPayload, setPrintPayload] = useState<null | {
    filename: string;
    bulletin: Bulletin;
    matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">>;
    effectifClasse: number;
    moyenneGeneraleClasse: number | null;
  }>(null);

  const nbMatieres = useMemo(() => getNbMatieres(classe), [classe]);
  const repartition: Repartition | null = repartitionParam;

  const loadAnneeScolaireActive = useCallback(async () => {
    try {
      setAnneeScolaireError(null);
      const res = await fetch("/api/settings/scolarite");
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `Erreur HTTP ${res.status}`);
      }
      const j = (await res.json()) as { ok: boolean; data: { annee_scolaire_active: number } };
      setAnneeScolaireActive(j.data.annee_scolaire_active);
    } catch (e) {
      console.error(e);
      setAnneeScolaireActive(null);
      setAnneeScolaireError(e instanceof Error ? e.message : "Erreur chargement année scolaire");
    }
  }, []);

  useEffect(() => {
    loadAnneeScolaireActive();
  }, [loadAnneeScolaireActive]);

  // ✅ IMPORTANT: années dispo = inscriptions + fallback stats + fallback bulletins
  useEffect(() => {
    const loadYearsForEleve = async () => {
      if (!eleveId) {
        setAnneesDisponibles([]);
        return;
      }

      const years: number[] = [];

      // A) inscriptions
      try {
        const snap = await getDocs(query(collection(db, "inscriptions"), where("id_eleve", "==", eleveId)));
        years.push(
          ...snap.docs
            .map((d) => (d.data() as InscriptionYearDoc).annee_scolaire)
            .filter((y): y is number => typeof y === "number" && Number.isFinite(y))
        );
      } catch (e) {
        console.error("loadYears(inscriptions) failed:", e);
      }

      // B) fallback: stats
      try {
        const snap = await getDocs(query(collection(db, "statistique"), where("id_eleve", "==", eleveId)));
        years.push(
          ...snap.docs
            .map((d) => (d.data() as { annee_scolaire?: unknown }).annee_scolaire)
            .filter((y): y is number => typeof y === "number" && Number.isFinite(y))
        );
      } catch (e) {
        console.error("loadYears(statistique) failed:", e);
      }

      // C) fallback: bulletins
      try {
        const snap = await getDocs(query(collection(db, "bulletins"), where("id_eleve", "==", eleveId)));
        years.push(
          ...snap.docs
            .map((d) => (d.data() as { annee_scolaire?: unknown }).annee_scolaire)
            .filter((y): y is number => typeof y === "number" && Number.isFinite(y))
        );
      } catch (e) {
        console.error("loadYears(bulletins) failed:", e);
      }

      const uniq = Array.from(new Set(years)).sort((a, b) => b - a);
      setAnneesDisponibles(uniq);
    };

    loadYearsForEleve().catch((e) => {
      console.error(e);
      setAnneesDisponibles([]);
    });
  }, [eleveId]);

  // ✅ init anneeSelected (URL > active > first available)
  useEffect(() => {
    if (anneeSelected !== null) return;

    if (anneeUrl !== null) {
      setAnneeSelected(anneeUrl);
      return;
    }

    if (anneeScolaireActive !== null) {
      setAnneeSelected(anneeScolaireActive);
      return;
    }

    if (anneesDisponibles.length) {
      setAnneeSelected(anneesDisponibles[0]);
    }
  }, [anneeSelected, anneeUrl, anneeScolaireActive, anneesDisponibles]);

  const annee = anneeSelected;

  // ✅ URL pour revenir sur la liste élèves (pas sur les classes)
  // /Bulletin sait lire classeId/annee via useSearchParams (patch fait côté BulletinPage)
  const retourBulletinHref = useMemo(() => {
    const classeId = eleve?.id_classe ?? null;
    if (!classeId) return "/Bulletin";
    const sp = new URLSearchParams();
    sp.set("classeId", classeId);
    if (annee) sp.set("annee", String(annee));
    return `/Bulletin?${sp.toString()}`;
  }, [eleve?.id_classe, annee]);

  const isReadOnlyYear = useMemo(() => {
    if (!annee || !anneeScolaireActive) return false;
    return annee !== anneeScolaireActive;
  }, [annee, anneeScolaireActive]);

  const filteredStats = useMemo(() => {
    const ok = stats.filter((s) => Number.isFinite(toNumber(s.moyenne_matiere)));
    ok.sort((a, b) => (a.matiere || "").localeCompare(b.matiere || "", "fr", { sensitivity: "base" }));
    return ok;
  }, [stats]);

  const ready = useMemo(() => {
    if (!nbMatieres) return false;
    return filteredStats.length === nbMatieres;
  }, [filteredStats.length, nbMatieres]);

  const fetchData = useCallback(async () => {
    try {
      if (!eleveId || !statType || !repartition) return;
      if (!annee) return;

      setLoading(true);
      setErrorState(null);

      const eleveRef = doc(db, "eleves", eleveId);
      const eleveSnap = await getDoc(eleveRef);
      if (!eleveSnap.exists()) throw new Error("Élève introuvable");

      const eleveData = { id: eleveSnap.id, ...(eleveSnap.data() as Omit<Eleve, "id">) };
      setEleve(eleveData);

      if (eleveData.id_classe) {
        const classeRef = doc(db, "classes", eleveData.id_classe);
        const classeSnap = await getDoc(classeRef);
        setClasse(
          classeSnap.exists()
            ? ({ id: classeSnap.id, ...(classeSnap.data() as Omit<Classe, "id">) } as Classe)
            : null
        );
      } else {
        setClasse(null);
      }

      const qStats = query(
        collection(db, "statistique"),
        where("id_eleve", "==", eleveId),
        where("libelle_stat", "==", statType),
        where("repartition", "==", repartition),
        where("annee_scolaire", "==", annee)
      );

      const snap = await getDocs(qStats);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StatistiqueDoc, "id">) }));
      setStats(rows);
    } catch (e) {
      console.error(e);
      setErrorState(e instanceof Error ? e.message : "Erreur de chargement");
      setStats([]);
      setEleve(null);
      setClasse(null);
    } finally {
      setLoading(false);
    }
  }, [eleveId, statType, repartition, annee]);

  const fetchBulletin = useCallback(async () => {
    if (!eleveId || !statType || !repartition || !annee) {
      setBulletin(null);
      return;
    }

    try {
      setLoadingBulletin(true);

      const qBulletin = query(
        collection(db, "bulletins"),
        where("id_eleve", "==", eleveId),
        where("libelle_stat", "==", statType),
        where("repartition", "==", repartition),
        where("annee_scolaire", "==", annee),
        limit(1)
      );

      const snap = await getDocs(qBulletin);
      if (snap.empty) {
        setBulletin(null);
        return;
      }

      const d = snap.docs[0];
      setBulletin({ id: d.id, ...(d.data() as Omit<Bulletin, "id">) });
    } catch (e) {
      console.error(e);
      setBulletin(null);
    } finally {
      setLoadingBulletin(false);
    }
  }, [eleveId, statType, repartition, annee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchBulletin();
  }, [fetchBulletin]);

  const handleCreateBulletin = async () => {
    if (!eleve || !statType || !repartition || !annee) return;

    if (isReadOnlyYear) {
      alert("Historique: création bulletin désactivée.");
      return;
    }

    try {
      setCreatingBulletin(true);
      setErrorState(null);

      const run = async (force: boolean) => {
        const res = await fetch("/api/Bulletin/create-one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_eleve: eleve.id,
            libelle_stat: statType,
            repartition,
            force,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Erreur création bulletin");
        return json as { alreadyExists?: boolean };
      };

      const first = await run(false);

      if (first.alreadyExists) {
        const ok = confirm(
          `Le bulletin ${statType} (${repartition}) existe déjà pour cet élève.\n` +
            `Si tu continues, il sera recréé (écrasé).\n\nContinuer ?`
        );
        if (!ok) return;
        await run(true);
      }

      await fetchBulletin();
      alert("✅ Bulletin créé.");
    } catch (e) {
      console.error(e);
      setErrorState(e instanceof Error ? e.message : "Erreur création bulletin");
    } finally {
      setCreatingBulletin(false);
    }
  };

  const handlePrintBulletin = useCallback(async () => {
    if (!eleve || !classe || !bulletin || !statType || !repartition || !annee) return;

    try {
      setPrinting(true);
      setErrorState(null);

     const inscSnap = await getDocs(
        query(
          collection(db, "inscriptions"),
          where("id_classe", "==", classe.id),
          where("annee_scolaire", "==", annee),
          where("statut", "==", "actif")
        )
      );
      const effectifClasse = inscSnap.size;

      const matiereIds = Array.isArray(classe.id_matieres) ? classe.id_matieres : [];
      const matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">> = {};

      for (const id of matiereIds) {
        const mSnap = await getDoc(doc(db, "matieres", id));
        if (!mSnap.exists) continue;
        const m = mSnap.data() as Matiere;

        matiereInfoById[id] = {
          coef: m.coef,
          qualificatif: m.qualificatif,
          libelle_matiere: m.libelle_matiere,
        };
      }

      const mgId = `${classe.id}_${statType}_${repartition}_${annee}`;
      const mgSnap = await getDoc(doc(db, "moyennes_generales_classes", mgId));
      const mgData = mgSnap.exists() ? (mgSnap.data() as MoyenneGeneraleClasseDoc) : null;
      const moyenneGeneraleClasse = typeof mgData?.moyenneGenerale === "number" ? mgData.moyenneGenerale : null;

      const filename = `Bulletin_${eleve.identite.nom_individu}_${eleve.identite.prenom_individu}_${statType}_${repartition}_${annee}.pdf`;

      setPrintPayload({
        filename,
        bulletin,
        matiereInfoById,
        effectifClasse,
        moyenneGeneraleClasse,
      });
      setPrintOpen(true);
    } catch (e) {
      console.error(e);
      setErrorState(e instanceof Error ? e.message : "Erreur impression bulletin");
    } finally {
      setPrinting(false);
    }
  }, [eleve, classe, bulletin, statType, repartition, annee]);

  if (!statType) {
    return (
      <div className="w-full p-6">
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded">
          Paramètre invalide. Utilise <b>?type=Stat1</b> ou <b>?type=Stat2</b> ou <b>?type=Stat3</b>.
        </div>
        <div className="mt-4">
          <Link href="/Bulletin">
            <Button variant="outlined">Retour</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!repartitionParam) {
    return (
      <div className="w-full p-6">
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded">
          Paramètre invalide. Utilise <b>?type={statType}</b> et{" "}
          <b>&amp;repartition=Trimestre1</b> (ou Trimestre2/Trimestre3/Semestre1/Semestre2).
        </div>
        <div className="mt-4">
          <Link href="/Bulletin">
            <Button variant="outlined">Retour</Button>
          </Link>
        </div>
      </div>
    );
  }

  const baseLabel = isFinalRepartition(repartition) ? "Moyenne annuelle" : "Moyenne trimestrielle";

  return (
    <div className="w-full p-6">
      {printOpen && printPayload && (
        <PrintSingleBulletinHost
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          filename={printPayload.filename}
          bulletin={printPayload.bulletin}
          matiereInfoById={printPayload.matiereInfoById}
          effectifClasse={printPayload.effectifClasse}
          moyenneGeneraleClasse={printPayload.moyenneGeneraleClasse}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {statType} ({repartition}) —{" "}
            {eleve ? `${eleve.identite.nom_individu} ${eleve.identite.prenom_individu}` : "Élève"}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-gray-500 dark:text-gray-400">
            {eleve ? (
              <>
                <span>
                  Classe: <span className="font-semibold">{eleve.classe}</span>
                </span>
                {nbMatieres ? <span className="text-sm">• {nbMatieres} matière(s)</span> : null}
                <span className="text-sm">• {repartition}</span>
              </>
            ) : null}
            <span className="text-sm">
              • Année active: <b>{anneeScolaireActive ? formatAnneeScolaire(anneeScolaireActive) : "—"}</b>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outlined" onClick={fetchData} disabled={loading}>
            Actualiser notes
          </Button>

          {/* ✅ Retour sur la liste élèves (pas sur les classes) */}
          <Link href={retourBulletinHref}>
            <Button variant="outlined">Retour Bulletin</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Année:</span>
          <select
            value={annee ?? ""}
            onChange={(e) => {
              const y = e.target.value ? Number(e.target.value) : null;
              setAnneeSelected(y);
            }}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
          >
            {(anneesDisponibles.length ? anneesDisponibles : anneeScolaireActive ? [anneeScolaireActive] : []).map((y) => (
              <option key={y} value={y}>
                {formatAnneeScolaire(y)}
              </option>
            ))}
          </select>
        </div>

        {isReadOnlyYear ? (
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Historique: lecture seule
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Année active
          </span>
        )}

        {anneeScolaireError ? (
          <span className="text-xs text-red-600 dark:text-red-300">{anneeScolaireError}</span>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Button
          variant="contained"
          className="!bg-blue-600 hover:!bg-blue-700"
          onClick={handleCreateBulletin}
          disabled={!ready || creatingBulletin || isReadOnlyYear}
          title={
            isReadOnlyYear
              ? "Historique: création désactivée"
              : ready
                ? "Créer le bulletin de cet élève"
                : nbMatieres
                  ? `Pas prêt: ${filteredStats.length}/${nbMatieres} matières ont une moyenne_matiere`
                  : "Nombre de matières inconnu"
          }
        >
          {creatingBulletin ? "Création..." : "Créer bulletin"}
        </Button>

        <Button
          variant="outlined"
          onClick={handlePrintBulletin}
          disabled={!bulletin || printing}
          title={!bulletin ? "Crée d'abord le bulletin" : "Télécharger le bulletin en PDF"}
        >
          {printing ? "Impression..." : "Imprimer bulletin"}
        </Button>

        <div className="text-sm text-gray-600 dark:text-gray-300 ml-2">
          {nbMatieres ? (
            <span className={ready ? "text-red-600 font-semibold" : ""}>
              Prêt: {filteredStats.length}/{nbMatieres}
            </span>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      {errorState && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">
          {errorState}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Chargement...</div>
      ) : (
        <>
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Matière</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Moy. classe</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Devoir</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Compo</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Moyenne</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Rang</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Coef</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Professeur</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Appréciation</th>
                </tr>
              </thead>

              <tbody>
                {filteredStats.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{s.matiere || "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{fmt(s.moyenne_classe)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{fmt(getNoteValue(s, "DEVOIR"))}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{fmt(getNoteValue(s, "COMPO"))}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-700 dark:text-blue-300">
                      {fmt(s.moyenne_matiere)}
                    </td>

                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {typeof s.rang === "number" ? `${s.rang}${s.rang_label ? ` (${s.rang_label})` : ""}` : "—"}
                    </td>

                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {typeof s.coef === "number" ? s.coef : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{s.enseignant || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{s.observations || "—"}</td>
                  </tr>
                ))}

                {filteredStats.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun {statType} ({repartition}) trouvé pour l’année{" "}
                      <b>{annee ? formatAnneeScolaire(annee) : "—"}</b>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Bulletin ({statType} • {repartition} • {annee ? formatAnneeScolaire(annee) : "—"})
              </h2>
              <Button variant="outlined" onClick={fetchBulletin} disabled={loadingBulletin || !annee}>
                {loadingBulletin ? "Chargement..." : "Actualiser bulletin"}
              </Button>
            </div>

            {!bulletin ? (
              <p className="mt-3 text-gray-500 dark:text-gray-400">Aucun bulletin créé pour le moment.</p>
            ) : (
              <div className="mt-3 text-sm text-gray-900 dark:text-white space-y-1">
                <div>
                  <b>{baseLabel}:</b>{" "}
                  {isFinalRepartition(repartition) ? fmt(bulletin.moyenne_annuelle) : fmt(bulletin.moyenne_trimestrielle)}
                </div>

                {isFinalRepartition(repartition) && (
                  <div>
                    <b>Moyenne trimestrielle:</b> {fmt(bulletin.moyenne_trimestrielle)}
                  </div>
                )}

                <div>
                  <b>Rang:</b> {typeof bulletin.rang === "number" ? bulletin.rang : "—"}
                </div>
                <div>
                  <b>Verdict:</b> {bulletin.verdict}
                </div>
                <div>
                  <b>Observation:</b> {bulletin.observation}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">id: {bulletin.id}</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}