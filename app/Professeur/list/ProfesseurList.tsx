"use client"
import React, { useState, useMemo } from "react";
import { Button, IconButton, Dialog, DialogTitle, DialogContent, Chip } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdInfo, MdLibraryAdd, MdRestore, MdDeleteForever } from "react-icons/md";
import ProfesseurModal from "@/app/src/components/modals/ProfesseurModal";
import AffecterMatieresProf from "@/app/src/components/modals/AffecterMatieresProf";
import { Professeur, CreateProfesseurInput, UpdateProfesseurInput } from "@/app/src/interface/data";
import { useProfesseurs } from "@/app/src/context/professeurContext";
import { useClasses } from "@/app/src/context/classeContext";
import { useMatieres } from "@/app/src/context/matiereContext";

interface ProfesseurWithStats extends Professeur {
  is_class_titulaire: boolean;
  classe_titulaire: string | null;
}

export default function ProfesseurList() {
  const { professeurs, loading, createProfesseur, updateProfesseur, deleteProfesseur, restoreProfesseur, permanentDeleteProfesseur, refreshProfesseurs } = useProfesseurs();
  const { classes } = useClasses();
  const { getMatieresByIds, refreshMatieres } = useMatieres();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [affecterMatieresOpen, setAffecterMatieresOpen] = useState(false);
  const [selectedProfesseur, setSelectedProfesseur] = useState<Professeur | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedProfForInfo, setSelectedProfForInfo] = useState<ProfesseurWithStats | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProfs = useMemo(() => {
    const filtered = professeurs.filter((prof) => prof.statut_enseignant === "actif");
    console.log("📊 Actifs recalculés:", filtered.length);
    return filtered;
  }, [professeurs]);

  const trashedProfs = useMemo(() => {
    const filtered = professeurs.filter((prof) => prof.statut_enseignant === "abandonné");
    console.log("🗑️ Corbeille recalculée:", filtered.length);
    return filtered;
  }, [professeurs]);

  const displayedProfs = showTrash ? trashedProfs : activeProfs;

  // ✅ AJOUTER LES STATS (si c'est titulaire d'une classe)
  const profsWithStats: ProfesseurWithStats[] = useMemo(() => {
    return displayedProfs.map((prof) => {
      // ✅ CHERCHER SI LE PROF EST TITULAIRE D'UNE CLASSE ACTIVE
      const classeOuTitulaire = classes.find(
        c => c.id_titulaire === prof.id && (!c.statut_classe || c.statut_classe === "actif")
      );

      return {
        ...prof,
        is_class_titulaire: !!classeOuTitulaire,
        classe_titulaire: classeOuTitulaire?.libelle_classe || null,
      };
    });
  }, [displayedProfs, classes]);

  const filteredProfesseurs = useMemo(
    () => profsWithStats.filter((prof) =>
      `${prof.identite.prenom_individu} ${prof.identite.nom_individu}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    ),
    [profsWithStats, searchTerm]
  );

  const handleAddProfesseur = () => {
    setSelectedProfesseur(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleEditProfesseur = (professeur: Professeur) => {
    setSelectedProfesseur(professeur);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleAffecterMatieres = (professeur: Professeur) => {
    if (professeur.id_matiere && Array.isArray(professeur.id_matiere)) {
      const matiereList = getMatieresByIds(professeur.id_matiere);
      const noms = matiereList.map((m) => m.libelle_matiere);
      
      setSelectedProfesseur({
        ...professeur,
        matieres: noms,
      });
      
      console.log("📚 Matières du prof mises à jour:", noms);
    } else {
      setSelectedProfesseur(professeur);
    }
    
    setAffecterMatieresOpen(true);
  };

  const handleShowInfo = (professeur: ProfesseurWithStats) => {
    setSelectedProfForInfo(professeur);
    setInfoDialogOpen(true);
  };

  const handleSaveProfesseur = async (data: CreateProfesseurInput | UpdateProfesseurInput) => {
    try {
      setError(null);
      if (isEditing && selectedProfesseur) {
        console.log("🔄 Avant updateProfesseur:", selectedProfesseur.id);
        await updateProfesseur(selectedProfesseur.id, data as UpdateProfesseurInput);
        console.log("✅ updateProfesseur terminé");
      } else {
        console.log("🔄 Avant createProfesseur");
        await createProfesseur(data as CreateProfesseurInput);
        console.log("✅ createProfesseur terminé");
      }
      
      // ✅ RAFRAÎCHIR LES PROFESSEURS (TIMING AUGMENTÉ À 1000ms)
      console.log("🔄 Rafraîchissement des professeurs...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshProfesseurs();
      console.log("✅ Professeurs rafraîchis");
      
      setModalOpen(false);
      setSelectedProfesseur(null);
    } catch (err) {
      console.error("❌ Erreur save:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
  };

  const handleSaveAffecterMatieres = async (updatedData: UpdateProfesseurInput) => {
    try {
      setError(null);
      if (selectedProfesseur) {
        console.log("🔄 Avant updateProfesseur:", selectedProfesseur.id);
        console.log("📤 Données à envoyer:", JSON.stringify(updatedData, null, 2));
        
        await updateProfesseur(selectedProfesseur.id, updatedData);
        
        console.log("✅ updateProfesseur terminé");
        
        // ✅ RAFRAÎCHIR LES DEUX CONTEXTS APRÈS MODIFICATION (TIMING AUGMENTÉ À 1000ms)
        console.log("🔄 Rafraîchissement des données...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await refreshMatieres();
        await refreshProfesseurs();
        
        console.log("✅ Données rafraîchies");
      }
      setAffecterMatieresOpen(false);
    } catch (err) {
      console.error("❌ Erreur affectation:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'affectation");
    }
  };

  const handleDeleteProfesseur = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur?")) {
      try {
        setError(null);
        await deleteProfesseur(id);
        
        // ✅ RAFRAÎCHIR LES PROFESSEURS (TIMING AUGMENTÉ À 1000ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshProfesseurs();
        console.log("✅ Professeurs rafraîchis après suppression");
      } catch (err) {
        console.error("❌ Erreur suppression:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      }
    }
  };

  const handleRestoreProfesseur = async (id: string) => {
    try {
      setError(null);
      console.log(`🔄 Restauration professeur: ${id}`);
      await restoreProfesseur(id);
      console.log(`✅ Professeur restauré`);
      
      // ✅ RAFRA��CHIR LES PROFESSEURS (TIMING AUGMENTÉ À 1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshProfesseurs();
      console.log("✅ Professeurs rafraîchis après restauration");
      
      setShowTrash(false);
    } catch (err) {
      console.error("❌ Erreur restauration:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la restauration");
    }
  };

  const handlePermanentDeleteProfesseur = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ce professeur? Cette action est irréversible.")) {
      try {
        setError(null);
        await permanentDeleteProfesseur(id);
        
        // ✅ RAFRAÎCHIR LES PROFESSEURS (TIMING AUGMENTÉ À 1000ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshProfesseurs();
        console.log("✅ Professeurs rafraîchis après suppression définitive");
      } catch (err) {
        console.error("❌ Erreur suppression définitive:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression définitive");
      }
    }
  };

  if (loading) return <div className="p-6 text-center">Chargement...</div>;

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Gestion des Professeurs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {showTrash ? `Corbeille: ${trashedProfs.length}` : `Total: ${activeProfs.length}`} professeur(s)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowTrash(!showTrash)}
            variant={showTrash ? "contained" : "outlined"}
            className={showTrash ? "!bg-red-600 !text-white" : ""}
          >
            🗑️ Corbeille ({trashedProfs.length})
          </Button>

          <Button
            onClick={handleAddProfesseur}
            variant="contained"
            className="!bg-blue-600 !text-white !flex !gap-2"
            startIcon={<MdAdd size={20} />}
          >
            Ajouter Professeur
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un professeur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
          dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Tableau des professeurs */}
      <div className="overflow-x-auto shadow-md rounded-lg mb-8">
        <table className="w-full border-collapse bg-white dark:bg-gray-800">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Nom & Prénom
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Poste
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Sexe
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {`Date d'Embauche`}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Matières
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProfesseurs.length > 0 ? (
              filteredProfesseurs.map((professeur) => (
                <tr
                  key={professeur.id}
                  className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>
                        {professeur.identite.prenom_individu} {professeur.identite.nom_individu}
                      </span>
                      
                      {/* ✅ BADGE TITULAIRE AMÉLIORÉ */}
                      {professeur.is_class_titulaire && (
                        <Chip
                          label={`📚 Titulaire: ${professeur.classe_titulaire}`}
                          size="small"
                          className="!bg-yellow-200 !text-yellow-800 dark:!bg-yellow-900 dark:!text-yellow-300"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                      {professeur.poste}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {professeur.identite.sexe === "M" ? "Masculin" : "Féminin"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {professeur.identite.contact}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {new Date(professeur.date_embauche).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {Array.isArray(professeur.matieres) && professeur.matieres.length > 0
                        ? professeur.matieres.join(", ")
                        : "Non assignée"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                    <IconButton
                      onClick={() => handleAffecterMatieres(professeur)}
                      className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                      size="small"
                      title="Affecter matières"
                    >
                      <MdLibraryAdd size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleShowInfo(professeur)}
                      className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900"
                      size="small"
                      title="Informations supplémentaires"
                    >
                      <MdInfo size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleEditProfesseur(professeur)}
                      className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900"
                      size="small"
                    >
                      <MdEdit size={18} />
                    </IconButton>
                    {showTrash ? (
                      <>
                        <IconButton
                          onClick={() => handleRestoreProfesseur(professeur.id)}
                          className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                          size="small"
                          title="Restaurer"
                        >
                          <MdRestore size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handlePermanentDeleteProfesseur(professeur.id)}
                          className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                          size="small"
                          title="Supprimer définitivement"
                        >
                          <MdDeleteForever size={18} />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        onClick={() => handleDeleteProfesseur(professeur.id)}
                        className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                        size="small"
                      >
                        <MdDelete size={18} />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {showTrash ? "Aucun professeur en corbeille" : "Aucun professeur trouvé"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ CORBEILLE - EN-TÊTE ROUGE SEULEMENT */}
      {trashedProfs.length > 0 && showTrash && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-red-300 dark:border-red-700">
          <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              🗑️ Corbeille ({trashedProfs.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-red-100 dark:bg-red-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">
                    Nom & Prénom
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">
                    {`Date d'Abandon`}
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {trashedProfs.map((prof) => (
                  <tr
                    key={prof.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {prof.identite.prenom_individu} {prof.identite.nom_individu}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {prof.identite.contact}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {prof.date_suppression
                        ? new Date(prof.date_suppression).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                      <IconButton
                        onClick={() => handleRestoreProfesseur(prof.id)}
                        className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                        size="small"
                      >
                        <MdRestore size={18} />
                      </IconButton>
                      <IconButton
                        onClick={() => handlePermanentDeleteProfesseur(prof.id)}
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

      {/* Modal Ajouter/Éditer Professeur */}
      <ProfesseurModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProfesseur}
        professeur={selectedProfesseur}
        isEditing={isEditing}
      />

      {/* Modal Affecter Matières */}
      <AffecterMatieresProf
        open={affecterMatieresOpen}
        onClose={() => setAffecterMatieresOpen(false)}
        onSave={handleSaveAffecterMatieres}
        professeur={selectedProfesseur}
      />

      {/* Dialog Infos Supplémentaires */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="dark:bg-gray-800 dark:text-white">
          Informations Supplémentaires
        </DialogTitle>
        <DialogContent className="dark:bg-gray-800 mt-4">
          {selectedProfForInfo && (
            <div className="flex flex-col gap-3">
              {/* ✅ AFFICHER SI TITULAIRE */}
              {selectedProfForInfo.is_class_titulaire && (
                <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <span className="font-semibold text-yellow-900 dark:text-yellow-300">📚 Titulaire de:</span>
                  <span className="ml-2 font-bold text-yellow-900 dark:text-yellow-300">
                    {selectedProfForInfo.classe_titulaire}
                  </span>
                </div>
              )}

              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Diplôme:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.diplome_enseignant}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Date de Naissance:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedProfForInfo.identite.date_naissance).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Nationalité:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.identite.nationalite}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Ville:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.identite.ville}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Email:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.identite.email || "Non renseigné"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Véhicule:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.identite.vehicule || "Non renseigné"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Personne à Contacter:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.personnage_a_contacter}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Contact Personne:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.contact_personne_a_contacter}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <span className="font-semibold text-green-900 dark:text-green-300">Salaire (FCFA):</span>
                <span className="ml-2 font-bold text-green-900 dark:text-green-300 text-lg">
                  {selectedProfForInfo.salaire.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}