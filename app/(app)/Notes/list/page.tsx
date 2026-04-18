"use client"
import React, { useState, useEffect } from "react";
import { Button } from "@mui/material";
import { MdArrowBack } from "react-icons/md";
import { useClasses } from "@/app/src/context/classeContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from '@/app/src/lib/firebase-client';
import Link from "next/link";

interface ClasseStats {
  total: number;
  matieres: number;
}

export default function NotesListPage() {
  const { classes, loading } = useClasses();
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [classesStats, setClassesStats] = useState<{ [key: string]: ClasseStats }>({});
  const [globalSearchResults, setGlobalSearchResults] = useState<typeof classes>([]);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // ✅ CALCULER STATS CLASSES (nombre de matieres)
  useEffect(() => {
    const calculateClassStats = async () => {
      try {
        const stats: { [key: string]: ClasseStats } = {};

        for (const classe of classes) {
          if (classe.statut_classe !== "actif") continue;

          // Compter les matieres de la classe
          const matiereCount = classe.id_matieres?.length || 0;

          stats[classe.id] = {
            total: matiereCount,
            matieres: matiereCount,
          };
        }

        setClassesStats(stats);
      } catch (error) {
        console.error("Erreur calcul stats:", error);
      }
    };

    if (classes.length > 0) {
      calculateClassStats();
    }
  }, [classes]);

  // ✅ RECHERCHE GLOBALE FIREBASE
  useEffect(() => {
    const performGlobalSearch = async () => {
      try {
        if (globalSearchTerm.trim() === "") {
          setGlobalSearchResults([]);
          return;
        }

        setLoadingGlobalSearch(true);

        // Filtrer les classes actives localement par nom
        const filtered = classes.filter((classe) =>
          classe.libelle_classe
            .toLowerCase()
            .includes(globalSearchTerm.toLowerCase()) &&
          classe.statut_classe === "actif"
        );

        setGlobalSearchResults(filtered);
      } catch (error) {
        console.error("Erreur recherche globale:", error);
        setGlobalSearchResults([]);
      } finally {
        setLoadingGlobalSearch(false);
      }
    };

    performGlobalSearch();
  }, [globalSearchTerm, classes]);

  if (loading) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  // ✅ CLASSES ACTIVES
  const activeClasses = classes.filter(c => c.statut_classe === "actif");

  return (
    <div className="w-full p-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold dark:text-white text-gray-900">
          Gestion des Notes
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {activeClasses.length} classe(s) active(s)
        </p>
      </div>

      {/* RECHERCHE GLOBALE */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une classe..."
          value={globalSearchTerm}
          onChange={(e) => setGlobalSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
          dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errorState && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg">
          {errorState}
        </div>
      )}

      {/* RÉSULTATS RECHERCHE GLOBALE */}
      {globalSearchTerm.trim() !== "" && (
        <div className="mb-8">
          <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-600 p-4 mb-4">
            <p className="text-blue-900 dark:text-blue-100 font-semibold">
              {loadingGlobalSearch ? "Recherche..." : `${globalSearchResults.length} résultat(s)`}
            </p>
          </div>

          {!loadingGlobalSearch && globalSearchResults.length > 0 && (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-min">
                {globalSearchResults.map((classe) => (
                  <Link key={classe.id} href={`/Notes/classe/${classe.id}`}>
                    <div className="flex-shrink-0 w-56 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition transform hover:scale-105">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        {classe.libelle_classe}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Matieres:</span>
                          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                            {classesStats[classe.id]?.matieres || 0}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          Cliquez pour accéder aux notes
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CARTES CLASSES */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-min">
          {activeClasses.length > 0 ? (
            activeClasses.map((classe) => (
              <Link key={classe.id} href={`/Notes/classe/${classe.id}`}>
                <div className="flex-shrink-0 w-56 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition transform hover:scale-105">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {classe.libelle_classe}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Matieres:</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {classesStats[classe.id]?.matieres || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Titulaire:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                        {classe.titulaire_classe || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Cliquez pour accéder aux notes
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 w-full">
              Aucune classe active
            </div>
          )}
        </div>
      </div>
    </div>
  );
}