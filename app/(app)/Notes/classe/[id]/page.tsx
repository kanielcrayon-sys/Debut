"use client"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import { MdArrowBack, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useClasses } from "@/app/src/context/classeContext";
import { useMatieres } from "@/app/src/context/matiereContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Matiere, Eleve } from "@/app/src/interface/data";

interface ElevesResponse {
  data: Eleve[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
    totalCount: number;
  };
  stats: {
    boys: number;
    girls: number;
    total: number;
  };
}

export default function NotesClassePage() {
  const params = useParams();
  const router = useRouter();
  const classeId = params.id as string;
  const { classes, loading: classesLoading } = useClasses();
  const { matieres, loading: matieresLoading } = useMatieres();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [eleveLoading, setEleveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedClasse = classes.find((c) => c.id === classeId);

  // ✅ FILTRER LES MATIÈRES ASSIGNÉES À CETTE CLASSE
  const classeMatieres = useMemo(() => {
    if (!selectedClasse?.id_matieres) return [];
    
    return matieres.filter(
      m => selectedClasse.id_matieres?.includes(m.id) && 
           m.statut_matiere === "actif"
    );
  }, [selectedClasse, matieres]);

  // ✅ CHARGER LES ÉLÈVES AVEC PAGINATION ET RECHERCHE
  const loadEleves = async (page: number, search: string = "") => {
    try {
      setEleveLoading(true);
      setError(null);
      
      const url = new URL('/api/notes/classe/search', window.location.origin);
      url.searchParams.append('classeId', classeId);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '10');
      if (search) url.searchParams.append('search', search);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des élèves');
      }
      
      const result: ElevesResponse = await response.json();
      setEleves(result.data);
      setCurrentPage(result.pagination.currentPage);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.totalCount);
      
      console.log(`✅ ${result.data.length} élèves chargés`);
    } catch (err) {
      console.error('❌ Erreur chargement élèves:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setEleveLoading(false);
    }
  };

  // ✅ CHARGER LES ÉLÈVES AU MONTAGE
  useEffect(() => {
    if (classeId) {
      loadEleves(1, searchQuery);
    }
  }, [classeId]);

  // ✅ RECHERCHE AVEC DÉLAI
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEleves(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loading = classesLoading || matieresLoading;

  // ✅ SCROLL HORIZONTAL
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!selectedClasse) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-red-500">Classe non trouvée</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.push("/Notes/list")} 
            variant="outlined" 
            startIcon={<MdArrowBack size={20} />} 
            className="!text-blue-600 !border-blue-600"
          >
            Retour
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">
              {selectedClasse.libelle_classe}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {classeMatieres.length} matière(s) • {totalCount} élève(s)
            </p>
          </div>
        </div>
      </div>

      {/* ✅ CAROUSEL MATIÈRES HORIZONTAL */}
      {classeMatieres.length > 0 ? (
        <div className="relative flex items-center gap-4 mb-8">
          {/* FLÈCHE GAUCHE */}
          <IconButton
            onClick={() => scroll("left")}
            className="!absolute !left-0 !z-10 !bg-white dark:!bg-gray-700 !shadow-md hover:!bg-gray-100 dark:hover:!bg-gray-600"
            size="large"
          >
            <MdChevronLeft size={24} className="text-gray-900 dark:text-white" />
          </IconButton>

          {/* CONTENEUR SCROLL */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 pl-12 pr-12 scroll-smooth scrollbar-hide"
            style={{
              scrollBehavior: "smooth",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
          >
            {classeMatieres.map((matiere) => (
              <Link 
                key={matiere.id} 
                href={`/Notes/classe/${classeId}/matiere/${matiere.id}`}
              >
                <div className="flex-shrink-0 w-56 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition transform hover:scale-105">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {matiere.libelle_matiere}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Coefficient:</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {matiere.coef}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Enseignant:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                        {matiere.enseignant || "Non assigné"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Cliquez pour gérer les notes
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* FLÈCHE DROITE */}
          <IconButton
            onClick={() => scroll("right")}
            className="!absolute !right-0 !z-10 !bg-white dark:!bg-gray-700 !shadow-md hover:!bg-gray-100 dark:hover:!bg-gray-600"
            size="large"
          >
            <MdChevronRight size={24} className="text-gray-900 dark:text-white" />
          </IconButton>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 mb-8">
          Aucune matière assignée à cette classe
        </div>
      )}

      {/* ✅ TABLEAU ÉLÈVES AVEC PAGINATION ET RECHERCHE */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* HEADER TABLEAU */}
        <div className="bg-gray-200 dark:bg-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Élèves ({totalCount})
            </h2>
            <TextField
              placeholder="Rechercher un élève..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!w-64"
              variant="outlined"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* TABLEAU */}
        {eleves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    N°
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Nom & Prénom
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Sexe
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Date de Naissance
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((eleve, index) => (
                  <tr
                    key={eleve.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {eleve.identite.nom_individu} {eleve.identite.prenom_individu}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {eleve.identite.sexe}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {eleve.identite.date_naissance
                        ? new Date(eleve.identite.date_naissance).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="contained"
                        size="small"
                        className="!bg-blue-600"
                        onClick={() =>
                          router.push(
                            `/Notes/classe/${classeId}/eleve/${eleve.id}`
                          )
                        }
                      >
                        Voir Notes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {eleveLoading ? "Chargement..." : "Aucun élève trouvé"}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600">
            <Button
              onClick={() => loadEleves(currentPage - 1, searchQuery)}
              disabled={currentPage === 1 || eleveLoading}
              variant="outlined"
            >
              ← Précédent
            </Button>

            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Page {currentPage} / {totalPages}
            </span>

            <Button
              onClick={() => loadEleves(currentPage + 1, searchQuery)}
              disabled={currentPage === totalPages || eleveLoading}
              variant="outlined"
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}