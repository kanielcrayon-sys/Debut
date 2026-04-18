"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";

interface SchoolInfo {
  schoolName: string;
  phoneNumber: string;
  academicYear: string;
  logoUrl: string;
}

interface SchoolContextType {
  schoolInfo: SchoolInfo;
  updateSchoolInfo: (info: SchoolInfo) => void;
}

const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  schoolName: "EPL PAUL VALERY",
  phoneNumber: "+33 1 23 45 67 89",
  academicYear: "2025-2026",
  logoUrl: "",
};

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  // ✅ INITIALISER L'ÉTAT AVEC UNE FONCTION (LAZY INITIALIZATION)
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

  // ✅ SAUVEGARDER DANS LOCALSTORAGE QUAND ÇA CHANGE
  useEffect(() => {
    localStorage.setItem("schoolInfo", JSON.stringify(schoolInfo));
  }, [schoolInfo]);

  const updateSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfo(info);
  };

  return (
    <SchoolContext.Provider value={{ schoolInfo, updateSchoolInfo }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolInfo() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error("useSchoolInfo must be used within SchoolProvider");
  }
  return context;
}