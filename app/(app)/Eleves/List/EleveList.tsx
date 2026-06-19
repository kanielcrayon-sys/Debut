"use client";
import React, { useState, useEffect } from "react";
import { Button, IconButton, Dialog, DialogTitle, DialogContent } from "@mui/material";
import {
  MdEdit,
  MdDelete,
  MdAdd,
  MdInfo,
  MdRestore,
  MdDeleteForever,
  MdArrowBack,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";
import EleveModal from "@/app/src/components/modals/EleveModal";
import SchoolInfoModal from "@/app/src/components/modals/schoolInfoModal";
import { Eleve, Classe, CreateEleveInput, UpdateEleveInput } from "@/app/src/interface/data";
import { useEleves } from "@/app/src/context/eleveContext";
import { useClasses } from "@/app/src/context/classeContext";
import { useSchoolInfo } from "@/app/src/context/schoolContext";
import { useSyncEleveClasses } from "@/app/src/hooks/useSyncEleveClasses";
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/app/src/lib/firebase-client";
import { useRoleGuard } from "@/app/src/hooks/useRoleGuard";
import { anneeScolaireStartFromDate } from "@/app/src/lib/scolarite";

type Inscription = {
  id: string;
  id_classe: string;
  eleve_id: string;
  statut: string;
  annee_scolaire: number;
  anciennete?: "nouveau" | "ancien";
  date_suppression?: string;
  // + autres si besoin
};



type EleveLigne = Eleve & {
  id_inscription: string;
  id_classe: string;
  annee_scolaire?: number;
};
export default function EleveList() {

  const { loading: loadingRole } = useRoleGuard(["admin"]);
  const { eleves, loading, error, createEleve, updateEleve, deleteEleve, refreshEleves } = useEleves();
  const { classes } = useClasses();
  const { schoolInfo } = useSchoolInfo();
  //
  const [inscriptionsClasse, setInscriptionsClasse] = useState<Inscription[]>([]);
  const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
  // ✅ ÉTATS
  const [selectedClasseId, setSelectedClasseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [classesStats, setClassesStats] = useState<{ [key: string]: { total: number; boys: number; girls: number } }>(
    {}
  );
  const [elevesList, setElevesList] = useState<EleveLigne[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<EleveLigne[]>([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false,
    cursors: { first: null as string | null, last: null as string | null },
  });

  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]); // stack de "after"
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [classStats, setClassStats] = useState({ boys: 0, girls: 0, total: 0 });
  const [loadingEleves, setLoadingEleves] = useState(false);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [pendingClassName, setPendingClassName] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"classList" | "gradeSheet" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedEleveForInfo, setSelectedEleveForInfo] = useState<Eleve | null>(null);
 const { anneeScolaire, setAnneeScolaire } = useSchoolInfo();
const [trashedElevesClasse, setTrashedElevesClasse] = useState<EleveLigne[]>([]);
  const getCurrentAfterCursor = () => cursorStack[cursorStack.length - 1] ?? null;

  useSyncEleveClasses();

  // ===== PATCH STATUT INSCRIPTIONS (temporaire !)
  useEffect(() => {
  if (!selectedClasseId || !anneeScolaire) {
    setInscriptionsClasse([]);
    return;
  }
  getDocs(query(
    collection(db, "inscriptions"),
    where("id_classe", "==", selectedClasseId),
    where("annee_scolaire", "==", anneeScolaire)
  )).then((snap) => {
    setInscriptionsClasse(
      snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Inscription, "id">) }))
    );
  });
}, [selectedClasseId, anneeScolaire]);
 //trash
 useEffect(() => {
  if (!selectedClasseId) return;
  const fetchTrashed = async () => {
    const inscSnap = await getDocs(query(
      collection(db, "inscriptions"),
      where("annee_scolaire", "==", anneeScolaire),
      where("id_classe", "==", selectedClasseId),
      where("statut", "==", "abandonné")
    ));
    const eleveIds = inscSnap.docs.map(doc => doc.data().eleve_id);
    let elevesArray: EleveLigne[] = [];
    if (eleveIds.length > 0) {
      for (let i = 0; i < eleveIds.length; i += 10) {
        const chunk = eleveIds.slice(i, i + 10);
        const snap = await getDocs(query(
          collection(db, "eleves"),
          where('__name__', 'in', chunk)
        ));
        elevesArray.push(...snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }) as EleveLigne));
      }
    }
    elevesArray = elevesArray.filter(eleve => eleve && eleve.identite && eleve.identite.nom_individu);
    setTrashedElevesClasse(elevesArray);
  };
  fetchTrashed();
}, [selectedClasseId, anneeScolaire, showTrash]); 

  // ✅ CALCULER STATS CLASSES VIA FIREBASE
// Remplace ton useEffect calcul stats classes par : // Vérifie le bon chemin

const fetchClassStats = async () => {
  try {
    const inscSnap = await getDocs(query(
      collection(db, "inscriptions"),
      where("annee_scolaire", "==", anneeScolaire)
    ));
    const stats: Record<string, { total: number; boys: number; girls: number }> = {};
    const eleveIdToClasse: Record<string, string> = {};

    inscSnap.forEach(doc => {
      const data = doc.data();
      // NE GARDE QUE les actifs :
      if (data.statut !== "actif") return;
      // PATCH: toujours clé string.trim, pour match parfait avec classe.id
      const classeKey = String(data.id_classe).trim();
      if (!classeKey || !data.eleve_id) return;
      if (!stats[classeKey]) stats[classeKey] = { total: 0, boys: 0, girls: 0 };
      stats[classeKey].total += 1;
      eleveIdToClasse[data.eleve_id] = classeKey;
    });

    const eleveIds = Object.keys(eleveIdToClasse);
    const elevesData: Record<string, Eleve> = {};
    if (eleveIds.length > 0) {
      for (let i = 0; i < eleveIds.length; i += 10) {
        const chunk = eleveIds.slice(i, i + 10);
        const snap = await getDocs(query(
          collection(db, "eleves"),
          where('__name__', 'in', chunk)
        ));
        snap.forEach(d => {
          elevesData[d.id] = { ...(d.data() as Eleve), id: d.id };
        });
      }
      Object.entries(eleveIdToClasse).forEach(([eleveId, classeKey]) => {
        const eleve = elevesData[eleveId];
        if (!eleve) return;
        if (eleve.identite?.sexe === "M") stats[classeKey].boys += 1;
        if (eleve.identite?.sexe === "F") stats[classeKey].girls += 1;
      });
    }

    setClassesStats(stats);

    // DEBUG pour t’assurer que les clés sont alignées (supprime si inutile)
    console.log("CLASSES KEYS:", classes.map(c => c.id));
    console.log("STATS KEYS:", Object.keys(stats));
    console.log("STATS OBJ:", stats);
  } catch (e) {
    console.error("Erreur calcul effectifs via inscriptions+eleves", e);
  }
};
useEffect(() => {


  fetchClassStats();
}, [anneeScolaire]);

  // ✅ RECHERCHE GLOBALE FIREBASE
 useEffect(() => {
  const performGlobalSearch = async () => {
    try {
      if (globalSearchTerm.trim() === "" || !anneeScolaire) {
        setGlobalSearchResults([]);
        return;
      }

      setLoadingGlobalSearch(true);

      // 1. Cherche toutes les inscriptions pour l'année courante
      const inscSnap = await getDocs(query(
        collection(db, "inscriptions"),
        where("annee_scolaire", "==", anneeScolaire)
      ));

      const eleveIdsSet = new Set<string>();
      inscSnap.forEach(doc => {
        const data = doc.data();
        if (data.eleve_id) eleveIdsSet.add(data.eleve_id as string);
      });
      const eleveIds = Array.from(eleveIdsSet);

      // 2. Charge les élèves concernés, par chunk de 10 (Firestore limitation)
      const allEleves: EleveLigne[] = [];
      for (let i = 0; i < eleveIds.length; i += 10) {
        const chunk = eleveIds.slice(i, i + 10);
        const snap = await getDocs(query(
          collection(db, "eleves"),
          where('__name__', 'in', chunk)
        ));
        allEleves.push(
          ...snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }) as EleveLigne)
        );
      }

      // 3. Filtre prénom/nom (ignore la casse, contient)
      const filtered = allEleves.filter((eleve) =>
        `${eleve.identite?.nom_individu || ''} ${eleve.identite?.prenom_individu || ''}`.toLowerCase().includes(globalSearchTerm.toLowerCase())
      );

      setGlobalSearchResults(filtered);

    } catch (error) {
      console.error("Erreur recherche globale filtrée année:", error);
      setGlobalSearchResults([]);
    } finally {
      setLoadingGlobalSearch(false);
    }
  };

  performGlobalSearch();
}, [globalSearchTerm, anneeScolaire]);

  // ✅ CHARGER ÉLÈVES CLASSE (API cursor + search)
  const loadClassEleves = async (classeId: string, after: string | null = null, search: string = "") => {
    try {
      setLoadingEleves(true);
      setErrorState(null);
console.log("[DEBUG] loadClassEleves appelée pour classeId =", classeId);
      const url = new URL(`/api/eleves/classe/${classeId}`, window.location.origin);
      url.searchParams.set("limit", "10");
      if (after) url.searchParams.set("after", after);
      const normalizedSearch = search.trim().toUpperCase();
      if (normalizedSearch) url.searchParams.set("search", normalizedSearch);
url.searchParams.set("annee_scolaire", String(anneeScolaire));
      const response = await fetch(url.toString());
     if (!response.ok) {
  const text = await response.text().catch(() => "");
  throw new Error(`Erreur API ${response.status}: ${text}`);
}

      const data = await response.json();
      console.log("[DEBUG] data.data reçu après fetch =", data.data);

      setElevesList(data.data || []);
      setClassStats(data.stats);

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
    } catch (err) {
      console.error("❌ Erreur chargement élèves:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoadingEleves(false);
    }
  };

  // ✅ RECHERCHE PAR CLASSE (via API) + debounce + reset stack
  useEffect(() => {
    if (!selectedClasseId) return;

    const timer = setTimeout(() => {
      setCursorStack([null]);
      setCurrentPage(1);
      loadClassEleves(selectedClasseId, null, classSearchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [classSearchTerm, selectedClasseId]);
//

    useEffect(() => {
      const fetchAnnees = async () => {
        try {
          const snap = await getDocs(collection(db, "inscriptions"));
          const anneesSet = new Set<number>();
          snap.forEach(doc => {
            const data = doc.data();
            if (typeof data.annee_scolaire === "number") {
              anneesSet.add(data.annee_scolaire);
            }
          });
          // Trie du plus récent au plus ancien
          const anneesSorted = Array.from(anneesSet).sort((a, b) => b - a);
          setAnneesDisponibles(anneesSorted);
          // Positionne l’année sélectionnée à la plus récente si besoin
          if (anneesSorted.length > 0) setAnneeScolaire(anneesSorted[0]);
        } catch (e) {
          console.error("Erreur chargement années Firestore :", e);
        }
      };
      fetchAnnees();
    }, []);
  //userRoleGuard
  if (loadingRole) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement des droits...</p>
      </div>
    );
  }

  // ✅ ACCÉDER ÉLÈVE DEPUIS RECHERCHE GLOBALE
  const handleAccessEleveFromSearch = async (eleve: Eleve) => {
    if (eleve.id_classe) {
      setClassSearchTerm("");
      setCursorStack([null]);
      setCurrentPage(1);
      await loadClassEleves(eleve.id_classe, null, "");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  //  RETOUR À LISTE CLASSES
  const handleBackToClasses = () => {
    setSelectedClasseId(null);
    setCurrentPage(1);
    setElevesList([]);
    setClassSearchTerm("");
    setErrorState(null);
    setGlobalSearchTerm("");
    setCursorStack([null]);
  };

  // PAGINATION
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

  //  AJOUTER ÉLÈVE
  const handleAddEleve = () => {
    setSelectedEleve(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  // ✅ ÉDITER ÉLÈVE
  const handleEditEleve = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setIsEditing(true);
    setModalOpen(true);
  };

  // ✅ AFFICHER INFOS
  const handleShowInfo = (eleve: Eleve) => {
    setSelectedEleveForInfo(eleve);
    setInfoDialogOpen(true);
  };

  // ✅ SAUVEGARDER ÉLÈVE
// Adapte ce chemin si besoin
// adapte le chemin si besoin
// adapte chemin si besoin

const handleSaveEleve = async (data: CreateEleveInput | UpdateEleveInput) => {
  try {
    setErrorState(null);
    let newData = data;

    if (!isEditing) {
      // Calcule l'année scolaire
      const anneeScolaire = anneeScolaireStartFromDate(new Date());
      newData = { ...data, annee_scolaire: anneeScolaire };
      // CRÉATION dans le back (élève + inscription)
      console.log("🚀 Payload CRÉATION envoyé à l'API:", newData);
      await createEleve(newData as CreateEleveInput & { annee_scolaire: number });
        await fetchClassStats();
      // 🔥 Correction : on recharge directement la classe (côté API moderne)
      if (selectedClasseId) {
        // Tu peux attendre 400ms si Firestore est lent à la propager
        await new Promise((resolve) => setTimeout(resolve, 400));
        await loadClassEleves(selectedClasseId, null, "");
      }
    }else if (isEditing && selectedEleve) {
  // Utilise toujours la variable locale actuelle !
        const dataAvecAnnee = { ...data, annee_scolaire: anneeScolaire };

        console.log("✏️ Payload ÉDITION envoyé à l'API:", dataAvecAnnee, selectedEleve.id);

        await updateEleve(
          selectedEleve.id,
          dataAvecAnnee as UpdateEleveInput & { annee_scolaire: number }
        );

        if (selectedClasseId) {
          await loadClassEleves(selectedClasseId, getCurrentAfterCursor(), classSearchTerm);
        }
      }
    setModalOpen(false);
  } catch (err) {
    console.error("❌ Erreur sauvegarde élève:", err);
    setErrorState(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
  }
};

  // ✅ SUPPRIMER ÉLÈVE
 const handleDeleteEleve = async (id: string) => {
  if (confirm("Êtes-vous sûr de vouloir abandonner cet élève pour l'année scolaire affichée ?")) {
    try {
      setErrorState(null);
      // Marque la fiche élève comme abandonné pour indication globale
      await updateEleve(id, {
        // ...garde tous tes champs ici
        statut_eleve: "abandonné",
        date_suppression: new Date().toISOString().split("T")[0],
      } as UpdateEleveInput);

      // Mets à jour l'inscription de L'ÉLÈVE pour L'ANNÉE COURANTE
      const q = query(
        collection(db, "inscriptions"),
        where("annee_scolaire", "==", anneeScolaire),
        where("eleve_id", "==", id)
      );
      const snap = await getDocs(q);
      for (const inscDoc of snap.docs) {
        await updateDoc(inscDoc.ref, {
          statut: "abandonné",
          date_suppression: new Date().toISOString().split("T")[0],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await fetchClassStats(); 
      if (selectedClasseId) {
        await loadClassEleves(selectedClasseId, getCurrentAfterCursor(), classSearchTerm);
      } else {
        await refreshEleves();
      }
    } catch (err) {
      console.error("❌ Erreur suppression élève:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }
};

  // ✅ RESTAURER ÉLÈVE
 const handleRestoreEleve = async (id: string) => {
  if (confirm("Êtes-vous sûr de vouloir restaurer cet élève pour l'année scolaire affichée ?")) {
    try {
      setErrorState(null);

      await updateEleve(id, {
        // ... tes champs ici
        statut_eleve: "actif",
        date_suppression: "",
      } as UpdateEleveInput);

      // Mets à jour l'inscription de L'ÉLÈVE pour L'ANNÉE COURANTE
      const q = query(
        collection(db, "inscriptions"),
        where("annee_scolaire", "==", anneeScolaire),
        where("eleve_id", "==", id)
      );
      const snap = await getDocs(q);
      for (const inscDoc of snap.docs) {
        await updateDoc(inscDoc.ref, {
          statut: "actif",
          date_suppression: "",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshEleves();
      await fetchClassStats();
      if (selectedClasseId) {
        await loadClassEleves(selectedClasseId, getCurrentAfterCursor(), classSearchTerm);
      }

      setShowTrash(false);
    } catch (err) {
      console.error("❌ Erreur restauration élève:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors de la restauration");
    }
  }
};

  // ✅ SUPPRIMER DÉFINITIVEMENT
const handlePermanentDelete = async (id: string) => {
  if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet élève de toutes les années ? Cette action est irréversible!")) {
    try {
      setErrorState(null);

      // 1. Supprime toutes les inscriptions de l'élève (toutes années)
      const snap = await getDocs(query(
        collection(db, "inscriptions"),
        where("eleve_id", "==", id)
      ));
      for (const inscDoc of snap.docs) {
        await deleteDoc(inscDoc.ref);
      }

      // 2. Supprime la fiche élève elle-même
      await deleteEleve(id);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshEleves();
      await fetchClassStats();
      if (selectedClasseId) {
        await loadClassEleves(selectedClasseId, getCurrentAfterCursor(), classSearchTerm);
      }
    } catch (err) {
      console.error("❌ Erreur suppression définitive:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors de la suppression définitive");
    }
  }
};

  // ✅ GÉNÉRER PDF LISTE DE CLASSE
  const generateClassListPDF = async (classNamePDF: string) => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const classEleves = elevesList;
    if (!classEleves || classEleves.length === 0) return;

    const calculateAge = (dateNaissance: string) => {
      const today = new Date();
      const birthDate = new Date(dateNaissance);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const elevePerPage = 18;
    const totalPages = Math.ceil(classEleves.length / elevePerPage);
    const pdf = new jsPDF("p", "mm", "a4");

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      const startIdx = pageNum * elevePerPage;
      const endIdx = Math.min(startIdx + elevePerPage, classEleves.length);
      const pageEleves = classEleves.slice(startIdx, endIdx);

      const element = document.createElement("div");
      element.style.padding = "15px";
      element.style.backgroundColor = "white";
      element.style.width = "210mm";
      element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
          <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
            ${
              schoolInfo.logoUrl
                ? `<img src="${schoolInfo.logoUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">`
                : '<div style="width: 60px; height: 60px;"></div>'
            }
          </div>
          <div style="text-align: right; font-size: 13px; flex: 1; margin-left: 15px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${schoolInfo.schoolName}</h2>
            <p style="margin: 3px 0; color: #333;">Tél: ${schoolInfo.phoneNumber}</p>
            <p style="margin: 3px 0; color: #333;">Année: ${schoolInfo.academicYear}</p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px;">
          <h1 style="margin: 0 0 5px 0; font-size: 20px; font-weight: bold;">LISTE DE CLASSE</h1>
          <p style="margin: 3px 0; font-size: 14px;"><strong>Classe:</strong> ${classNamePDF}</p>
          <p style="margin: 3px 0; font-size: 12px;">Effectif total: ${classEleves.length} | Page ${pageNum + 1}/${totalPages}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #e0e0e0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 35px; font-weight: bold; font-size: 13px;">N°</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; font-size: 13px;">Nom & Prénom</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px; font-weight: bold; font-size: 13px;">Sexe</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px; font-weight: bold; font-size: 13px;">Âge</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 60px; font-weight: bold; font-size: 13px;">Observations</th>
            </tr>
          </thead>
         <tbody>
            ${pageEleves
              .map(
                (eleve, index) => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 7px; text-align: center; font-size: 13px;">
                      ${startIdx + index + 1}
                    </td>
                    <td style="border: 1px solid #000; padding: 7px; font-weight: bold; font-size: 13px;">
                      <strong>
                        ${eleve.identite?.nom_individu || "N/A"} ${eleve.identite?.prenom_individu || ""}
                      </strong>
                    </td>
                    <td style="border: 1px solid #000; padding: 7px; text-align: center; font-size: 13px;">
                      ${
                        eleve.identite?.sexe === "M" 
                          ? "M" 
                          : eleve.identite?.sexe === "F"
                            ? "F"
                            : "?"
                      }
                    </td>
                    <td style="border: 1px solid #000; padding: 7px; text-align: center; font-size: 13px;">
                      ${
                        eleve.identite?.date_naissance 
                          ? calculateAge(eleve.identite.date_naissance)
                          : "?"
                      }
                    </td>
                    <td style="border: 1px solid #000; padding: 7px; height: 40px; font-size: 13px;">
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `;

      document.body.appendChild(element);

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } finally {
        document.body.removeChild(element);
      }
    }

    pdf.save(`liste-classe-${classNamePDF}-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ✅ GÉNÉRER PDF FICHE DE NOTES
  const generateGradeSheetPDF = async (classNamePDF: string, trimestre: string) => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const classEleves = elevesList;
    if (!classEleves || classEleves.length === 0) return;

    const elevePerPage = 12;
    const totalPages = Math.ceil(classEleves.length / elevePerPage);
    const pdf = new jsPDF("l", "mm", "a4");

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      const startIdx = pageNum * elevePerPage;
      const endIdx = Math.min(startIdx + elevePerPage, classEleves.length);
      const pageEleves = classEleves.slice(startIdx, endIdx);

      const element = document.createElement("div");
      element.style.padding = "15px";
      element.style.backgroundColor = "white";
      element.style.width = "297mm";
      element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
            ${
              schoolInfo.logoUrl
                ? `<img src="${schoolInfo.logoUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">`
                : '<div style="width: 60px; height: 60px;"></div>'
            }
          </div>
          <div style="text-align: right; font-size: 12px; flex: 1; margin-left: 15px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: bold;">${schoolInfo.schoolName}</h2>
            <p style="margin: 2px 0; color: #333;">Tél: ${schoolInfo.phoneNumber}</p>
            <p style="margin: 2px 0; color: #333;">Année: ${schoolInfo.academicYear}</p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px;">
          <h1 style="margin: 0 0 3px 0; font-size: 18px; font-weight: bold;">FICHE DE NOTES</h1>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Matière: ..........................................................................................................</strong></p>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Professeur: .......................................................................................................</strong></p>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Classe:</strong> ${classNamePDF} | <strong>Effectif:</strong> ${classEleves.length} | <strong>Trimestre:</strong> ${trimestre} | <strong>Page:</strong> ${pageNum + 1}/${totalPages}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #e0e0e0;">
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 25px; font-weight: bold; font-size: 12px;">N°</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: left; width: 120px; font-weight: bold; font-size: 12px;">Nom & Prénom</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 28px; font-weight: bold; font-size: 12px;">Sexe</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 28px; font-weight: bold; font-size: 12px;">I1</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 28px; font-weight: bold; font-size: 12px;">I2</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 28px; font-weight: bold; font-size: 12px;">I3</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 28px; font-weight: bold; font-size: 12px;">I4</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 32px; font-weight: bold; font-size: 12px;">Devoir</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 35px; font-weight: bold; font-size: 12px;">Composition</th>
              <th style="border: 1px solid #000; padding: 7px; text-align: center; width: 32px; font-weight: bold; font-size: 12px;">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            ${pageEleves
              .map(
                (eleve, index) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">
                    ${startIdx + index + 1}
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 12px;">
                    <strong>${eleve.identite?.nom_individu || "N/A"} ${eleve.identite?.prenom_individu || ""}</strong>
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">
                    ${
                      eleve.identite?.sexe === "M"
                        ? "M"
                        : eleve.identite?.sexe === "F"
                          ? "F"
                          : "?"
                    }
                  </td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; height: 30px; font-size: 12px;"></td>
                </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `;

      document.body.appendChild(element);

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } finally {
        document.body.removeChild(element);
      }
    }

    pdf.save(`fiche-notes-${classNamePDF}-${trimestre}-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ✅ HANDLERS PDF
  const handleGenerateClassListPDF = (classNamePDF: string) => {
    setPendingClassName(classNamePDF);
    setPendingAction("classList");
    setSchoolModalOpen(true);
  };

  const handleGenerateGradeSheetPDF = (classNamePDF: string) => {
    setPendingClassName(classNamePDF);
    setPendingAction("gradeSheet");
    setSchoolModalOpen(true);
  };

  const handleSchoolModalConfirm = async (trimestre?: string) => {
    if (pendingClassName) {
      if (pendingAction === "classList") {
        await generateClassListPDF(pendingClassName);
      } else if (pendingAction === "gradeSheet") {
        await generateGradeSheetPDF(pendingClassName, trimestre || "1er trimestre");
      }
    }
    setSchoolModalOpen(false);
    setPendingClassName(null);
    setPendingAction(null);
  };

  // ✅ LOADING/ERROR
  if (loading) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-red-500">Erreur: {error}</p>
      </div>
    );
  }

  // ========== VUE 1: LISTE CLASSES ==========
  if (!selectedClasseId) {
    const trashedEleves = eleves.filter((e) => e.statut_eleve === "abandonné" || e.statut_eleve === "suspendu");
 const allClassesWithStats = classes.map((classe) => ({
  ...classe,
  stats: classesStats[String(classe.id).trim()] || { total: 0, boys: 0, girls: 0 }
}));
console.log("CLASSES 🚦", classes);
console.log("CLASSES STATS 🚦", classesStats);
    return (
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Gestion des Élèves</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {showTrash
                ? `Corbeille: ${trashedEleves.length}`
                : `Total: ${Object.values(classesStats).reduce((sum, c) => sum + c.total, 0)}`}{" "}
              élève(s)
            </p>
          </div>

          <div className="flex gap-2">
           

            <Button onClick={handleAddEleve} variant="contained" className="!bg-blue-600 !text-white !flex !gap-2" startIcon={<MdAdd size={20} />}>
              Ajouter Élève
            </Button>
          </div>
        </div>
      {/*selecteur */} 
        <div style={{ marginBottom: 24 }}>
          <label>Année scolaire : </label>
          <select
            value={anneeScolaire}
            onChange={e => setAnneeScolaire(Number(e.target.value))}
            style={{
              marginLeft: 8,
              padding: 6,
              borderRadius: 4,
              border: '1px solid #ccc',
              minWidth: 130,
            }}
            disabled={anneesDisponibles.length === 0}
          >
            {anneesDisponibles.map(annee => (
              <option key={annee} value={annee}>
                {annee}-{annee + 1}
              </option>
            ))}
          </select>
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

        {errorState && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">{errorState}</div>
        )}

        {/* Résultats recherche globale */}
        {globalSearchTerm.trim() !== "" && (
          <div className="mb-8">
            <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-blue-900 dark:text-blue-100 font-semibold">{loadingGlobalSearch ? "Recherche..." : `${globalSearchResults.length} résultat(s)`}</p>
            </div>

            {!loadingGlobalSearch && globalSearchResults.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-200 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nom & Prénom</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Classe</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Sexe</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">En Règle</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.map((eleve) => {
                        const classe = classes.find((c) => c.id === eleve.id_classe);
                        return (
                          <tr key={eleve.id} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                              {eleve.identite?.nom_individu || <i className="text-sm text-red-500">[incomplet]</i>} {eleve.identite?.prenom_individu || ""}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                              <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">{classe?.libelle_classe}</span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                              <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                  {eleve.identite?.sexe === "M"
                                    ? "M"
                                    : eleve.identite?.sexe === "F"
                                      ? "F"
                                      : "?"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                              <span
                                className={`px-3 py-1 rounded-full ${
                                  eleve.en_regle
                                    ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                                }`}
                              >
                                {eleve.en_regle ? "Oui" : "Non"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                              <Button onClick={() => handleAccessEleveFromSearch(eleve)} variant="outlined" size="small" className="!text-blue-600 !border-blue-600">
                                Accéder
                              </Button>
                              <IconButton onClick={() => handleShowInfo(eleve)} className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900" size="small">
                                <MdInfo size={18} />
                              </IconButton>
                              <IconButton onClick={() => handleEditEleve(eleve)} className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900" size="small">
                                <MdEdit size={18} />
                              </IconButton>
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
            
            {allClassesWithStats.map((classe) => {
  const stats = classe.stats;
  console.log(
  "------ CLASSES LIST ------",
  classes.map(c => `${c.libelle_classe} : "${String(c.id)}"`)
);
console.log(
  "------ KEYS classesStats ------",
  Object.keys(classesStats)
);
console.log(
  "------ OBJ classesStats ------", 
  classesStats
);
  return (
    <div
      key={classe.id}
      onClick={async () => {
        setClassSearchTerm("");
        setCursorStack([null]);
        setCurrentPage(1);
        await loadClassEleves(classe.id, null, "");
      }}
      className="flex-shrink-0 w-56 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition transform hover:scale-105"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{classe.libelle_classe}</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Effectif:</span>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">👦 Garçons:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.boys}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">👩 Filles:</span>
          <span className="font-semibold text-pink-600 dark:text-pink-400">{stats.girls}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Cliquez pour voir les détails</p>
      </div>
    </div>
  );
})}
          </div>
        </div>

        {allClassesWithStats.length === 0 && globalSearchTerm.trim() === "" && (
  <div className="text-center py-12 text-gray-500 dark:text-gray-400">Aucune classe trouvée</div>
)}

        <EleveModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveEleve} eleve={selectedEleve} isEditing={isEditing} classes={classes} />

        {showTrash && trashedEleves.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-red-300 dark:border-red-700">
            <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">🗑️ Corbeille ({trashedEleves.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-red-100 dark:bg-red-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">Nom & Prénom</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Classe</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Sexe</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Statut</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">{`Date d'Abandon`}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashedEleves.map((eleve) => {
                    const classe = classes.find((c) => c.id === eleve.id_classe);
                    return (
                      <tr key={eleve.id} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {eleve.identite?.nom_individu || <i className="text-sm text-red-500">[incomplet]</i>} {eleve.identite?.prenom_individu || ""}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">{classe?.libelle_classe}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                         <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                  {eleve.identite?.sexe === "M"
                                    ? "M"
                                    : eleve.identite?.sexe === "F"
                                      ? "F"
                                      : "?"}
                                </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span
                            className={`px-3 py-1 rounded-full ${
                              eleve.statut_eleve === "abandonné"
                                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                                : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}
                          >
                            {eleve.statut_eleve.charAt(0).toUpperCase() + eleve.statut_eleve.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          {eleve.date_suppression ? new Date(eleve.date_suppression).toLocaleDateString("fr-FR") : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                          <IconButton onClick={() => handleShowInfo(eleve)} className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900" size="small">
                            <MdInfo size={18} />
                          </IconButton>
                          <IconButton onClick={() => handleRestoreEleve(eleve.id)} className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900" size="small">
                            <MdRestore size={18} />
                          </IconButton>
                          <IconButton onClick={() => handlePermanentDelete(eleve.id)} className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900" size="small">
                            <MdDeleteForever size={18} />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="dark:bg-gray-800 dark:text-white">Informations Supplémentaires</DialogTitle>
          <DialogContent className="dark:bg-gray-800 mt-4">
            {selectedEleveForInfo && (
              <div className="flex flex-col gap-3">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">{`Date de Naissance:`}</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {new Date(selectedEleveForInfo.identite.date_naissance).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Sexe:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {selectedEleveForInfo.identite.sexe === "M" ? "Masculin" : "Féminin"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Email:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.email}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Contact:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.contact}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Nationalité:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.nationalite}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Ville:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.ville}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                  <span className="font-semibold text-gray-900 dark:text-white">{`Nom du Tuteur:`}</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.nom_tuteur}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">{`Profession du Tuteur:`}</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.profession_tuteur}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">{`Contact du Tuteur:`}</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.contact_tuteur}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                  <span className="font-semibold text-gray-900 dark:text-white">{`Date d'Inscription:`}</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {new Date(selectedEleveForInfo.date_premier_inscription).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">GBEVOU:</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.gbevou ? "Oui" : "Non"}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ========== VUE 2: DÉTAIL CLASSE ==========
  const selectedClasse = classes.find((c) => c.id === selectedClasseId);

  // Liste des élèves abandonnés/suspendus pour cette classe


  return (
    <div className="w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={handleBackToClasses} variant="outlined" startIcon={<MdArrowBack size={20} />} className="!text-blue-600 !border-blue-600">
            Retour aux classes
          </Button>

          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">{selectedClasse?.libelle_classe}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Garçons: {classStats.boys} | Filles: {classStats.girls} | Total: {classStats.total}
            </p>
          </div>
        </div>

        <Button onClick={handleAddEleve} variant="contained" className="!bg-blue-600 !text-white !flex !gap-2" startIcon={<MdAdd size={20} />}>
          Ajouter Élève
        </Button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 flex gap-3 justify-end mb-6 rounded-lg">
        <Button
              onClick={() => setShowTrash((v) => !v)}
              variant={showTrash ? "contained" : "outlined"}
              className={showTrash ? "!bg-red-600 !text-white" : ""}
            >
            🗑️ Corbeille ({trashedElevesClasse.length})
        </Button>
        <Button onClick={() => handleGenerateClassListPDF(selectedClasse?.libelle_classe || "Classe")} variant="contained" className="!bg-green-600 !text-white !flex !gap-2">
          📋 Liste de Classe
        </Button>
        <Button onClick={() => handleGenerateGradeSheetPDF(selectedClasse?.libelle_classe || "Classe")} variant="contained" className="!bg-purple-600 !text-white !flex !gap-2">
          📝 Fiche de Notes
        </Button>
      </div>

      {/* Recherche par classe */}
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
      showTrash ? (
        // --- BLOC CORBEILLE ---
        trashedElevesClasse.length > 0 ? (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-red-300 dark:border-red-700">
            <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white">🗑️ Corbeille — {selectedClasse?.libelle_classe} ({trashedElevesClasse.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-red-100 dark:bg-red-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">Nom & Prénom</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Statut</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Date</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashedElevesClasse.map((eleve) => (
                    <tr key={eleve.id} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {eleve.identite?.nom_individu || <i className="text-sm text-red-500">[incomplet]</i>} {eleve.identite?.prenom_individu || ""}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                        <span className={`px-3 py-1 rounded-full ${
                          eleve.statut_eleve === "abandonné"
                            ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}>
                          {eleve.statut_eleve.charAt(0).toUpperCase() + eleve.statut_eleve.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                        {eleve.date_suppression ? new Date(eleve.date_suppression).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                        <IconButton
                          onClick={() => handleRestoreEleve(eleve.id)}
                          className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                          size="small"
                        >
                          <MdRestore size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handlePermanentDelete(eleve.id)}
                          className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                          size="small"
                        >
                          <MdDeleteForever size={18} />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400">Corbeille vide pour cette classe</div>
        )
      ) : (
        // ---- TABLEAU ÉLÈVES ACTIFS ----
        <>
        {console.log("state elevesList front =", elevesList)}
          <div className="overflow-x-auto shadow-md rounded-lg mb-6">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
            <thead className="bg-gray-200 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">N° - Nom & Prénom</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Sexe</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white"> Statut</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Ancienneté</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">En Règle</th>
                      
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                 <tbody>
                  {elevesList.map((eleve, index) => {
                    // Lookup de l'inscription pour trouver l'ancienneté
                    const inscription = inscriptionsClasse.find(insc => insc.eleve_id === eleve.id);
                    const anciennete = inscription?.anciennete ?? "—";
                    return (
                      <tr
                        key={eleve.id}
                        className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          <span className="inline-block mr-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full w-6 h-6 text-center font-bold text-xs leading-6">
                            {(currentPage - 1) * 10 + index + 1}
                          </span>
                          {eleve.identite?.nom_individu || <i className="text-sm text-red-500">[incomplet]</i>} {eleve.identite?.prenom_individu || ""}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {eleve.identite?.sexe === "M"
                              ? "M"
                              : eleve.identite?.sexe === "F"
                                ? "F"
                                : "?"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-green-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {eleve.statut_eleve}
                          </span>
                        </td>

                        {/* ===== COLONNE ANCIENNETE ===== */}
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className={
                            anciennete === "nouveau"
                              ? "px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              : anciennete === "ancien"
                                ? "px-3 py-1 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "px-3 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                          }>
                            {anciennete === "nouveau"
                              ? "Nouveau"
                              : anciennete === "ancien"
                                ? "Ancien"
                                : "—"}
                          </span>
                        </td>
                        {/* ===== FIN COLONNE ANCIENNETE ===== */}

                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span
                            className={`px-3 py-1 rounded-full ${
                              eleve.en_regle
                                ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {eleve.en_regle ? "Oui" : "Non"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                          <IconButton onClick={() => handleShowInfo(eleve)} className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900" size="small">
                            <MdInfo size={18} />
                          </IconButton>
                          <IconButton onClick={() => handleEditEleve(eleve)} className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900" size="small">
                            <MdEdit size={18} />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteEleve(eleve.id)} className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900" size="small">
                            <MdDelete size={18} />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
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
            <Button onClick={handleNextPage} disabled={!pagination.hasNext || loadingEleves} variant="outlined" endIcon={<MdNavigateNext size={20} />}>
              Suivant
            </Button>
          </div>
          {elevesList.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun élève trouvé</div>
          )}
        </>
      )
    )}

      <EleveModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveEleve} eleve={selectedEleve} isEditing={isEditing} classes={classes} />

      <SchoolInfoModal
        open={schoolModalOpen}
        onClose={() => setSchoolModalOpen(false)}
        onConfirm={handleSchoolModalConfirm}
        showTrimesterSelect={pendingAction === "gradeSheet"}
      />

      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="dark:bg-gray-800 dark:text-white">Informations Supplémentaires</DialogTitle>
        <DialogContent className="dark:bg-gray-800 mt-4">
          {selectedEleveForInfo && (
            <div className="flex flex-col gap-3">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Date de Naissance:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedEleveForInfo.identite.date_naissance).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Sexe:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.identite.sexe === "M" ? "Masculin" : "Féminin"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Email:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.email}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Contact:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.contact}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Nationalité:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.nationalite}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Ville:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.identite.ville}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                <span className="font-semibold text-gray-900 dark:text-white">{`Nom du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.nom_tuteur}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Profession du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.profession_tuteur}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Contact du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.contact_tuteur}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                <span className="font-semibold text-gray-900 dark:text-white">{`Date d'Inscription:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedEleveForInfo.date_premier_inscription).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">GBEVOU:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">{selectedEleveForInfo.gbevou ? "Oui" : "Non"}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}