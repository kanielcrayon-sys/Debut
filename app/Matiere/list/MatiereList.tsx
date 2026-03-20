"use client"
import React, { useState, useMemo } from "react";
import { Button, IconButton, Dialog, DialogTitle, DialogContent, Chip } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdInfo, MdRestore, MdDeleteForever } from "react-icons/md";
import MatiereModal from "@/app/src/components/modals/MatiereModal";
import { Matiere, CreateMatiereInput, UpdateMatiereInput } from "@/app/src/interface/data";
import { useMatieres } from "@/app/src/context/matiereContext";
import { useSyncClasseMatieres } from "@/app/src/hooks/useSyncClasseMatieres";

export default function MatiereList() {
  const { matieres, loading, createMatiere, updateMatiere, deleteMatiere, restoreMatiere, permanentDeleteMatiere, refreshMatieres } = useMatieres();
  
  // ✅ AJOUTER LE HOOK DE SYNCHRONISATION
  useSyncClasseMatieres();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState<Matiere | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedMatiereForInfo, setSelectedMatiereForInfo] = useState<Matiere | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMatieres = useMemo(() => {
    const filtered = matieres.filter((matiere) => matiere.statut_matiere === "actif");
    console.log("📚 Matières actives recalculées:", filtered.length);
    return filtered;
  }, [matieres]);

  const trashedMatieres = useMemo(() => {
    const filtered = matieres.filter((matiere) => matiere.statut_matiere === "abandonné");
    console.log("🗑️ Corbeille recalculée:", filtered.length);
    return filtered;
  }, [matieres]);

  const displayedMatieres = showTrash ? trashedMatieres : activeMatieres;

  const filteredMatieres = useMemo(
    () => displayedMatieres.filter((matiere) =>
      matiere.libelle_matiere.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [displayedMatieres, searchTerm]
  );

  const handleAddMatiere = () => {
    setSelectedMatiere(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleEditMatiere = (matiere: Matiere) => {
    setSelectedMatiere(matiere);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleShowInfo = (matiere: Matiere) => {
    setSelectedMatiereForInfo(matiere);
    setInfoDialogOpen(true);
  };

  const handleSaveMatiere = async (data: CreateMatiereInput | UpdateMatiereInput) => {
    try {
      setError(null);
      if (isEditing && selectedMatiere) {
        console.log("🔄 Avant updateMatiere:", selectedMatiere.id);
        await updateMatiere(selectedMatiere.id, data as UpdateMatiereInput);
        console.log("✅ updateMatiere terminé");
      } else {
        console.log("🔄 Avant createMatiere");
        await createMatiere(data as CreateMatiereInput);
        console.log("✅ createMatiere terminé");
      }
      
      // ✅ RAFRAÎCHIR LES MATIÈRES (TIMING AUGMENTÉ À 1000ms)
      console.log("🔄 Rafraîchissement des matières...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshMatieres();
      console.log("✅ Matières rafraîchies");
      
      setModalOpen(false);
      setSelectedMatiere(null);
    } catch (err) {
      console.error("❌ Erreur save:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteMatiere = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette matière?")) {
      try {
        setError(null);
        await deleteMatiere(id);
        
        // ✅ RAFRAÎCHIR LES MATIÈRES (TIMING AUGMENTÉ À 1000ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshMatieres();
        console.log("✅ Matières rafraîchies après suppression");
      } catch (err) {
        console.error("❌ Erreur suppression:", err);
        setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      }
    }
  };

  const handleRestoreMatiere = async (id: string) => {
    try {
      setError(null);
      console.log(`🔄 Restauration matière: ${id}`);
      await restoreMatiere(id);
      console.log(`✅ Matière restaurée`);
      
      // ✅ RAFRAÎCHIR LES MATIÈRES (TIMING AUGMENTÉ À 1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshMatieres();
      console.log("✅ Matières rafraîchies après restauration");
      
      setShowTrash(false);
    } catch (err) {
      console.error("❌ Erreur restauration:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la restauration");
    }
  };

  const handlePermanentDeleteMatiere = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT cette matière? Cette action est irréversible.")) {
      try {
        setError(null);
        await permanentDeleteMatiere(id);
        
        // ✅ RAFRAÎCHIR LES MATIÈRES (TIMING AUGMENTÉ À 1000ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshMatieres();
        console.log("✅ Matières rafraîchies après suppression définitive");
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
            Gestion des Matières
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {showTrash ? `Corbeille: ${trashedMatieres.length}` : `Total: ${activeMatieres.length}`} matière(s)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowTrash(!showTrash)}
            variant={showTrash ? "contained" : "outlined"}
            className={showTrash ? "!bg-red-600 !text-white" : ""}
          >
            🗑️ Corbeille ({trashedMatieres.length})
          </Button>

          <Button
            onClick={handleAddMatiere}
            variant="contained"
            className="!bg-blue-600 !text-white !flex !gap-2"
            startIcon={<MdAdd size={20} />}
          >
            Ajouter Matière
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une matière..."
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

      {/* Tableau des matières */}
      <div className="overflow-x-auto shadow-md rounded-lg mb-8">
        <table className="w-full border-collapse bg-white dark:bg-gray-800">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Libellé
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Coefficient
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Enseignant
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMatieres.length > 0 ? (
              filteredMatieres.map((matiere) => (
                <tr
                  key={matiere.id}
                  className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {matiere.libelle_matiere}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {matiere.coef}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {matiere.enseignant || "Non assignée"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <Chip
                      label={matiere.statut_matiere === "actif" ? "Actif" : "Abandonné"}
                      color={matiere.statut_matiere === "actif" ? "success" : "default"}
                      variant="outlined"
                      size="small"
                    />
                  </td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                    <IconButton
                      onClick={() => handleShowInfo(matiere)}
                      className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900"
                      size="small"
                      title="Informations supplémentaires"
                    >
                      <MdInfo size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleEditMatiere(matiere)}
                      className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900"
                      size="small"
                    >
                      <MdEdit size={18} />
                    </IconButton>
                    {showTrash ? (
                      <>
                        <IconButton
                          onClick={() => handleRestoreMatiere(matiere.id)}
                          className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                          size="small"
                          title="Restaurer"
                        >
                          <MdRestore size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handlePermanentDeleteMatiere(matiere.id)}
                          className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                          size="small"
                          title="Supprimer définitivement"
                        >
                          <MdDeleteForever size={18} />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        onClick={() => handleDeleteMatiere(matiere.id)}
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
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {showTrash ? "Aucune matière en corbeille" : "Aucune matière trouvée"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ CORBEILLE - EN-TÊTE ROUGE SEULEMENT */}
      {trashedMatieres.length > 0 && showTrash && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-red-300 dark:border-red-700">
          <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              🗑️ Corbeille ({trashedMatieres.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-red-100 dark:bg-red-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-red-900 dark:text-red-100">
                    Libellé
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-red-900 dark:text-red-100">
                    Coefficient
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
                {trashedMatieres.map((matiere) => (
                  <tr
                    key={matiere.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {matiere.libelle_matiere}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {matiere.coef}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {matiere.date_suppression
                        ? new Date(matiere.date_suppression).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                      <IconButton
                        onClick={() => handleRestoreMatiere(matiere.id)}
                        className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                        size="small"
                      >
                        <MdRestore size={18} />
                      </IconButton>
                      <IconButton
                        onClick={() => handlePermanentDeleteMatiere(matiere.id)}
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

      {/* Modal Ajouter/Éditer Matière */}
      <MatiereModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveMatiere}
        matiere={selectedMatiere}
        isEditing={isEditing}
      />

      {/* Dialog Infos Supplémentaires */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="dark:bg-gray-800 dark:text-white">
          Informations Supplémentaires
        </DialogTitle>
        <DialogContent className="dark:bg-gray-800 mt-4">
          {selectedMatiereForInfo && (
            <div className="flex flex-col gap-3">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Libellé:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedMatiereForInfo.libelle_matiere}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Coefficient:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedMatiereForInfo.coef}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Enseignant:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedMatiereForInfo.enseignant || "Non assignée"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Statut:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedMatiereForInfo.statut_matiere}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}