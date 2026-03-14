"use client"
import React, { useState, useMemo } from "react";
import { Button, IconButton, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { MdEdit, MdDelete, MdAdd, MdInfo, MdRestore } from "react-icons/md";
import EleveModal from "@/app/src/components/modals/EleveModal";
import { Eleve, Classe, CreateEleveInput, UpdateEleveInput } from "@/app/src/interface/data";
import { mockEleves, mockClasses } from "@/app/src/data/mockData";

export default function EleveList() {
  const [eleves, setEleves] = useState<Eleve[]>(mockEleves);
  const [classes, setClasses] = useState<Classe[]>(mockClasses);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedEleveForInfo, setSelectedEleveForInfo] = useState<Eleve | null>(null);

  // Calculer les abandons par classe
  const classesWithStats = useMemo(() => {
    return classes.map((classe) => {
      const abandons = eleves.filter(
        (e) => e.id_classe === classe.id && (e.statut_eleve === "abandonné" || e.statut_eleve === "suspendu")
      );
      const actifs = eleves.filter(
        (e) => e.id_classe === classe.id && e.statut_eleve === "actif"
      );

      return {
        ...classe,
        nombre_abandons: abandons.length,
        nombre_eleve: actifs.length,
      };
    });
  }, [classes, eleves]);

  // Élèves actifs groupés par classe et triés alphabétiquement
  const elevesByClasse = useMemo(() => {
    const grouped: { [key: string]: Eleve[] } = {};

    classes.forEach((classe) => {
      const classEleves = eleves
        .filter((e) => e.id_classe === classe.id && e.statut_eleve === "actif")
        .sort((a, b) => {
          const nameA = `${a.identite.nom_individu} ${a.identite.prenom_individu}`.toLowerCase();
          const nameB = `${b.identite.nom_individu} ${b.identite.prenom_individu}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });

      if (classEleves.length > 0) {
        grouped[classe.id] = classEleves;
      }
    });

    return grouped;
  }, [eleves, classes]);

  // Élèves supprimés/abandonnés
  const deletedEleves = useMemo(() => {
    return eleves
      .filter((e) => e.statut_eleve === "abandonné" || e.statut_eleve === "suspendu")
      .sort((a, b) => {
        const nameA = `${a.identite.nom_individu} ${a.identite.prenom_individu}`.toLowerCase();
        const nameB = `${b.identite.nom_individu} ${b.identite.prenom_individu}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [eleves]);

  // Filtrer par recherche
  const filteredElevesByClasse = useMemo(() => {
    const filtered: { [key: string]: Eleve[] } = {};

    Object.entries(elevesByClasse).forEach(([classeId, classEleves]) => {
      const filtered_class = classEleves.filter((eleve) =>
        `${eleve.identite.prenom_individu} ${eleve.identite.nom_individu}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );

      if (filtered_class.length > 0) {
        filtered[classeId] = filtered_class;
      }
    });

    return filtered;
  }, [elevesByClasse, searchTerm]);

  // Filtrer élèves supprimés par recherche
  const filteredDeletedEleves = useMemo(() => {
    return deletedEleves.filter((eleve) =>
      `${eleve.identite.prenom_individu} ${eleve.identite.nom_individu}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [deletedEleves, searchTerm]);

  // Ouvrir modal pour ajouter
  const handleAddEleve = () => {
    setSelectedEleve(null);
    setIsEditing(false);
    setModalOpen(true);
  };

  // Ouvrir modal pour éditer
  const handleEditEleve = (eleve: Eleve) => {
    setSelectedEleve(eleve);
    setIsEditing(true);
    setModalOpen(true);
  };

  // Afficher les infos supplémentaires
  const handleShowInfo = (eleve: Eleve) => {
    setSelectedEleveForInfo(eleve);
    setInfoDialogOpen(true);
  };

  // Sauvegarder élève
  const handleSaveEleve = (data: CreateEleveInput | UpdateEleveInput) => {
    if (isEditing && selectedEleve) {
      const updatedEleve: Eleve = {
        id: selectedEleve.id,
        ...data,
        id_individu: selectedEleve.id_individu,
        classe: selectedEleve.classe,
      } as Eleve;
      setEleves(eleves.map((e) => (e.id === selectedEleve.id ? updatedEleve : e)));
    } else {
      const selectedClasse = classes.find((c) => c.id === data.id_classe);
      const newEleve: Eleve = {
        id: `eleve${Date.now()}`,
        id_individu: `ind_eleve${Date.now()}`,
        ...data,
        classe: selectedClasse || classes[0],
      } as Eleve;
      setEleves([...eleves, newEleve]);
    }
    setModalOpen(false);
  };

  // Supprimer élève (changer statut à "abandonné")
  const handleDeleteEleve = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir abandonner cet élève?")) {
      setEleves(
        eleves.map((e) =>
          e.id === id
            ? {
                ...e,
                statut_eleve: "abandonné" as const,
                date_suppression: new Date().toISOString().split("T")[0],
              }
            : e
        )
      );
    }
  };

  // Restaurer élève (redevenir actif)
  const handleRestoreEleve = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir restaurer cet élève?")) {
      setEleves(
        eleves.map((e) =>
          e.id === id ? { ...e, statut_eleve: "actif" as const, date_suppression: undefined } : e
        )
      );
    }
  };

  // Supprimer définitivement
  const handlePermanentDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet élève? Cette action est irréversible!")) {
      setEleves(eleves.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Gestion des Élèves
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Total: {Object.values(filteredElevesByClasse).flat().length} élève(s) actif(s)
          </p>
        </div>

        <Button
          onClick={handleAddEleve}
          variant="contained"
          className="!bg-blue-600 !text-white !flex !gap-2"
          startIcon={<MdAdd size={20} />}
        >
          Ajouter Élève
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un élève..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
          dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Afficher les élèves par classe */}
      <div className="flex flex-col gap-8">
        {Object.entries(filteredElevesByClasse).map(([classeId, classEleves]) => {
          const classe = classes.find((c) => c.id === classeId);
          return (
            <div key={classeId} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {/* Titre de la classe */}
              <div className="bg-blue-600 dark:bg-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  {classe?.libelle_classe} ({classEleves.length} élève{classEleves.length > 1 ? "s" : ""})
                </h2>
              </div>

              {/* Tableau des élèves */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-200 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Nom & Prénom
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        Classe
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        En Règle
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classEleves.map((eleve) => (
                      <tr
                        key={eleve.id}
                        className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {eleve.identite.prenom_individu} {eleve.identite.nom_individu}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                            {classe?.libelle_classe}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {eleve.identite.contact}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                          <span className="px-3 py-1 rounded-full bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Actif
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
                          <IconButton
                            onClick={() => handleShowInfo(eleve)}
                            className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900"
                            size="small"
                            title="Informations supplémentaires"
                          >
                            <MdInfo size={18} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleEditEleve(eleve)}
                            className="!text-blue-600 hover:!bg-blue-100 dark:hover:!bg-blue-900"
                            size="small"
                          >
                            <MdEdit size={18} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteEleve(eleve.id)}
                            className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                            size="small"
                            title="Abandonner l'élève"
                          >
                            <MdDelete size={18} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {Object.keys(filteredElevesByClasse).length === 0 && filteredDeletedEleves.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun élève trouvé
          </div>
        )}
      </div>

      {/* Section Élèves Abandonnés/Suspendus (CORBEILLE) */}
      {filteredDeletedEleves.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Titre */}
          <div className="bg-red-600 dark:bg-red-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              🗑️ Corbeille - Élèves Abandonnés/Suspendus ({filteredDeletedEleves.length})
            </h2>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Nom & Prénom
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Classe
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    {`Date d'Abandon`}
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDeletedEleves.map((eleve) => {
                  const classe = classes.find((c) => c.id === eleve.id_classe);
                  return (
                    <tr
                      key={eleve.id}
                      className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {eleve.identite.prenom_individu} {eleve.identite.nom_individu}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                        <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                          {classe?.libelle_classe}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                        <span className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {eleve.identite.contact}
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
                        {eleve.date_suppression
                          ? new Date(eleve.date_suppression).toLocaleDateString("fr-FR")
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center flex gap-2 justify-center flex-wrap">
                        <IconButton
                          onClick={() => handleShowInfo(eleve)}
                          className="!text-indigo-600 hover:!bg-indigo-100 dark:hover:!bg-indigo-900"
                          size="small"
                          title="Informations supplémentaires"
                        >
                          <MdInfo size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleRestoreEleve(eleve.id)}
                          className="!text-green-600 hover:!bg-green-100 dark:hover:!bg-green-900"
                          size="small"
                          title="Restaurer l'élève"
                        >
                          <MdRestore size={18} />
                        </IconButton>
                        <IconButton
                          onClick={() => handlePermanentDelete(eleve.id)}
                          className="!text-red-600 hover:!bg-red-100 dark:hover:!bg-red-900"
                          size="small"
                          title="Supprimer définitivement"
                        >
                          <MdDelete size={18} />
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

      {/* Modal Ajouter/Éditer Élève */}
      <EleveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEleve}
        eleve={selectedEleve}
        isEditing={isEditing}
        classes={classes}
      />

      {/* Dialog Infos Supplémentaires */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="dark:bg-gray-800 dark:text-white">
          Informations Supplémentaires
        </DialogTitle>
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
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.identite.email}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Nationalité:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.identite.nationalite}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Ville:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.identite.ville}
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                <span className="font-semibold text-gray-900 dark:text-white">{`Nom du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.nom_tuteur}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Profession du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.profession_tuteur}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{`Contact du Tuteur:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.contact_tuteur}
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                <span className="font-semibold text-gray-900 dark:text-white">{`Date d'Inscription:`}</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {new Date(selectedEleveForInfo.date_premier_inscription).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">GBEVOU:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {selectedEleveForInfo.gbevou ? "Oui" : "Non"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}