"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";

// --- 💡 Ajoute ici selon tes besoins
interface SchoolInfo {
  schoolName: string;
  phoneNumber: string;
  academicYear: string; // format "2025-2026" pour UI
  logoUrl: string;
}

// --- 🟩 Etend la définition ! 
interface SchoolContextType {
  schoolInfo: SchoolInfo;
  updateSchoolInfo: (info: SchoolInfo) => void;

  anneeScolaire: number; // <-- ANNÉE NUMÉRIQUE pour les requêtes Firestore etc.
  setAnneeScolaire: (n: number) => void;
}

const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  schoolName: "EPL PAUL VALERY",
  phoneNumber: "+33 1 23 45 67 89",
  academicYear: "2025-2026",
  logoUrl: "",
};
const DEFAULT_ANNEE = 2025; // Mets l'année scolaire par défaut de ton app ici.

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  // Infos administratives
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SCHOOL_INFO;
    }
    const saved = localStorage.getItem("schoolInfo");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Erreur chargement schoolInfo:", err);
        return DEFAULT_SCHOOL_INFO;
      }
    }
    return DEFAULT_SCHOOL_INFO;
  });

  // L'année scolaire active, pour toute l'app
  const [anneeScolaire, setAnneeScolaire] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("anneeScolaire");
      if (saved && !isNaN(Number(saved))) {
        return Number(saved);
      }
    }
    return DEFAULT_ANNEE; // Début de ton app
  });

  // Sauvegarde automatique de l'année scolaire si changée
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("anneeScolaire", String(anneeScolaire));
    }
  }, [anneeScolaire]);

  useEffect(() => {
    localStorage.setItem("schoolInfo", JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  const updateSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfo(info);
  };

  // --- 🟩 On expose tout à tous les enfants
  return (
    <SchoolContext.Provider value={{
      schoolInfo,
      updateSchoolInfo,
      anneeScolaire,
      setAnneeScolaire,
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

// --- 🟩 Hook d'accès context partout dans l'app
export function useSchoolInfo() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error("useSchoolInfo must be used within SchoolProvider");
  }
  return context;
}