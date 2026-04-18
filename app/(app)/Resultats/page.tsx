"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  endAt,
  updateDoc,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";

import { db } from "@/app/src/lib/firebase-client";
import type { Bulletin, VerdictBulletin } from "@/app/src/interface/data";
import { useClasses } from "@/app/src/context/classeContext";
import { useRoleGuard } from "@/app/src/hooks/useRoleGuard";
import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
type PeriodMode = "trimestre" | "semestre";
type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
type ListKind = "admis" | "echoues";
type Section = { statType: StatType; repartition: Repartition; label: string };
type SectionKey = `${StatType}_${Repartition}`;

type MoyenneGeneraleClasseDoc = { moyenneGenerale?: number };
type InscriptionYearDoc = { annee_scolaire?: number };

const pageLimit = 10;

const normalizeSearch = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
const isFinalRepartition = (r: Repartition) => r === "Trimestre3" || r === "Semestre2";
const keyOf = (s: Section) => `${s.statType}_${s.repartition}` as SectionKey;
const formatAnneeScolaire = (startYear: number) => `${startYear}-${startYear + 1}`;

const getSections = (mode: PeriodMode): Section[] => {
  if (mode === "semestre") {
    return [
      { statType: "Stat1", repartition: "Semestre1", label: "Semestre 1" },
      { statType: "Stat2", repartition: "Semestre2", label: "Semestre 2" },
    ];
  }
  return [
    { statType: "Stat1", repartition: "Trimestre1", label: "Trimestre 1" },
    { statType: "Stat2", repartition: "Trimestre2", label: "Trimestre 2" },
    { statType: "Stat3", repartition: "Trimestre3", label: "Trimestre 3" },
  ];
};

type ListState = {
  items: Bulletin[];
  loading: boolean;
  error: string | null;

  search: string;

  page: number;
  cursorStack: (DocumentSnapshot | null)[];
  lastDoc: DocumentSnapshot | null;
  hasNext: boolean;
};

const emptyListState = (): ListState => ({
  items: [],
  loading: false,
  error: null,
  search: "",
  page: 1,
  cursorStack: [null],
  lastDoc: null,
  hasNext: false,
});

function PeriodTabButton(props: { active: boolean; onClick: () => void; title: string; subtitle?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "relative px-4 py-3 text-left",
        "min-w-[170px] md:min-w-[200px]",
        "bg-transparent",
        "hover:bg-gray-100 dark:hover:bg-gray-800/60",
        "transition",
      ].join(" ")}
    >
      <div className="font-semibold text-gray-900 dark:text-white">{props.title}</div>
      {props.subtitle ? <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.subtitle}</div> : null}
      <div
        className={[
          "absolute left-0 right-0 -bottom-[1px] h-[3px]",
          props.active ? "bg-blue-600" : "bg-transparent",
        ].join(" ")}
      />
    </button>
  );
}

function ClasseCardButton(props: {
  active: boolean;
  title: string;
  effectif: number | null;
  admis: number | null;
  echoues: number | null;
  titulaire?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex-shrink-0 w-72 md:w-80",
        "rounded-xl p-4 text-left",
        "transition",
        "bg-white dark:bg-gray-800",
        "shadow-sm hover:shadow-md",
        props.active ? "ring-2 ring-blue-600" : "ring-1 ring-gray-200 dark:ring-gray-700",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold text-gray-900 dark:text-white">{props.title}</div>
        <div className={props.active ? "text-xs font-semibold text-blue-600" : "text-xs text-gray-400"}>
          {props.active ? "Actif" : ""}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">Effectif</div>
          <div className="font-bold text-gray-900 dark:text-white">{props.effectif ?? "—"}</div>
        </div>

        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
          <div className="text-xs text-green-700 dark:text-green-300">Admis</div>
          <div className="font-bold text-green-800 dark:text-green-200">{props.admis ?? "—"}</div>
        </div>

        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
          <div className="text-xs text-red-700 dark:text-red-300">Échoués</div>
          <div className="font-bold text-red-800 dark:text-red-200">{props.echoues ?? "—"}</div>
        </div>
      </div>

      {props.titulaire ? (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Titulaire: <span className="font-semibold text-gray-700 dark:text-gray-200">{props.titulaire}</span>
        </div>
      ) : null}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">{props.active ? "Recliquer pour fermer" : "Cliquer pour ouvrir"}</div>
    </button>
  );
}

export default function ResultatsPage() {
   const { loading: loadingRole } = useRoleGuard(["admin"]);
  const { classes } = useClasses();
   const admisTableRef = useRef<HTMLDivElement>(null);
const echouesTableRef = useRef<HTMLDivElement>(null);
const [totalAdmis, setTotalAdmis] = useState(0);
const [totalEchoues, setTotalEchoues] = useState(0);

  const activeClasses = useMemo(
    () => classes.filter((c) => (c.statut_classe ?? "actif") === "actif"),
    [classes]
  );

  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(null);
  const selectedClasse = useMemo(
    () => activeClasses.find((c) => c.id === selectedClasseId) ?? null,
    [activeClasses, selectedClasseId]
  );

  const [periodMode, setPeriodMode] = useState<PeriodMode>("trimestre");
  const sections = useMemo(() => getSections(periodMode), [periodMode]);

  const [activeSectionKey, setActiveSectionKey] = useState<SectionKey>(() => keyOf(getSections("trimestre")[0]));

  
  useEffect(() => {
    setActiveSectionKey(keyOf(sections[0]));
  }, [sections]);

  const finalSection = useMemo(() => {
    return periodMode === "semestre"
      ? ({ statType: "Stat2", repartition: "Semestre2" } as const)
      : ({ statType: "Stat3", repartition: "Trimestre3" } as const);
  }, [periodMode]);

  const [cardsStats, setCardsStats] = useState<
    Record<string, { effectif: number; admis: number; echoues: number; titulaire: string }>
  >({});
  const [loadingCardsStats, setLoadingCardsStats] = useState(false);

  // ========= Année scolaire active + années dispo =========
  const [anneeScolaireActive, setAnneeScolaireActive] = useState<number | null>(null);
  const [anneeScolaireError, setAnneeScolaireError] = useState<string | null>(null);

  const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
  const [anneeSelected, setAnneeSelected] = useState<number | null>(null);

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

  // ✅ années dispo: inscriptions + fallback stats + fallback bulletins
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

  const isReadOnlyYear = useMemo(() => {
    if (!anneeSelected || !anneeScolaireActive) return false;
    return anneeSelected !== anneeScolaireActive;
  }, [anneeSelected, anneeScolaireActive]);

  const fetchCardsStats = useCallback(async () => {
    try {
      setLoadingCardsStats(true);
      const out: Record<string, { effectif: number; admis: number; echoues: number; titulaire: string }> = {};

      for (const c of activeClasses) {
        const elevesSnap = await getDocs(
          query(collection(db, "eleves"), where("id_classe", "==", c.id), where("statut_eleve", "==", "actif"))
        );
        const effectif = elevesSnap.size;

        const constraints: QueryConstraint[] = [
          where("id_classe", "==", c.id),
          where("libelle_stat", "==", finalSection.statType),
          where("repartition", "==", finalSection.repartition),
        ];
        if (anneeSelected) constraints.push(where("annee_scolaire", "==", anneeSelected));

        const bSnap = await getDocs(query(collection(db, "bulletins"), ...constraints));

        let admis = 0;
        let echoues = 0;

        bSnap.forEach((d) => {
          const b = d.data() as Partial<Bulletin>;
          if (b.verdict === "Échoué") echoues += 1;
          else if (b.verdict === "Admis" || b.verdict === "Admis par décision") admis += 1;
        });

        out[c.id] = { effectif, admis, echoues, titulaire: c.titulaire_classe ?? "" };
      }

      setCardsStats(out);
    } catch (e) {
      console.error(e);
      setCardsStats({});
    } finally {
      setLoadingCardsStats(false);
    }
  }, [activeClasses, finalSection, anneeSelected]);

  useEffect(() => {
    fetchCardsStats();
  }, [fetchCardsStats]);

  const [moyenneGenerale, setMoyenneGenerale] = useState<number | null>(null);

  const [admisBySection, setAdmisBySection] = useState<Record<SectionKey, ListState>>(() => {
    const init = {} as Record<SectionKey, ListState>;
    for (const s of getSections("trimestre")) init[keyOf(s)] = emptyListState();
    for (const s of getSections("semestre")) init[keyOf(s)] = emptyListState();
    return init;
  });

  const [echouesBySection, setEchouesBySection] = useState<Record<SectionKey, ListState>>(() => {
    const init = {} as Record<SectionKey, ListState>;
    for (const s of getSections("trimestre")) init[keyOf(s)] = emptyListState();
    for (const s of getSections("semestre")) init[keyOf(s)] = emptyListState();
    return init;
  });

  const activeSection = useMemo(
    () => sections.find((s) => keyOf(s) === activeSectionKey) ?? sections[0],
    [sections, activeSectionKey]
  );
  //comptage admis et echouer
    useEffect(() => {
        async function fetchTotals() {
          if (!selectedClasseId || !anneeSelected) {
            setTotalAdmis(0);
            setTotalEchoues(0);
            return;
          }
          // Compte Admis
          const qAdmis = query(
            collection(db, "bulletins"),
            where("id_classe", "==", selectedClasseId),
            where("libelle_stat", "==", activeSection.statType),
            where("repartition", "==", activeSection.repartition),
            where("annee_scolaire", "==", anneeSelected),
            where("verdict", "in", ["Admis", "Admis par décision"])
          );
          const admisSnap = await getDocs(qAdmis);
          setTotalAdmis(admisSnap.size);

          // Compte Echoués
          const qEchoues = query(
            collection(db, "bulletins"),
            where("id_classe", "==", selectedClasseId),
            where("libelle_stat", "==", activeSection.statType),
            where("repartition", "==", activeSection.repartition),
            where("annee_scolaire", "==", anneeSelected),
            where("verdict", "==", "Échoué")
          );
          const echouesSnap = await getDocs(qEchoues);
          setTotalEchoues(echouesSnap.size);
        }

        fetchTotals();
      }, [selectedClasseId, activeSection, anneeSelected]);
  const activeKey = keyOf(activeSection);
  const admisState = admisBySection[activeKey] ?? emptyListState();
  const echouesState = echouesBySection[activeKey] ?? emptyListState();

  const handleSelectClasse = useCallback((id: string) => {
    setSelectedClasseId((prev) => {
      const next = prev === id ? null : id;
      if (next === null) setMoyenneGenerale(null);
      return next;
    });
  }, []);

  const buildQuery = useCallback(
    (args: {
      classeId: string;
      section: Section;
      kind: ListKind;
      search: string;
      afterDoc: DocumentSnapshot | null;
      annee: number | null;
    }) => {
      const { classeId, section, kind, search, afterDoc, annee } = args;
      const term = normalizeSearch(search);

      const constraints: QueryConstraint[] = [
        where("id_classe", "==", classeId),
        where("libelle_stat", "==", section.statType),
        where("repartition", "==", section.repartition),
      ];

      if (annee) constraints.push(where("annee_scolaire", "==", annee));

      constraints.push(orderBy("search_nom_prenom"));

      if (kind === "echoues") constraints.push(where("verdict", "==", "Échoué"));
      else constraints.push(where("verdict", "in", ["Admis", "Admis par décision"]));

      if (term) {
        constraints.push(startAt(term));
        constraints.push(endAt(term + "\uf8ff"));
      }

      if (afterDoc) constraints.push(startAfter(afterDoc));
      constraints.push(limit(pageLimit));

      return query(collection(db, "bulletins"), ...constraints);
    },
    []
  );

  const loadMoyGen = useCallback(async (classeId: string, section: Section, annee: number | null) => {
    try {
      if (!annee) {
        setMoyenneGenerale(null);
        return;
      }
      const mgId = `${classeId}_${section.statType}_${section.repartition}_${annee}`;
      const mgSnap = await getDoc(doc(db, "moyennes_generales_classes", mgId));
      const mgData = mgSnap.exists() ? (mgSnap.data() as MoyenneGeneraleClasseDoc) : null;
      const val = typeof mgData?.moyenneGenerale === "number" ? mgData.moyenneGenerale : null;
      setMoyenneGenerale(val);
    } catch (e) {
      console.error(e);
      setMoyenneGenerale(null);
    }
  }, []);

  const loadFirstPage = useCallback(
    async (args: { classeId: string; section: Section; kind: ListKind; search: string }) => {
      const { classeId, section, kind, search } = args;
      const k = keyOf(section);

      const setState = kind === "admis" ? setAdmisBySection : setEchouesBySection;

      setState((prev) => ({
        ...prev,
        [k]: {
          ...(prev[k] ?? emptyListState()),
          loading: true,
          error: null,
          page: 1,
          cursorStack: [null],
          lastDoc: null,
          search,
        },
      }));

      try {
        const q = buildQuery({ classeId, section, kind, search, afterDoc: null, annee: anneeSelected });
        const snap = await getDocs(q);

        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bulletin, "id">) })) as Bulletin[];
        const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

        setState((prev) => ({
          ...prev,
          [k]: {
            ...(prev[k] ?? emptyListState()),
            items,
            loading: false,
            error: null,
            page: 1,
            cursorStack: [null],
            lastDoc,
            hasNext: snap.docs.length === pageLimit,
            search,
          },
        }));
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Erreur chargement";
        setState((prev) => ({ ...prev, [k]: { ...(prev[k] ?? emptyListState()), loading: false, error: msg } }));
      }
    },
    [buildQuery, anneeSelected]
  );

  const goNext = useCallback(
    async (args: { classeId: string; section: Section; kind: ListKind }) => {
      const { classeId, section, kind } = args;
      const k = keyOf(section);

      const getState = kind === "admis" ? admisBySection : echouesBySection;
      const setState = kind === "admis" ? setAdmisBySection : setEchouesBySection;

      const st = getState[k];
      if (!st || !st.hasNext || !st.lastDoc) return;

      setState((prev) => ({ ...prev, [k]: { ...(prev[k] ?? emptyListState()), loading: true, error: null } }));

      try {
        const q = buildQuery({ classeId, section, kind, search: st.search, afterDoc: st.lastDoc, annee: anneeSelected });
        const snap = await getDocs(q);

        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bulletin, "id">) })) as Bulletin[];
        const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

        setState((prev) => ({
          ...prev,
          [k]: {
            ...(prev[k] ?? emptyListState()),
            items,
            loading: false,
            error: null,
            page: st.page + 1,
            cursorStack: [...st.cursorStack, st.lastDoc],
            lastDoc,
            hasNext: snap.docs.length === pageLimit,
          },
        }));
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Erreur pagination";
        setState((prev) => ({ ...prev, [k]: { ...(prev[k] ?? emptyListState()), loading: false, error: msg } }));
      }
    },
    [admisBySection, echouesBySection, buildQuery, anneeSelected]
  );

  const goPrev = useCallback(
    async (args: { classeId: string; section: Section; kind: ListKind }) => {
      const { classeId, section, kind } = args;
      const k = keyOf(section);

      const getState = kind === "admis" ? admisBySection : echouesBySection;
      const setState = kind === "admis" ? setAdmisBySection : setEchouesBySection;

      const st = getState[k];
      if (!st || st.cursorStack.length <= 1) return;

      const newStack = st.cursorStack.slice(0, -1);
      const afterDoc = newStack[newStack.length - 1] ?? null;

      setState((prev) => ({ ...prev, [k]: { ...(prev[k] ?? emptyListState()), loading: true, error: null } }));

      try {
        const q = buildQuery({ classeId, section, kind, search: st.search, afterDoc, annee: anneeSelected });
        const snap = await getDocs(q);

        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bulletin, "id">) })) as Bulletin[];
        const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

        setState((prev) => ({
          ...prev,
          [k]: {
            ...(prev[k] ?? emptyListState()),
            items,
            loading: false,
            error: null,
            page: Math.max(1, st.page - 1),
            cursorStack: newStack,
            lastDoc,
            hasNext: snap.docs.length === pageLimit,
          },
        }));
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Erreur pagination";
        setState((prev) => ({ ...prev, [k]: { ...(prev[k] ?? emptyListState()), loading: false, error: msg } }));
      }
    },
    [admisBySection, echouesBySection, buildQuery, anneeSelected]
  );

  const refreshActive = useCallback(async () => {
    if (!selectedClasseId) return;

    const k = keyOf(activeSection);
    const admisSearch = admisBySection[k]?.search ?? "";
    const echouesSearch = echouesBySection[k]?.search ?? "";

    await loadMoyGen(selectedClasseId, activeSection, anneeSelected);

    await loadFirstPage({ classeId: selectedClasseId, section: activeSection, kind: "admis", search: admisSearch });
    await loadFirstPage({ classeId: selectedClasseId, section: activeSection, kind: "echoues", search: echouesSearch });
  }, [selectedClasseId, activeSection, anneeSelected, loadMoyGen, loadFirstPage, admisBySection, echouesBySection]);

  useEffect(() => {
    if (!selectedClasseId) return;
    if (!anneeSelected) return;
    refreshActive();
  }, [selectedClasseId, anneeSelected, activeSectionKey, refreshActive]);

  const setDecisionAdmis = useCallback(
    async (b: Bulletin) => {
      if (!selectedClasseId) return;
      if (!isFinalRepartition(b.repartition as Repartition)) return;
      if (b.verdict !== "Échoué") return;

      if (isReadOnlyYear) {
        alert("Historique: action désactivée.");
        return;
      }

      const ok = confirm(`Passer "${b.eleve_nom} ${b.eleve_prenom}" à "Admis par décision" ?`);
      if (!ok) return;

      try {
        await updateDoc(doc(db, "bulletins", b.id), {
          verdict: "Admis par décision" as VerdictBulletin,
          updatedAt: new Date().toISOString(),
        });

        await fetchCardsStats();
        await refreshActive();
      } catch (e) {
        console.error(e);
        alert("Erreur: impossible de mettre 'Admis par décision' (droits Firestore ?).");
      }
    },
    [selectedClasseId, fetchCardsStats, refreshActive, isReadOnlyYear]
  );

  const [clotureOpen, setClotureOpen] = useState(false);
  const [clotureLoading, setClotureLoading] = useState(false);
  const [clotureError, setClotureError] = useState<string | null>(null);
  const [clotureSuccess, setClotureSuccess] = useState<string | null>(null);

  const canCloturer = useMemo(() => {
    return Boolean(selectedClasseId && isFinalRepartition(activeSection.repartition));
  }, [selectedClasseId, activeSection.repartition]);

  const handleAskCloture = useCallback(() => {
    setClotureError(null);
    setClotureSuccess(null);
    setClotureOpen(true);
  }, []);

  const handleDoCloture = useCallback(async () => {
    if (!selectedClasseId) return;

    if (isReadOnlyYear) {
      setClotureError("Historique: clôture désactivée.");
      return;
    }

    if (!anneeScolaireActive) {
      setClotureError("Année scolaire active introuvable. Lance /api/settings/init d'abord.");
      return;
    }

    try {
      setClotureLoading(true);
      setClotureError(null);
      setClotureSuccess(null);

      const res = await fetch("/api/classes/cloturer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_classe: selectedClasseId,
          mode: periodMode,
          annee_scolaire: anneeScolaireActive,
        }),
      });

      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;

      if (!res.ok) {
        throw new Error(j?.error ?? `Erreur HTTP ${res.status}`);
      }

      setClotureSuccess(j?.message ?? "Clôture effectuée.");
      setClotureOpen(false);

      await fetchCardsStats();
      await refreshActive();
    } catch (e) {
      console.error(e);
      setClotureError(e instanceof Error ? e.message : "Erreur clôture");
    } finally {
      setClotureLoading(false);
    }
  }, [selectedClasseId, anneeScolaireActive, periodMode, fetchCardsStats, refreshActive, isReadOnlyYear]);
//

  //userRoleGuard
    if (loadingRole) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement des droits...</p>
      </div>
    );
  }
  //pdf
    async function handleExportPdf(ref: React.RefObject<HTMLElement | null>, filename: string) {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  }
  //
  
  //ok
  return (
    <div className="w-full p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Résultats</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">{selectedClasse?.libelle_classe ?? "Choisis une classe"}</div>

          {anneeScolaireActive ? (
            <div className="text-xs text-gray-400 mt-1">
              Année scolaire active: {formatAnneeScolaire(anneeScolaireActive)}
            </div>
          ) : null}

          {anneeScolaireError ? (
            <div className="text-xs text-red-600 mt-1">
              {anneeScolaireError} (Crée-la via <code>/api/settings/init</code>)
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/Bulletin">
            <Button variant="outlined">Retour Bulletin</Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3 min-w-max">
          {activeClasses.map((c) => {
            const st = cardsStats[c.id];

            return (
              <ClasseCardButton
                key={c.id}
                active={c.id === selectedClasseId}
                title={c.libelle_classe}
                effectif={loadingCardsStats ? null : st?.effectif ?? null}
                admis={loadingCardsStats ? null : st?.admis ?? null}
                echoues={loadingCardsStats ? null : st?.echoues ?? null}
                titulaire={st?.titulaire ?? c.titulaire_classe ?? ""}
                onClick={() => handleSelectClasse(c.id)}
              />
            );
          })}
        </div>
      </div>

      {selectedClasseId ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Classe sélectionnée: <b>{selectedClasse?.libelle_classe ?? ""}</b>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Année:</span>
            <select
              value={anneeSelected ?? ""}
              onChange={(e) => setAnneeSelected(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm"
            >
              {(anneesDisponibles.length ? anneesDisponibles : anneeScolaireActive ? [anneeScolaireActive] : []).map((y) => (
                <option key={y} value={y}>
                  {formatAnneeScolaire(y)}
                </option>
              ))}
            </select>

            {isReadOnlyYear ? (
              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Historique: lecture seule
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Année active
              </span>
            )}
          </div>
        </div>
      ) : null}

      {selectedClasseId ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {anneeSelected ? (
              <>
                Année sélectionnée: <b>{formatAnneeScolaire(anneeSelected)}</b>
              </>
            ) : (
              "—"
            )}
          </div>

          <div className="flex items-center gap-2">
            {!canCloturer ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Clôture disponible seulement en <b>période finale</b> (T3 ou S2).
              </div>
            ) : null}

            <Button
              variant="contained"
              color="warning"
              onClick={handleAskCloture}
              disabled={!canCloturer || clotureLoading || !anneeScolaireActive || isReadOnlyYear}
              title={isReadOnlyYear ? "Historique: clôture désactivée" : ""}
            >
              Clôturer la classe sélectionnée
            </Button>
          </div>
        </div>
      ) : null}

      {!selectedClasseId ? (
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Clique sur une classe pour afficher les périodes et les listes (Admis / Échoués). Re-clique sur la même classe pour fermer.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={periodMode === "trimestre" ? "contained" : "outlined"}
                onClick={() => setPeriodMode("trimestre")}
                className={periodMode === "trimestre" ? "!bg-blue-600 hover:!bg-blue-700" : ""}
              >
                Trimestres
              </Button>
              <Button
                variant={periodMode === "semestre" ? "contained" : "outlined"}
                onClick={() => setPeriodMode("semestre")}
                className={periodMode === "semestre" ? "!bg-blue-600 hover:!bg-blue-700" : ""}
              >
                Semestres
              </Button>
              <Button variant="outlined" onClick={refreshActive} disabled={!anneeSelected}>
                Actualiser
              </Button>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300">
              Moyenne générale classe: <b>{typeof moyenneGenerale === "number" ? moyenneGenerale.toFixed(2) : "—"}</b>
            </div>
          </div>

          <div className="mt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex min-w-max">
              {sections.map((s) => {
                const k = keyOf(s);
                return (
                  <PeriodTabButton
                    key={k}
                    active={k === activeSectionKey}
                    onClick={() => setActiveSectionKey(k)}
                    title={s.label}
                    subtitle={`${s.statType} • ${s.repartition}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
                <div className="font-semibold text-gray-900 dark:text-white">Admis</div>
                <div className="flex items-center gap-2">
                  <input
                    value={admisState.search}
                    onChange={(ev) =>
                      setAdmisBySection((prev) => ({
                        ...prev,
                        [activeKey]: { ...(prev[activeKey] ?? emptyListState()), search: ev.target.value },
                      }))
                    }
                    placeholder="Nom / Prénom..."
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-sm"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      loadFirstPage({
                        classeId: selectedClasseId,
                        section: activeSection,
                        kind: "admis",
                        search: admisState.search,
                      })
                    }
                    disabled={!anneeSelected}
                  >
                    Chercher
                  </Button>
                </div>
              </div>
             <div className="px-4 py-2 flex justify-end">
                {(!echouesState.loading && totalEchoues > 0 && echouesState.items.length === totalEchoues) ? (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleExportPdf(
                      echouesTableRef,
                      `Echoues_${selectedClasse?.libelle_classe ?? ""}_${anneeSelected ? formatAnneeScolaire(anneeSelected) : ""}_${activeSection.label}.pdf`
                    )}
                  >
                    Imprimer PDF Échoués
                  </Button>
                ) : (
                  <Button variant="contained" color="error" disabled>
                    {echouesState.loading || totalEchoues === 0 ? "Chargement PDF..." : "PDF indisponible"}
                  </Button>
                )}
              </div>
               <div ref={admisTableRef}>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-semibold">Élève</th>
                          <th className="px-3 py-2 text-center text-sm font-semibold">Moy. trim.</th>
                          {isFinalRepartition(activeSection.repartition) && (
                            <th className="px-3 py-2 text-center text-sm font-semibold">Moy. ann.</th>
                          )}
                          <th className="px-3 py-2 text-center text-sm font-semibold">Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admisState.loading && admisState.items.length === 0 ? (
                          <tr>
                            <td colSpan={isFinalRepartition(activeSection.repartition) ? 4 : 3} className="px-3 py-8 text-center">
                              Chargement...
                            </td>
                          </tr>
                        ) : !admisState.loading && admisState.items.length === 0 ? (
                          <tr>
                            <td colSpan={isFinalRepartition(activeSection.repartition) ? 4 : 3} className="px-3 py-8 text-center text-gray-500">
                              Aucun
                            </td>
                          </tr>
                        ) : (
                          [...admisState.items]
                            .sort((a, b) =>
                              (a.eleve_nom + a.eleve_prenom).localeCompare(b.eleve_nom + b.eleve_prenom)
                            )
                            .map((b) => (
                              <tr key={b.id} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-3 py-2 text-sm font-semibold">
                                  {b.eleve_nom} {b.eleve_prenom}
                                </td>
                                <td className="px-3 py-2 text-sm text-center">
                                  {typeof b.moyenne_trimestrielle === "number" ? b.moyenne_trimestrielle.toFixed(2) : "—"}
                                </td>
                                {isFinalRepartition(activeSection.repartition) && (
                                  <td className="px-3 py-2 text-sm text-center">
                                    {typeof b.moyenne_annuelle === "number" ? b.moyenne_annuelle.toFixed(2) : "—"}
                                  </td>
                                )}
                                <td className="px-3 py-2 text-sm text-center">{b.verdict}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              <div className="p-3 flex items-center justify-center gap-3">
                <Button
                  variant="outlined"
                  onClick={() => goPrev({ classeId: selectedClasseId, section: activeSection, kind: "admis" })}
                  disabled={admisState.loading || admisState.cursorStack.length <= 1}
                >
                  Précédent
                </Button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Page {admisState.page}</span>
                <Button
                  variant="outlined"
                  onClick={() => goNext({ classeId: selectedClasseId, section: activeSection, kind: "admis" })}
                  disabled={admisState.loading || !admisState.hasNext}
                >
                  Suivant
                </Button>
              </div>
            </div>

            {/* Échoués */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
                <div className="font-semibold text-gray-900 dark:text-white">Échoués</div>
                <div className="flex items-center gap-2">
                  <input
                    value={echouesState.search}
                    onChange={(ev) =>
                      setEchouesBySection((prev) => ({
                        ...prev,
                        [activeKey]: { ...(prev[activeKey] ?? emptyListState()), search: ev.target.value },
                      }))
                    }
                    placeholder="Nom / Prénom..."
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-sm"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      loadFirstPage({
                        classeId: selectedClasseId,
                        section: activeSection,
                        kind: "echoues",
                        search: echouesState.search,
                      })
                    }
                    disabled={!anneeSelected}
                  >
                    Chercher
                  </Button>
                </div>
              </div>
             <div className="px-4 py-2 flex justify-end">
                {(!echouesState.loading && totalEchoues > 0 && echouesState.items.length === totalEchoues) ? (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleExportPdf(
                      echouesTableRef,
                      `Echoues_${selectedClasse?.libelle_classe ?? ""}_${anneeSelected ? formatAnneeScolaire(anneeSelected) : ""}_${activeSection.label}.pdf`
                    )}
                  >
                    Imprimer PDF Échoués
                  </Button>
                ) : (
                  <Button variant="contained" color="error" disabled>
                    {echouesState.loading || totalEchoues === 0 ? "Chargement PDF..." : "PDF indisponible"}
                  </Button>
                )}
              </div>
              <div ref={echouesTableRef}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold">Élève</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">Moy. trim.</th>
                        {isFinalRepartition(activeSection.repartition) && (
                          <th className="px-3 py-2 text-center text-sm font-semibold">Moy. ann.</th>
                        )}
                        <th className="px-3 py-2 text-center text-sm font-semibold">Verdict</th>
                        {isFinalRepartition(activeSection.repartition) && (
                          <th className="px-3 py-2 text-center text-sm font-semibold">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {echouesState.loading && echouesState.items.length === 0 ? (
                        <tr>
                          <td colSpan={isFinalRepartition(activeSection.repartition) ? 5 : 3} className="px-3 py-8 text-center">
                            Chargement...
                          </td>
                        </tr>
                      ) : !echouesState.loading && echouesState.items.length === 0 ? (
                        <tr>
                          <td colSpan={isFinalRepartition(activeSection.repartition) ? 5 : 3} className="px-3 py-8 text-center text-gray-500">
                            Aucun
                          </td>
                        </tr>
                      ) : (
                        [...echouesState.items]
                          .sort((a, b) =>
                            (a.eleve_nom + a.eleve_prenom).localeCompare(b.eleve_nom + b.eleve_prenom)
                          )
                          .map((b) => (
                            <tr key={b.id} className="border-t border-gray-200 dark:border-gray-700">
                              <td className="px-3 py-2 text-sm font-semibold">
                                {b.eleve_nom} {b.eleve_prenom}
                              </td>
                              <td className="px-3 py-2 text-sm text-center">
                                {typeof b.moyenne_trimestrielle === "number"
                                  ? b.moyenne_trimestrielle.toFixed(2)
                                  : "—"}
                              </td>
                              {isFinalRepartition(activeSection.repartition) && (
                                <td className="px-3 py-2 text-sm text-center">
                                  {typeof b.moyenne_annuelle === "number"
                                    ? b.moyenne_annuelle.toFixed(2)
                                    : "—"}
                                </td>
                              )}
                              <td className="px-3 py-2 text-sm text-center">{b.verdict}</td>
                              {isFinalRepartition(activeSection.repartition) && (
                                <td className="px-3 py-2 text-sm text-center">
                                  <Button size="small" variant="outlined" onClick={() => setDecisionAdmis(b)} disabled={isReadOnlyYear}>
                                    Admis par décision
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 flex items-center justify-center gap-3">
                <Button
                  variant="outlined"
                  onClick={() => goPrev({ classeId: selectedClasseId, section: activeSection, kind: "echoues" })}
                  disabled={echouesState.loading || echouesState.cursorStack.length <= 1}
                >
                  Précédent
                </Button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Page {echouesState.page}</span>
                <Button
                  variant="outlined"
                  onClick={() => goNext({ classeId: selectedClasseId, section: activeSection, kind: "echoues" })}
                  disabled={echouesState.loading || !echouesState.hasNext}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>

          {(admisState.error || echouesState.error) && (
            <div className="mt-4 text-sm text-red-700 dark:text-red-300">{admisState.error ?? echouesState.error}</div>
          )}
        </>
      )}

      <Dialog open={clotureOpen} onClose={() => (clotureLoading ? null : setClotureOpen(false))} maxWidth="sm" fullWidth>
        <DialogTitle>Clôturer la classe</DialogTitle>
        <DialogContent>
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Tu es sur le point de clôturer la classe <b>{selectedClasse?.libelle_classe ?? ""}</b> pour l’année scolaire{" "}
            <b>{anneeScolaireActive ? formatAnneeScolaire(anneeScolaireActive) : "—"}</b>.
          </div>

          <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
            Cette action va :
            <ul className="list-disc ml-5 mt-2">
              <li>Envoyer les <b>Admis</b> / <b>Admis par décision</b> dans la classe suivante.</li>
              <li>Laisser les <b>Échoués</b> dans la même classe (ils deviennent anciens).</li>
              <li>Créer les <b>inscriptions</b> pour l’année suivante.</li>
            </ul>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClotureOpen(false)} disabled={clotureLoading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDoCloture}
            disabled={clotureLoading || !canCloturer || isReadOnlyYear}
            title={isReadOnlyYear ? "Historique: clôture désactivée" : ""}
          >
            {clotureLoading ? "Clôture..." : "Confirmer la clôture"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}