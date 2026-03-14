"use client"
import React, { useState } from "react";
import { Button, IconButton } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdLibraryAdd } from "react-icons/md";
import ClasseModal from "@/app/src/components/modals/ClasseModal";
import AjouterMatieresModal from "@/app/src/components/modals/AjouterMatieresModal";
import { Classe, CreateClasseInput, UpdateClasseInput } from "@/app/src/interface/data";
import { mockClasses, mockEleves, mockProfesseurs } from "@/app/src/data/mockData";

interface ClasseWithStats extends Classe {
  nombre_abandons: number;
}

export default function ClasseList() {
  const [classes, setClasses] = useState<Classe[]>(mockClasses);
  const [modalOpen, setModalOpen] = useState(false);
  const [matieresModalOpen, setMatieresModalOpen] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculer les stats pour chaque classe
  const classesWithStats: ClasseWithStats[] = classes.map((classe) => {
    // Nombre d'élèves actifs
    const eleveActifs = mockEleves.filter(
      (e) => e.id_classe === classe.id && e.statut_eleve === "actif"
    );
    const nombre_eleve = eleveActifs.length;

    // Nombre d'abandons
    const abandons = mockEleves.filter(
      (e) => e.id_classe === classe.id && e.statut_eleve === "abandonné"
    );
    const nombre_abandons = abandons.length;

    return {
      ...classe,
      nombre_eleve,
      nombre_abandons,
    };
  });

  const filteredClasses = classesWithStats.filter((classe) =>
    classe.libelle_classe.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Sauvegarder classe
  const handleSaveClasse = (data: CreateClasseInput | UpdateClasseInput) => {
    if (isEditing && selectedClasse) {
      // Éditer
      const updatedClasse: Classe = {
        id: selectedClasse.id,
        ...data,
        id_matieres: selectedClasse.id_matieres,
        matieres: selectedClasse.matieres,
        nombre_matiere: selectedClasse.nombre_matiere,
        nombre_enseignant: selectedClasse.nombre_enseignant,
      } as Classe;
      setClasses(classes.map((c) => (c.id === selectedClasse.id ? updatedClasse : c)));
    } else {
      // Ajouter
      const professeur = mockProfesseurs.find((p) => p.id === data.id_titulaire);
      const newClasse: Classe = {
        id: `classe${Date.now()}`,
        ...data,
        id_matieres: [],
        matieres: [],
        nombre_eleve: 0,
        nombre_enseignant: 0,
        nombre_matiere: 0,
        titulaire_classe: professeur
          ? `${professeur.identite.prenom_individu} ${professeur.identite.nom_individu}`
          : "",
      } as Classe;
      setClasses([...classes, newClasse]);
    }
    setModalOpen(false);
  };

  // Sauvegarder matières
  const handleSaveMatieres = (updatedClasse: Classe) => {
    setClasses(classes.map((c) => (c.id === updatedClasse.id ? updatedClasse : c)));
    setMatieresModalOpen(false);
  };

  // Supprimer classe
  const handleDeleteClasse = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette classe?")) {
      setClasses(classes.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Gestion des Classes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Total: {filteredClasses.length} classe(s)
          </p>
        </div>

        <Button
          onClick={handleAddClasse}
          variant="contained"
          className="!bg-blue-600 !text-white !flex !gap-2"
          startIcon={<MdAdd size={20} />}
        >
          Ajouter Classe
        </Button>
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

      {/* Tableau des classes */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Classe
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Titulaire
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Effectif
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Abandons
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Matières
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Scolarité (FCFA)
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.length > 0 ? (
              filteredClasses.map((classe) => (
                <tr
                  key={classe.id}
                  className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {classe.libelle_classe}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {classe.titulaire_classe}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {classe.nombre_eleve}
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
                      {classe.nombre_abandons}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                    <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {classe.nombre_matiere}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {classe.scolarite.toLocaleString("fr-FR")}
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
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Aucune classe trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajouter/Éditer Classe */}
      <ClasseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClasse}
        classe={selectedClasse}
        isEditing={isEditing}
      />

      {/* Modal Ajouter Matières */}
      <AjouterMatieresModal
        open={matieresModalOpen}
        onClose={() => setMatieresModalOpen(false)}
        onSave={handleSaveMatieres}
        classe={selectedClasse}
      />
    </div>
  );
}