"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Button, IconButton } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdLibraryAdd, MdRestore, MdDeleteForever } from "react-icons/md";
import ClasseModal from "@/app/src/components/modals/ClasseModal";
import AjouterMatieresModal from "@/app/src/components/modals/AjouterMatieresModal";
import { Classe, CreateClasseInput, UpdateClasseInput } from "@/app/src/interface/data";
import { useClasses } from "@/app/src/context/classeContext";
import { useEleves } from "@/app/src/context/eleveContext";
import { useProfesseurs } from "@/app/src/context/professeurContext";
import { useSyncEleveClasses } from "@/app/src/hooks/useSyncEleveClasses";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/app/src/lib/firebase-client";
import { useRoleGuard } from "@/app/src/hooks/useRoleGuard";

  type Inscription = {
    id: string;
    id_classe: string;
    statut: string;
    annee_scolaire?: number;
  };
  interface ClasseWithStats extends Classe {
    nombre_abandons: number;
  }

export default function ClasseList() {
        const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
        const [anneeSelectionnee, setAnneeSelectionnee] = useState<number | null>(null);

            useEffect(() => {
        getDocs(collection(db, "inscriptions")).then((snap) => {
          const anneesSet = new Set<number>();
          snap.forEach((doc) => {
            const data = doc.data() as Inscription;
            const v = data.annee_scolaire;
            if (typeof v === "number" && Number.isFinite(v)) anneesSet.add(v);
          });
          const annees = Array.from(anneesSet).sort((a, b) => b - a);
          setAnneesDisponibles(annees);
          if (annees.length && anneeSelectionnee == null) setAnneeSelectionnee(annees[0]);
        });
      }, []);
        const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
      const [anneeScolaireActive, setAnneeScolaireActive] = useState<number | null>(null);

      // Charge l’année scolaire active une seule fois (optionnel mais recommandé)
      useEffect(() => {
        // Si tu as déjà une API/variable pour l’année active, récupère-la là !
        // Ici, exemple brut :
        fetch("/api/settings/scolarite")
          .then((r) => r.json())
          .then((data) => {
            setAnneeScolaireActive(data?.data?.annee_scolaire_active ?? null);
          })
          .catch(() => setAnneeScolaireActive(null));
      }, []);
  useEffect(() => {
    if (anneeSelectionnee == null) return;
    getDocs(query(
      collection(db, "inscriptions"),
      where("statut", "in", ["actif", "abandonné"]),
      where("annee_scolaire", "==", anneeSelectionnee)
    )).then((snap) => {
            setInscriptions(
        snap.docs
          .map((d) => {
            const data = d.data() as Partial<Inscription>;
            return {
              id: d.id,
              id_classe: data.id_classe ?? "", // ou signale erreur si manquant
              statut: data.statut ?? "",
              annee_scolaire: data.annee_scolaire,
              // ... autres champs si besoin
            };
          })
          // On ne garde QUE les inscriptions complètes (optionnel mais safe)
          .filter((insc) => insc.id_classe && insc.statut)
      );
    });
  }, [anneeSelectionnee]);
      // Charge les inscriptions "actif" de l'année active
     

      //selecteur
      

  const { classes, loading, createClasse, updateClasse, deleteClasse, refreshClasses } = useClasses();
  const { eleves } = useEleves();
  const { professeurs } = useProfesseurs();

  const [modalOpen, setModalOpen] = useState(false);
  const [matieresModalOpen, setMatieresModalOpen] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [filteredClasses, setFilteredClasses] = useState<ClasseWithStats[]>([]);
 const { loading: loadingRole } = useRoleGuard(["admin"]);
  // CLASSES ACTIVES
  const activeClasses = useMemo(() => {
    return classes.filter((c) => !c.statut_classe || c.statut_classe === "actif");
  }, [classes]);

  // CLASSES ABANDONNÉES (CORBEILLE)
  const trashedClasses = useMemo(() => {
    return classes.filter((c) => c.statut_classe === "abandonné" || c.statut_classe === "suspendu");
  }, [classes]);

  const displayedClasses = showTrash ? trashedClasses : activeClasses;

  // STATS AVEC LES ÉLÈVES
          const classesWithStats: ClasseWithStats[] = useMemo(() => {
          return displayedClasses.map((classe) => {
            // ici uniquement les inscriptions "actif"
            const effectif = inscriptions.filter(i => i.id_classe === classe.id).length;
            // Si tu gères les abandons dans inscriptions:
            const abandons = inscriptions.filter(i => i.id_classe === classe.id && i.statut === "abandonné").length;

            return {
              ...classe,
              nombre_eleve: effectif,
              nombre_abandons: abandons,
            };
          });
        }, [displayedClasses, inscriptions]);

  // ✅ DÉCLENCHER LA RECHERCHE QUAND searchTerm CHANGE
  useEffect(() => {
    const performSearch = async () => {
      try {
        if (searchTerm.trim() === "") {
          setFilteredClasses(classesWithStats);
          return;
        }

        const q = query(
          collection(db, "classes"),
          where("libelle_classe", ">=", searchTerm.toLowerCase()),
          where("libelle_classe", "<=", searchTerm.toLowerCase() + "\uf8ff"),
          orderBy("libelle_classe")
        );

        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          nombre_abandons: classesWithStats.find((c) => c.id === docSnap.id)?.nombre_abandons || 0,
        })) as ClasseWithStats[];

        setFilteredClasses(results);
      } catch (error) {
        console.error("Erreur recherche:", error);
        setFilteredClasses(classesWithStats);
      }
    };

    performSearch();
  }, [searchTerm, classesWithStats]);
  //userRoleGuards
  if (loadingRole) {
  return (
    <div className="w-full p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">Chargement des droits...</p>
    </div>
  );
}


  // ✅ RÉCUPÉRER LE NOM DU TITULAIRE DEPUIS LE CONTEXT
  const getTitulaireNom = (id_titulaire?: string | null): string => {
    if (!id_titulaire) return "Non assigné";

    const prof = professeurs.find((p) => p.id === id_titulaire);
    if (prof) {
      return `${prof.identite.prenom_individu} ${prof.identite.nom_individu}`;
    }
    return "Professeur supprimé";
  };

  // ✅ FORMATTER LA CLASSE SUIVANTE
  // - on privilégie le libellé stocké (classe_suivante_libelle)
  // - fallback: lookup dans la liste des classes si on a seulement l'id
  const getClasseSuivanteLabel = (c: Classe): string => {
    if (c.id_classe_suivante === null) return "Terminale";
    if (!c.id_classe_suivante) return "—";
    if (c.classe_suivante_libelle) return c.classe_suivante_libelle;

    const next = classes.find((x) => x.id === c.id_classe_suivante);
    return next?.libelle_classe ?? "Inconnue";
  };

  // ✅ FORMATER LE STATUT (FIX pour undefined)
  const formatStatut = (statut?: string | null): string => {
    if (!statut) return "N/A";
    return statut.charAt(0).toUpperCase() + statut.slice(1);
  };

  // Ouvrir modal pour ajouter
  const handleAddClasse = () => {
    setSelectedClasse(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  // Ouvrir modal pour éditer
  const handleEditClasse = (classe: Classe) => {
    setSelectedClasse(classe);
    setIsEditing(true);
    setModalOpen(true);
  };

  // Ouvrir modal pour ajouter matières
  const handleAddMatieres = (classe: Classe) => {
    setSelectedClasse(classe);
    setMatieresModalOpen(true);
  };

  // ✅ SAUVEGARDER CLASSE AVEC REFRESH
  const handleSaveClasse = async (data: CreateClasseInput | UpdateClasseInput) => {
    try {
      setErrorState(null);

      if (isEditing && selectedClasse) {
        console.log("🔄 Avant updateClasse:", selectedClasse.id);

        // ✅ ENVOYER TOUS LES CHAMPS EXISTANTS + LES NOUVEAUX
        const fullData: UpdateClasseInput = {
          libelle_classe: data.libelle_classe || selectedClasse.libelle_classe,
          id_titulaire:
            (data as UpdateClasseInput).id_titulaire !== undefined
              ? (data as UpdateClasseInput).id_titulaire
              : selectedClasse.id_titulaire,
          scolarite: data.scolarite || selectedClasse.scolarite,
          nombre_eleve: selectedClasse.nombre_eleve,
          id_matieres: selectedClasse.id_matieres,
          matieres: selectedClasse.matieres,
          nombre_matiere: selectedClasse.nombre_matiere,

          // ✅ IMPORTANT: garder / mettre à jour la classe suivante
          id_classe_suivante:
            (data as UpdateClasseInput).id_classe_suivante !== undefined
              ? (data as UpdateClasseInput).id_classe_suivante
              : selectedClasse.id_classe_suivante ?? null,

          classe_suivante_libelle:
            (data as UpdateClasseInput).classe_suivante_libelle !== undefined
              ? (data as UpdateClasseInput).classe_suivante_libelle
              : selectedClasse.classe_suivante_libelle ?? null,
        };

        console.log("📤 Données complètes à envoyer:", fullData);
        await updateClasse(selectedClasse.id, fullData);
        console.log("✅ updateClasse terminé");
      } else {
        console.log("🔄 Avant createClasse");
        await createClasse(data as CreateClasseInput);
        console.log("✅ createClasse terminé");
      }

      // ✅ RAFRAÎCHIR LES CLASSES (TIMING AUGMENTÉ À 1000ms)
      console.log("🔄 Rafraîchissement des classes...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshClasses();
      console.log("✅ Classes rafraîchies");

      setModalOpen(false);
      setSelectedClasse(null);
    } catch (err) {
      console.error("❌ Erreur save:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
  };

  // ✅ SAUVEGARDER MATIÈRES AVEC REFRESH
  const handleSaveMatieres = async (updatedClasse: Classe) => {
    try {
      setErrorState(null);
      console.log("🔄 Avant updateClasse (matières):", updatedClasse.id);

      // ✅ ENVOYER TOUS LES CHAMPS
      const fullData: UpdateClasseInput = {
        libelle_classe: updatedClasse.libelle_classe,
        id_titulaire: updatedClasse.id_titulaire,
        scolarite: updatedClasse.scolarite,
        nombre_eleve: updatedClasse.nombre_eleve,
        id_matieres: updatedClasse.id_matieres,
        matieres: updatedClasse.matieres,
        nombre_matiere: updatedClasse.nombre_matiere,

        // ✅ garder aussi la classe suivante (évite perte)
        id_classe_suivante: updatedClasse.id_classe_suivante ?? null,
        classe_suivante_libelle: updatedClasse.classe_suivante_libelle ?? null,
      };

      console.log("📤 Données complètes matières:", fullData);
      await updateClasse(updatedClasse.id, fullData);
      console.log("✅ updateClasse (matières) terminé");

      // ✅ RAFRAÎCHIR LES CLASSES (TIMING AUGMENTÉ À 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshClasses();
      console.log("✅ Classes rafraîchies après affectation matières");

      setMatieresModalOpen(false);
      setSelectedClasse(null);
    } catch (err) {
      console.error("❌ Erreur affectation matières:", err);
      setErrorState(err instanceof Error ? err.message : "Erreur lors de l'affectation");
    }
  };

  // ✅ SUPPRIMER CLASSE AVEC REFRESH
  const handleDeleteClasse = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir abandonner cette classe?")) {
      try {
        setErrorState(null);
        const classe = classes.find((c) => c.id === id);
        if (classe) {
          await updateClasse(
            id,
            {
              libelle_classe: classe.libelle_classe,
              id_titulaire: classe.id_titulaire,
              scolarite: classe.scolarite,
              nombre_eleve: classe.nombre_eleve,
              id_matieres: classe.id_matieres,
              matieres: classe.matieres,
              nombre_matiere: classe.nombre_matiere,

              // ✅ garder aussi la classe suivante
              id_classe_suivante: classe.id_classe_suivante ?? null,
              classe_suivante_libelle: classe.classe_suivante_libelle ?? null,

              statut_classe: "abandonné",
              date_suppression: new Date().toISOString().split("T")[0],
            } as UpdateClasseInput
          );
        }

        // ✅ RAFRAÎCHIR (TIMING AUGMENTÉ À 1000ms)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refreshClasses();
        console.log("✅ Classes rafraîchies après suppression");
      } catch (err) {
        console.error("❌ Erreur suppression classe:", err);
        setErrorState(err instanceof Error ? err.message : "Erreur lors de la suppression");
      }
    }
  };

  // ✅ RESTAURER CLASSE AVEC REFRESH
  const handleRestoreClasse = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir restaurer cette classe?")) {
      try {
        setErrorState(null);
        const classe = classes.find((c) => c.id === id);
        if (classe) {
          await updateClasse(
            id,
            {
              libelle_classe: classe.libelle_classe,
              id_titulaire: classe.id_titulaire,
              scolarite: classe.scolarite,
              nombre_eleve: classe.nombre_eleve,
              id_matieres: classe.id_matieres,
              matieres: classe.matieres,
              nombre_matiere: classe.nombre_matiere,

              // ✅ garder aussi la classe suivante
              id_classe_suivante: classe.id_classe_suivante ?? null,
              classe_suivante_libelle: classe.classe_suivante_libelle ?? null,

              statut_classe: "actif",
              date_suppression: "",
            } as UpdateClasseInput
          );
        }

        // ✅ RAFRAÎCHIR (TIMING AUGMENTÉ À 1000ms)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refreshClasses();
        console.log("✅ Classes rafraîchies après restauration");

        setShowTrash(false);
      } catch (err) {
        console.error("❌ Erreur restauration classe:", err);
        setErrorState(err instanceof Error ? err.message : "Erreur lors de la restauration");
      }
    }
  };

  // ✅ SUPPRIMER DÉFINITIVEMENT AVEC REFRESH
  const handlePermanentDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cette classe? Cette action est irréversible!")) {
      try {
        setErrorState(null);
        await deleteClasse(id);

        // ✅ RAFRAÎCHIR (TIMING AUGMENTÉ À 1000ms)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await refreshClasses();
        console.log("✅ Classes rafraîchies après suppression définitive");
      } catch (err) {
        console.error("❌ Erreur suppression définitive:", err);
        setErrorState(err instanceof Error ? err.message : "Erreur lors de la suppression définitive");
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement des classes...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">Gestion des Classes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {showTrash ? `Corbeille: ${trashedClasses.length}` : `Total: ${activeClasses.length}`} classe(s)
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span>Année scolaire :</span>
          <select
            value={anneeSelectionnee ?? ""}
            onChange={e => setAnneeSelectionnee(Number(e.target.value))}
            className="border px-2 py-1 rounded"
          >
            {anneesDisponibles.map(y => (
              <option key={y} value={y}>{`${y} - ${y + 1}`}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowTrash(!showTrash)}
            variant={showTrash ? "contained" : "outlined"}
            className={showTrash ? "!bg-red-600 !text-white" : ""}
          >
            🗑️ Corbeille ({trashedClasses.length})
          </Button>

          <Button
            onClick={handleAddClasse}
            variant="contained"
            className="!bg-blue-600 !text-white !flex !gap-2"
            startIcon={<MdAdd size={20} />}
          >
            Ajouter Classe
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une classe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
          dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Erreur */}
      {errorState && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">
          {errorState}
        </div>
      )}

      {/* Tableau des classes */}
      <div className="overflow-x-auto shadow-md rounded-lg mb-8">
        <table className="w-full border-collapse bg-white dark:bg-gray-800">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Classe</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Classe suivante</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Titulaire</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Effectif</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Abandons</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Matières</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Scolarité (FCFA)
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.length > 0 ? (
              filteredClasses.map((classe) => (
                <tr
                  key={classe.id}
                  className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{classe.libelle_classe}</td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                      {getClasseSuivanteLabel(classe)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                      {getTitulaireNom(classe.id_titulaire)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {classe.nombre_eleve || 0}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span
                      className={`px-3 py-1 rounded-full ${
                        classe.nombre_abandons > 0
                          ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                          : "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300"
                      }`}
                    >
                      {classe.nombre_abandons || 0}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {classe.nombre_matiere || 0}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {classe.scolarite ? classe.scolarite.toLocaleString("fr-FR") : "N/A"}
                  </td>

                  <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                    <IconButton
                      onClick={() => handleAddMatieres(classe)}
                      className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                      size="small"
                      title="Ajouter matières"
                    >
                      <MdLibraryAdd size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleEditClasse(classe)}
                      className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900"
                      size="small"
                    >
                      <MdEdit size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClasse(classe.id)}
                      className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                      size="small"
                    >
                      <MdDelete size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  {showTrash ? "Aucune classe en corbeille" : "Aucune classe trouvée"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ CORBEILLE - EN-TÊTE ROUGE SEULEMENT */}
      {trashedClasses.length > 0 && showTrash && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-red-300 dark:border-red-700">
          <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">🗑️ Corbeille ({trashedClasses.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-red-100 dark:bg-red-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">Classe</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">Titulaire</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Statut</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">
                    {`Date d'Abandon`}
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashedClasses.map((classe) => (
                  <tr
                    key={classe.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{classe.libelle_classe}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                        {getTitulaireNom(classe.id_titulaire)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          classe.statut_classe === "abandonné"
                            ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        }`}
                      >
                        {formatStatut(classe.statut_classe)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {classe.date_suppression ? new Date(classe.date_suppression).toLocaleDateString("fr-FR") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                      <IconButton
                        onClick={() => handleRestoreClasse(classe.id)}
                        className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                        size="small"
                      >
                        <MdRestore size={18} />
                      </IconButton>
                      <IconButton
                        onClick={() => handlePermanentDelete(classe.id)}
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
      )}

      {/* Modals */}
      <ClasseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClasse}
        classe={selectedClasse}
        isEditing={isEditing}
      />

      <AjouterMatieresModal
        open={matieresModalOpen}
        onClose={() => setMatieresModalOpen(false)}
        onSave={handleSaveMatieres}
        classe={selectedClasse}
      />
    </div>
  );
}