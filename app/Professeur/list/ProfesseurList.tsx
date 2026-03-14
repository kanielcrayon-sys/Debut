"use client"
import React, { useState } from "react";
import { Button, IconButton, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdInfo, MdLibraryAdd } from "react-icons/md";
import ProfesseurModal from "@/app/src/components/modals/ProfesseurModal";
import AffecterMatieresProf from "@/app/src/components/modals/AffecterMatieresProf";
import { Professeur, Matiere, CreateProfesseurInput, UpdateProfesseurInput } from "@/app/src/interface/data";
import { mockProfesseurs, mockMatieres } from "@/app/src/data/mockData";

export default function ProfesseurList() {
  const [professeurs, setProfesseurs] = useState<Professeur[]>(mockProfesseurs);
  const [matieres, setMatieres] = useState<Matiere[]>(mockMatieres);
  const [modalOpen, setModalOpen] = useState(false);
  const [affecterMatieresOpen, setAffecterMatieresOpen] = useState(false);
  const [selectedProfesseur, setSelectedProfesseur] = useState<Professeur | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedProfForInfo, setSelectedProfForInfo] = useState<Professeur | null>(null);

  const filteredProfesseurs = professeurs.filter((prof) =>
    `${prof.identite.prenom_individu} ${prof.identite.nom_individu}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Ouvrir modal pour ajouter
  const handleAddProfesseur = () => {
    setSelectedProfesseur(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  // Ouvrir modal pour éditer
  const handleEditProfesseur = (professeur: Professeur) => {
    setSelectedProfesseur(professeur);
    setIsEditing(true);
    setModalOpen(true);
  };

  // Ouvrir modal pour affecter matières
  const handleAffecterMatieres = (professeur: Professeur) => {
    setSelectedProfesseur(professeur);
    setAffecterMatieresOpen(true);
  };

  // Afficher les infos supplémentaires
  const handleShowInfo = (professeur: Professeur) => {
    setSelectedProfForInfo(professeur);
    setInfoDialogOpen(true);
  };

  // Sauvegarder professeur
  const handleSaveProfesseur = (data: CreateProfesseurInput | UpdateProfesseurInput) => {
    if (isEditing && selectedProfesseur) {
      const updatedProfesseur: Professeur = {
        id: selectedProfesseur.id,
        ...data,
        id_individu: selectedProfesseur.id_individu,
      } as Professeur;
      setProfesseurs(professeurs.map((p) => (p.id === selectedProfesseur.id ? updatedProfesseur : p)));
    } else {
      const newProfesseur: Professeur = {
        id: `prof${Date.now()}`,
        id_individu: `ind_prof${Date.now()}`,
        ...data,
      } as Professeur;
      setProfesseurs([...professeurs, newProfesseur]);
    }
    setModalOpen(false);
  };

  // Sauvegarder affectation matières
  const handleSaveAffecterMatieres = (
    updatedProfesseur: Professeur,
    updatedMatieres: Matiere[]
  ) => {
    setProfesseurs(
      professeurs.map((p) =>
        p.id === updatedProfesseur.id ? updatedProfesseur : p
      )
    );
    setMatieres(updatedMatieres);
    setAffecterMatieresOpen(false);
  };

  // Supprimer professeur
  const handleDeleteProfesseur = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur?")) {
      setProfesseurs(professeurs.filter((p) => p.id !== id));
      // Désassigner les matières
      setMatieres(
        matieres.map((m) =>
          m.id_enseignant === id
            ? { ...m, id_enseignant: undefined, enseignant: undefined }
            : m
        )
      );
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Gestion des Professeurs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Total: {filteredProfesseurs.length} professeur(s)
          </p>
        </div>

        <Button
          onClick={handleAddProfesseur}
          variant="contained"
          className="!bg-blue-600 !text-white !flex !gap-2"
          startIcon={<MdAdd size={20} />}
        >
          Ajouter Professeur
        </Button>
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

      {/* Tableau des professeurs */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Nom & Prénom
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Sexe
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {`Date d'Embauche`}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Salaire (FCFA)
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
                    {professeur.identite.prenom_individu} {professeur.identite.nom_individu}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {professeur.identite.sexe === "M" ? "Masculin" : "Féminin"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {new Date(professeur.date_embauche).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                      {professeur.salaire.toLocaleString("fr-FR")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {professeur.matieres.join(", ") || "Non assignée"}
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
                    <IconButton
                      onClick={() => handleDeleteProfesseur(professeur.id)}
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
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Aucun professeur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Diplôme:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.statut_enseignant}
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
                  {selectedProfForInfo.identite.email}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Contact:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedProfForInfo.identite.contact}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}