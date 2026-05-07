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
import { db } from "@/app/src/lib/firebase-client";
import { useSchoolInfo } from "@/app/src/context/schoolContext";
import { collection, query, where, getDocs } from "firebase/firestore";
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
const [effectifActif, setEffectifActif] = useState<number | null>(null);
  const selectedClasse = classes.find((c) => c.id === classeId);
const { anneeScolaire } = useSchoolInfo();
  // ✅ FILTRER LES MATIÈRES ASSIGNÉES À CETTE CLASSE
  const classeMatieres = useMemo(() => {
    if (!selectedClasse?.id_matieres) return [];
    
    return matieres.filter(
      m => selectedClasse.id_matieres?.includes(m.id) && 
           m.statut_matiere === "actif"
    );
  }, [selectedClasse, matieres]);

  // ✅ CHARGER LES ÉLÈVES AVEC PAGINATION ET RECHERCHE


  // ✅ CHARGER LES ÉLÈVES AU MONTAGE
 

  const loading = classesLoading || matieresLoading;
  useEffect(() => {
  async function fetchEffectif() {
    if (!classeId || !anneeScolaire) {
      setEffectifActif(0);
      return;
    }
    try {
      const q = query(
        collection(db, "inscriptions"),
        where("id_classe", "==", classeId),
        where("annee_scolaire", "==", anneeScolaire),
        where("statut", "==", "actif")
      );
      const snap = await getDocs(q);
      setEffectifActif(snap.size);
    } catch (err) {
      setEffectifActif(0);
    }
  }
  fetchEffectif();
}, [classeId, anneeScolaire]);

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
                            {classeMatieres.length} matière(s)
                {effectifActif !== null &&
                  <> • {effectifActif} élève(s)</>
                }
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
      
    </div>
  );
}