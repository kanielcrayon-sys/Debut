"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@mui/material";
import { MdArrowBack, MdNavigateBefore, MdNavigateNext, MdOpenInNew } from "react-icons/md";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "@/app/src/lib/firebase-client";
import type { Bulletin, Classe, Eleve, Matiere, Stat } from "@/app/src/interface/data";
import { useClasses } from "@/app/src/context/classeContext";
import PrintBulletinsModal from "./print/PrintBulletinsModal";
import { useRoleGuard } from "@/app/src/hooks/useRoleGuard";

type StatType = "Stat1" | "Stat2" | "Stat3";
type PeriodMode = "trimestre" | "semestre";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

type PaginationState = {
  totalCount: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  cursors: { first: string | null; last: string | null };
};

type ReadyCountsMap = Record<string, number>;
type ReadyByStat = Record<StatType, ReadyCountsMap>;

type PrintData = {
  bulletins: Bulletin[];
  matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">>;
  effectifClasse: number;
  moyenneGeneraleClasse: number | null;
  filename: string;
  classeLibelle: string;
};

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return NaN;
};

const isFiniteNumber = (v: unknown) => Number.isFinite(toNumber(v));

const getNbMatieres = (classe: Classe | null): number => {
  if (!classe) return 0;
  if (typeof classe.nombre_matiere === "number") return classe.nombre_matiere;
  if (Array.isArray(classe.id_matieres)) return classe.id_matieres.length;
  if (Array.isArray(classe.matieres)) return classe.matieres.length;
  return 0;
};

const formatAnneeScolaire = (startYear: number) => `${startYear}-${startYear + 1}`;

const getRepartitionForStatType = (statType: StatType, mode: PeriodMode): Repartition => {
  if (mode === "semestre") {
    if (statType === "Stat1") return "Semestre1";
    if (statType === "Stat2") return "Semestre2";
    return "Semestre2";
  }

  if (statType === "Stat1") return "Trimestre1";
  if (statType === "Stat2") return "Trimestre2";
  return "Trimestre3";
};

type MoyenneGeneraleClasseDoc = { moyenneGenerale?: number };

// ✅ type minimal pour lire inscriptions sans any
type InscriptionYearDoc = { annee_scolaire?: number };

export default function BulletinPage() {
  const { loading } = useRoleGuard(["admin"]);
  
  const { classes } = useClasses();
  const searchParams = useSearchParams();

  // ✅ URL -> ouvre la bonne classe + année (pour "Retour Bulletin" depuis /stat)
  const classeIdUrl = useMemo(() => searchParams.get("classeId"), [searchParams]);
  const anneeUrl = useMemo(() => {
    const raw = searchParams.get("annee");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const [periodMode] = useState<PeriodMode>("trimestre");

  // ✅ init from URL: évite le flash "classes" avant l'ouverture auto
  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(() => classeIdUrl ?? null);

  const [currentPage, setCurrentPage] = useState(1);

  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<Eleve[]>([]);

  const [elevesList, setElevesList] = useState<Eleve[]>([]);
  const [loadingEleves, setLoadingEleves] = useState(false);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [lastCursor, setLastCursor] = useState<string | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    totalCount: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false,
    cursors: { first: null, last: null },
  });

  const [classesStats, setClassesStats] = useState<{ [key: string]: { total: number; boys: number; girls: number } }>(
    {}
  );

  const [readyByStat, setReadyByStat] = useState<ReadyByStat>({
    Stat1: {},
    Stat2: {},
    Stat3: {},
  });
  const [loadingReady, setLoadingReady] = useState(false);

  const [creatingForClass, setCreatingForClass] = useState<StatType | null>(null);

  const [printingForClass, setPrintingForClass] = useState<StatType | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);

  // ✅ année scolaire active + années dispo (inscriptions + fallback stats/bulletins)
  const [anneeScolaireActive, setAnneeScolaireActive] = useState<number | null>(null);
  const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
  const [anneeSelected, setAnneeSelected] = useState<number | null>(() => anneeUrl ?? null);
  const [anneeScolariteError, setAnneeScolariteError] = useState<string | null>(null);

  const activeClasses = useMemo(
    () => classes.filter((c) => (c.statut_classe ?? "actif") === "actif"),
    [classes]
  );

  const selectedClasse = useMemo(() => classes.find((c) => c.id === selectedClasseId) ?? null, [classes, selectedClasseId]);

  const nbMatieres = useMemo(() => getNbMatieres(selectedClasse), [selectedClasse]);

  const normalizeSearch = (s: string) => s.trim().toUpperCase();

  // ✅ Sync l'URL avec la classe/année courantes (sans reload)
  const syncUrlToClasse = useCallback((classeId: string | null, annee: number | null) => {
    const sp = new URLSearchParams(window.location.search);

    if (classeId) sp.set("classeId", classeId);
    else sp.delete("classeId");

    if (annee) sp.set("annee", String(annee));
    else sp.delete("annee");

    const qs = sp.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

    window.history.replaceState(null, "", next);
  }, []);

  // ✅ charger année active
  useEffect(() => {
    const load = async () => {
      try {
        setAnneeScolariteError(null);
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
        setAnneeScolariteError(e instanceof Error ? e.message : "Erreur chargement année scolaire");
      }
    };
    load();
  }, []);

  // ✅ déduire les années disponibles pour la classe sélectionnée
  //    inscriptions (si exist) + fallback stats + fallback bulletins
  useEffect(() => {
    const loadYearsForClasse = async () => {
      if (!selectedClasseId) {
        setAnneesDisponibles([]);
        setAnneeSelected(null);
        return;
      }

      const years: number[] = [];

      // A) inscriptions
      try {
        const snap = await getDocs(query(collection(db, "inscriptions"), where("id_classe", "==", selectedClasseId)));
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
        const snap = await getDocs(query(collection(db, "statistique"), where("id_classe", "==", selectedClasseId)));
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
        const snap = await getDocs(query(collection(db, "bulletins"), where("id_classe", "==", selectedClasseId)));
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

      // default: année active si présente dans la liste, sinon la plus récente dispo, sinon l’année active
      if (!anneeSelected) {
        if (anneeScolaireActive && uniq.includes(anneeScolaireActive)) setAnneeSelected(anneeScolaireActive);
        else setAnneeSelected(uniq[0] ?? anneeScolaireActive ?? null);
      }
    };

    loadYearsForClasse().catch((e) => {
      console.error(e);
      setAnneesDisponibles([]);
      if (!anneeSelected) setAnneeSelected(anneeScolaireActive ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasseId, anneeScolaireActive]);

  const loadClassEleves = async (classeId: string, after: string | null = null, search: string = "") => {
    try {
      setLoadingEleves(true);
      setErrorState(null);

      const url = new URL(`/api/eleves/classe/${classeId}`, window.location.origin);
      url.searchParams.set("limit", "10");
      if (after) url.searchParams.set("after", after);

      const normalizedSearch = normalizeSearch(search);
      if (normalizedSearch) url.searchParams.set("search", normalizedSearch);
        const annee = anneeSelected ?? anneeScolaireActive;
        if (typeof annee === "number") {
          url.searchParams.set("annee_scolaire", annee.toString());
        }
      const response = await fetch(url.toString());
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Erreur API ${response.status}: ${text}`);
      }

      const data = await response.json();

      setElevesList(data.data || []);

   const cursors = data.pagination?.cursors || { first: null, last: null };
      setPagination({
        totalCount: data.pagination?.totalCount ?? 0,
        limit: data.pagination?.limit ?? 10,
        hasNext: Boolean(data.pagination?.hasNext),
        hasPrev: Boolean(data.pagination?.hasPrev),
        cursors: { first: cursors.first ?? null, last: cursors.last ?? null },
      });

      setLastCursor(cursors.last ?? null);
      setSelectedClasseId(classeId);

      // ✅ URL toujours à jour quand on ouvre une classe
      syncUrlToClasse(classeId, anneeSelected ?? null);
    } catch (err) {
      console.error("❌ Erreur chargement élèves:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors du chargement");
      setElevesList([]);
      setPagination((p) => ({ ...p, hasNext: false, hasPrev: cursorStack.length > 1 }));
      setLastCursor(null);
    } finally {
      setLoadingEleves(false);
    }
  };

  // ✅ Ouverture auto de la liste élèves quand on arrive via /Bulletin?classeId=...
  useEffect(() => {
    const openFromUrl = async () => {
      if (!classeIdUrl) return;

      // reset comme un "retour"
      setClassSearchTerm("");
      setCursorStack([null]);
      setCurrentPage(1);
      setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });

      if (anneeUrl !== null) setAnneeSelected(anneeUrl);

      await loadClassEleves(classeIdUrl, null, "");
    };

    openFromUrl().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeIdUrl, anneeUrl]);

  // 🔎 Recherche globale (toutes classes)
  useEffect(() => {
    const performGlobalSearch = async () => {
      try {
        if (globalSearchTerm.trim() === "") {
          setGlobalSearchResults([]);
          return;
        }

        setLoadingGlobalSearch(true);

        const q = query(collection(db, "eleves"), where("statut_eleve", "==", "actif"), orderBy("identite.nom_individu"));
        const snapshot = await getDocs(q);

        const results = snapshot.docs.map((docx) => ({ id: docx.id, ...docx.data() })) as Eleve[];

        const term = globalSearchTerm.toLowerCase();
        const filtered = results.filter((eleve) =>
          `${eleve.identite.nom_individu} ${eleve.identite.prenom_individu}`.toLowerCase().includes(term)
        );

        setGlobalSearchResults(filtered);
      } catch (error) {
        console.error("Erreur recherche globale:", error);
        setGlobalSearchResults([]);
      } finally {
        setLoadingGlobalSearch(false);
      }
    };

    performGlobalSearch();
  }, [globalSearchTerm]);

  // 🔎 Recherche par classe (API) + debounce + reset pagination
  useEffect(() => {
    if (!selectedClasseId) return;

    const timer = setTimeout(() => {
      setCursorStack([null]);
      setCurrentPage(1);
      loadClassEleves(selectedClasseId, null, classSearchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [classSearchTerm, selectedClasseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccessEleveFromGlobalSearch = async (eleve: Eleve) => {
    if (!eleve.id_classe) return;

    setGlobalSearchTerm("");
    setGlobalSearchResults([]);

    setClassSearchTerm("");
    setCursorStack([null]);
    setCurrentPage(1);

    await loadClassEleves(eleve.id_classe, null, "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToClasses = () => {
    setSelectedClasseId(null);
    setCurrentPage(1);
    setElevesList([]);
    setClassSearchTerm("");
    setErrorState(null);
    setCursorStack([null]);
    setLastCursor(null);
    setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });

    setPrintingForClass(null);
    setPrintData(null);
    setPrintModalOpen(false);

    setAnneesDisponibles([]);
    setAnneeSelected(null);

    // ✅ URL propre (on revient au niveau "classes")
    syncUrlToClasse(null, null);
  };

  const handleNextPage = async () => {
    if (!selectedClasseId) return;
    if (!pagination.hasNext) return;
    if (!lastCursor) return;

    setCursorStack((prev) => [...prev, lastCursor]);
    setCurrentPage((p) => p + 1);

    await loadClassEleves(selectedClasseId, lastCursor, classSearchTerm);
  };

  const handlePrevPage = async () => {
    if (!selectedClasseId) return;
    if (cursorStack.length <= 1) return;

    const newStack = cursorStack.slice(0, -1);
    const prevAfter = newStack[newStack.length - 1] ?? null;

    setCursorStack(newStack);
    setCurrentPage((p) => Math.max(1, p - 1));

    await loadClassEleves(selectedClasseId, prevAfter, classSearchTerm);
  };

  const handleOpenStat = (eleveId: string, libelle: StatType) => {
    const rep = getRepartitionForStatType(libelle, periodMode);
    const y = anneeSelected;
    window.location.href = `/Bulletin/eleve/${eleveId}/stat?type=${libelle}&repartition=${rep}${y ? `&annee=${y}` : ""}`;
  };

  const isReadOnlyYear = useMemo(() => {
    if (!anneeSelected || !anneeScolaireActive) return false;
    return anneeSelected !== anneeScolaireActive;
  }, [anneeSelected, anneeScolaireActive]);

  const refreshReadinessForPage = useCallback(async () => {
    if (!selectedClasseId) return;
    if (!anneeSelected) return;

    if (elevesList.length === 0) {
      setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });
      return;
    }

    if (!nbMatieres) {
      setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });
      return;
    }

    try {
      setLoadingReady(true);

      const pageEleveIds = new Set(elevesList.map((e) => e.id));

      const buildCounts = async (statType: StatType): Promise<ReadyCountsMap> => {
        const qStats = query(
          collection(db, "statistique"),
          where("id_classe", "==", selectedClasseId),
          where("libelle_stat", "==", statType),
          where("annee_scolaire", "==", anneeSelected)
        );

        const snap = await getDocs(qStats);
        const counts: ReadyCountsMap = {};

        snap.forEach((docSnap) => {
          const data = docSnap.data() as Partial<Stat>;
          const id_eleve = data.id_eleve;
          if (!id_eleve) return;
          if (!pageEleveIds.has(id_eleve)) return;
          if (!isFiniteNumber(data.moyenne_matiere)) return;
          counts[id_eleve] = (counts[id_eleve] ?? 0) + 1;
        });

        return counts;
      };

      const [c1, c2, c3] = await Promise.all([buildCounts("Stat1"), buildCounts("Stat2"), buildCounts("Stat3")]);

      setReadyByStat({ Stat1: c1, Stat2: c2, Stat3: c3 });
    } catch (e) {
      console.error("❌ Erreur readiness:", e);
      setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });
    } finally {
      setLoadingReady(false);
    }
  }, [selectedClasseId, elevesList, nbMatieres, anneeSelected]);

  useEffect(() => {
    refreshReadinessForPage();
  }, [refreshReadinessForPage]);

  const isEleveReady = (eleveId: string, statType: StatType) => {
    if (!nbMatieres) return false;
    const count = readyByStat[statType]?.[eleveId] ?? 0;
    return count === nbMatieres;
  };
  ////hookuseRoleGuard
  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      Chargement...
    </div>
  );
}

  const handleCreateBulletinsForClass = async (statType: StatType) => {
    if (!selectedClasseId) return;
    if (isReadOnlyYear) {
      alert("Historique: création bulletins désactivée.");
      return;
    }

    try {
      setCreatingForClass(statType);
      setErrorState(null);

      const run = async (force: boolean) => {
        const repartition = getRepartitionForStatType(statType, periodMode);

        const res = await fetch("/api/Bulletin/create-for-class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_classe: selectedClasseId,
            libelle_stat: statType,
            repartition,
            force,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Erreur création bulletins");
        return json as {
          alreadyExistsCount: number;
          notReadyCount: number;
          createdCount: number;
          message?: string;
        };
      };

      const first = await run(false);

      if (first.notReadyCount > 0) {
        alert(
          `Impossible: certains élèves ne sont pas prêts pour ${statType}.\n` +
            `Complète d'abord toutes les matières (moyenne_matiere) pour ces élèves.`
        );
        return;
      }

      if (first.alreadyExistsCount > 0) {
        const ok = confirm(
          `Des bulletins ${statType} existent déjà.\n` +
            `Si tu continues, ils seront recréés (écrasés).\n\nContinuer ?`
        );
        if (!ok) return;
        await run(true);
        alert(`✅ Bulletins ${statType} recréés pour toute la classe.`);
        return;
      }

      alert(`✅ Bulletins ${statType} créés pour toute la classe.`);
    } catch (e) {
      console.error(e);
      setErrorState(e instanceof Error ? e.message : "Erreur création bulletins");
    } finally {
      setCreatingForClass(null);
    }
  };

  const handlePrintBulletinsForClass = async (statType: StatType) => {
    if (!selectedClasseId || !selectedClasse) return;
    if (!anneeSelected) return;

    try {
      setPrintingForClass(statType);
      setErrorState(null);

      const repartition = getRepartitionForStatType(statType, periodMode);

      const elevesSnap = await getDocs(
        query(collection(db, "eleves"), where("id_classe", "==", selectedClasseId), where("statut_eleve", "==", "actif"))
      );
      const effectif = elevesSnap.size;
      if (!effectif) throw new Error("Aucun élève actif dans cette classe.");

      const bulletinsSnap = await getDocs(
        query(
          collection(db, "bulletins"),
          where("id_classe", "==", selectedClasseId),
          where("annee_scolaire", "==", anneeSelected),
          where("libelle_stat", "==", statType),
          where("repartition", "==", repartition)
        )
      );

      if (bulletinsSnap.size !== effectif) {
        throw new Error(
          `Impossible d'imprimer: bulletins incomplets pour ${statType}/${repartition}/${anneeSelected}. (${bulletinsSnap.size}/${effectif})`
        );
      }

      const bulletins = bulletinsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Bulletin, "id">),
      })) as Bulletin[];

      const matiereIds = Array.isArray(selectedClasse.id_matieres) ? selectedClasse.id_matieres : [];
      const matiereInfoById: Record<string, Pick<Matiere, "coef" | "qualificatif" | "libelle_matiere">> = {};

      for (const id of matiereIds) {
        const snap = await getDoc(doc(db, "matieres", id));
        if (!snap.exists) continue;

        const m = snap.data() as Partial<Matiere>;
        matiereInfoById[id] = {
          coef: typeof m.coef === "number" ? m.coef : 1,
          qualificatif: m.qualificatif === "Facultative" ? "Facultative" : "Fondamentale",
          libelle_matiere: m.libelle_matiere ?? "",
        };
      }

      const mgId = `${selectedClasseId}_${statType}_${repartition}_${anneeSelected}`;
      const mgSnap = await getDoc(doc(db, "moyennes_generales_classes", mgId));
      const mgData = mgSnap.exists() ? (mgSnap.data() as MoyenneGeneraleClasseDoc) : null;
      const moyenneGeneraleClasse = typeof mgData?.moyenneGenerale === "number" ? mgData.moyenneGenerale : null;

      const classeLibelle = selectedClasse.libelle_classe ?? "";
      const filename = `Bulletins_${classeLibelle}_${statType}_${repartition}_${anneeSelected}.pdf`;

      setPrintData({
        bulletins,
        matiereInfoById,
        effectifClasse: effectif,
        moyenneGeneraleClasse,
        filename,
        classeLibelle,
      });
      setPrintModalOpen(true);
    } catch (e) {
      console.error(e);
      setErrorState(e instanceof Error ? e.message : "Erreur impression bulletins");
    } finally {
      setPrintingForClass(null);
    }
  };

  if (!selectedClasseId) {
    return (
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Bulletins</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sélectionnez une classe pour voir les élèves.</p>
            {anneeScolariteError ? <p className="text-xs text-red-600 mt-1">{anneeScolariteError}</p> : null}
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300">
            Année active: <b>{anneeScolaireActive ? formatAnneeScolaire(anneeScolaireActive) : "—"}</b>
          </div>
        </div>

        {/* Recherche globale */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un élève (toutes les classes)..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Résultats recherche globale */}
        {globalSearchTerm.trim() !== "" && (
          <div className="mb-8">
            <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-blue-900 dark:text-blue-100 font-semibold">
                {loadingGlobalSearch ? "Recherche..." : `${globalSearchResults.length} résultat(s)`}
              </p>
            </div>

            {!loadingGlobalSearch && globalSearchResults.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-200 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nom & Prénom</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Classe</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.map((eleve) => {
                        const classe = classes.find((c) => c.id === eleve.id_classe);
                        return (
                          <tr
                            key={eleve.id}
                            className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                              {eleve.identite.nom_individu} {eleve.identite.prenom_individu}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                              <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                                {classe?.libelle_classe}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button
                                onClick={() => handleAccessEleveFromGlobalSearch(eleve)}
                                variant="outlined"
                                size="small"
                                className="!text-blue-600 !border-blue-600"
                              >
                                Accéder
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cartes classes */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            {activeClasses.map((classe) => {
              const stats = classesStats[classe.id];

              return (
                <div
                  key={classe.id}
                  onClick={async () => {
                    setClassSearchTerm("");
                    setCursorStack([null]);
                    setCurrentPage(1);

                    setAnneesDisponibles([]);
                    setAnneeSelected(null);

                    await loadClassEleves(classe.id, null, "");
                  }}
                  className="flex-shrink-0 w-56 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition transform hover:scale-105"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{classe.libelle_classe}</h3>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Effectif:</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{stats?.total ?? "—"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">👦 Garçons:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{stats?.boys ?? "—"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">👩 Filles:</span>
                      <span className="font-semibold text-pink-600 dark:text-pink-400">{stats?.girls ?? "—"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Matières:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {classe.nombre_matiere ?? classe.matieres?.length ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Titulaire: {classe.titulaire_classe || "—"}</p>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Cliquez pour voir les élèves</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {printModalOpen && printData && (
        <PrintBulletinsModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          classeLibelle={printData.classeLibelle}
          filename={printData.filename}
          bulletins={printData.bulletins}
          matiereInfoById={printData.matiereInfoById}
          effectifClasse={printData.effectifClasse}
          moyenneGeneraleClasse={printData.moyenneGeneraleClasse}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBackToClasses}
            variant="outlined"
            startIcon={<MdArrowBack size={20} />}
            className="!text-blue-600 !border-blue-600"
          >
            Retour aux classes
          </Button>

          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">{selectedClasse?.libelle_classe}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Élèves (10 par page){nbMatieres ? ` • ${nbMatieres} matière(s)` : ""}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mode période: <b>{periodMode}</b> (prêt pour semestres plus tard)
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Année:</span>
            <select
              value={anneeSelected ?? ""}
              onChange={(e) => {
                const y = e.target.value ? Number(e.target.value) : null;
                setAnneeSelected(y);

                setCursorStack([null]);
                setCurrentPage(1);
                setReadyByStat({ Stat1: {}, Stat2: {}, Stat3: {} });

                if (selectedClasseId) {
                  // ✅ URL à jour
                  syncUrlToClasse(selectedClasseId, y);
                  loadClassEleves(selectedClasseId, null, classSearchTerm);
                }
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
            <div className="text-xs text-amber-700 dark:text-amber-300">Historique: lecture seule</div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">Année active</div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {loadingReady ? "Vérification readiness..." : "Readiness (rouge = prêt) sur la page courante."}
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          {(["Stat1", "Stat2", "Stat3"] as const).map((st) => (
            <div key={st} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{st}</span>

              <Button
                variant="contained"
                disabled={!selectedClasseId || creatingForClass === st || isReadOnlyYear}
                className="!bg-blue-600 hover:!bg-blue-700"
                onClick={() => handleCreateBulletinsForClass(st)}
                title={isReadOnlyYear ? "Historique: création désactivée" : ""}
              >
                {creatingForClass === st ? "Création..." : "Créer Bulletins"}
              </Button>

              <Button
                variant="outlined"
                disabled={!selectedClasseId || printingForClass === st || !anneeSelected}
                onClick={() => handlePrintBulletinsForClass(st)}
                title="Imprime seulement si tous les bulletins de la période existent"
              >
                {printingForClass === st ? "Impression..." : "Imprimer Bulletins"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={`Rechercher un élève dans ${selectedClasse?.libelle_classe}...`}
          value={classSearchTerm}
          onChange={(e) => setClassSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errorState && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">{errorState}</div>
      )}

      {loadingEleves ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto shadow-md rounded-lg mb-6">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    N° - Nom & Prénom
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat1</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat2</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat3</th>
                </tr>
              </thead>

              <tbody>
                {elevesList.map((eleve, index) => (
                  <tr
                    key={eleve.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      <span className="inline-block mr-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full w-6 h-6 text-center font-bold text-xs leading-6">
                        {(currentPage - 1) * 10 + index + 1}
                      </span>
                      {eleve.identite.nom_individu} {eleve.identite.prenom_individu}
                    </td>

                    {(["Stat1", "Stat2", "Stat3"] as const).map((st) => {
                      const ready = isEleveReady(eleve.id, st);
                      const count = readyByStat[st]?.[eleve.id] ?? 0;

                      return (
                        <td key={st} className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              onClick={() => handleOpenStat(eleve.id, st)}
                              variant="outlined"
                              size="small"
                              className={ready ? "!text-red-600 !border-red-600" : "!text-indigo-600 !border-indigo-600"}
                              endIcon={<MdOpenInNew size={16} />}
                              title={
                                nbMatieres
                                  ? `Prêt si ${count}/${nbMatieres} matières ont une moyenne_matiere`
                                  : "Nombre de matières inconnu"
                              }
                            >
                              Ouvrir
                            </Button>

                            {nbMatieres ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{count}/{nbMatieres}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center items-center gap-4 mb-6">
            <Button
              onClick={handlePrevPage}
              disabled={cursorStack.length <= 1 || loadingEleves}
              variant="outlined"
              startIcon={<MdNavigateBefore size={20} />}
            >
              Précédent
            </Button>

            <span className="text-gray-700 dark:text-gray-300 font-semibold">Page {currentPage}</span>

            <Button
              onClick={handleNextPage}
              disabled={!pagination.hasNext || loadingEleves}
              variant="outlined"
              endIcon={<MdNavigateNext size={20} />}
            >
              Suivant
            </Button>
          </div>

          {elevesList.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun élève trouvé</div>}
        </>
      )}
    </div>
  );
}