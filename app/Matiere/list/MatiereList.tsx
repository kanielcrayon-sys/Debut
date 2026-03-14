"use client"
import React, { useState } from "react";
import { Button, IconButton } from "@mui/material";
import { MdEdit, MdDelete, MdAdd } from "react-icons/md";
import MatiereModal from "@/app/src/components/modals/MatiereModal";
import { Matiere, CreateMatiereInput, UpdateMatiereInput } from "@/app/src/interface/data";
import { mockMatieres } from "@/app/src/data/mockData";

export default function MatiereList() {
  const [matieres, setMatieres] = useState<Matiere[]>(mockMatieres);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMatiere, setSelectedMatiere] = useState<Matiere | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMatieres = matieres.filter((matiere) =>
    matiere.libelle_matiere.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ouvrir modal pour ajouter
  const handleAddMatiere = () => {
    setSelectedMatiere(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  // Ouvrir modal pour éditer
  const handleEditMatiere = (matiere: Matiere) => {
    setSelectedMatiere(matiere);
    setIsEditing(true);
    setModalOpen(true);
  };

  // Sauvegarder matière
  const handleSaveMatiere = (data: CreateMatiereInput | UpdateMatiereInput) => {
    if (isEditing && selectedMatiere) {
      const updatedMatiere: Matiere = {
        id: selectedMatiere.id,
        ...data,
        id_enseignant: selectedMatiere.id_enseignant,
        enseignant: selectedMatiere.enseignant,
      } as Matiere;
      setMatieres(matieres.map((m) => (m.id === selectedMatiere.id ? updatedMatiere : m)));
    } else {
      const newMatiere: Matiere = {
        id: `mat${Date.now()}`,
        ...data,
      } as Matiere;
      setMatieres([...matieres, newMatiere]);
    }
    setModalOpen(false);
  };

  // Supprimer matière
  const handleDeleteMatiere = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette matière?")) {
      setMatieres(matieres.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Gestion des Matières
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Total: {filteredMatieres.length} matière(s)
          </p>
        </div>

        <Button
          onClick={handleAddMatiere}
          variant="contained"
          className="!bg-blue-600 !text-white !flex !gap-2"
          startIcon={<MdAdd size={20} />}
        >
          Ajouter Matière
        </Button>
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

      {/* Tableau des matières */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Matière
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Coefficient
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Professeur Assigné
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
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {matiere.enseignant ? (
                      <span className="px-3 py-1 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {matiere.enseignant}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                        Non assignée
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                    <IconButton
                      onClick={() => handleEditMatiere(matiere)}
                      className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900"
                      size="small"
                    >
                      <MdEdit size={18} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteMatiere(matiere.id)}
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
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Aucune matière trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajouter/Éditer Matière */}
      <MatiereModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveMatiere}
        matiere={selectedMatiere}
        isEditing={isEditing}
      />
    </div>
  );
}