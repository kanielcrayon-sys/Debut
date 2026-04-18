"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { EvaluationFlash, CreateEvaluationFlashInput, UpdateEvaluationFlashInput } from "@/app/src/interface/data";

interface EvaluationFlashContextType {
  evaluations: EvaluationFlash[];
  loading: boolean;
  error: string | null;
  createEvaluation: (data: CreateEvaluationFlashInput) => Promise<void>;
  updateEvaluation: (id: string, data: UpdateEvaluationFlashInput) => Promise<void>;
  deleteEvaluation: (id: string) => Promise<void>;
  getEvaluationsByEleve: (eleveId: string, matiereId: string) => EvaluationFlash[];
  refreshEvaluations: () => Promise<void>;
}

const EvaluationFlashContext = createContext<EvaluationFlashContextType | undefined>(undefined);

export function EvaluationFlashProvider({ children }: { children: ReactNode }) {
  const [evaluations, setEvaluations] = useState<EvaluationFlash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/evaluations-flash");
      if (!response.ok) throw new Error("Erreur chargement évaluations");
      const data = await response.json();
      console.log("📥 Évaluations chargées:", data.length);
      setEvaluations(data);
      setError(null);
    } catch (err) {
      console.error("❌ Erreur fetchEvaluations:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshEvaluations = async () => {
    try {
      console.log("🔄 Rafraîchissement des évaluations...");
      const response = await fetch("/api/evaluations-flash");
      if (!response.ok) throw new Error("Erreur chargement évaluations");
      const data = await response.json();
      console.log("✅ Évaluations rafraîchies:", data.length);
      setEvaluations(data);
    } catch (err) {
      console.error("❌ Erreur refreshEvaluations:", err);
    }
  };

  const createEvaluation = async (data: CreateEvaluationFlashInput) => {
    try {
      const response = await fetch("/api/evaluations-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur création");
      }
      
      const newEvaluation = await response.json() as EvaluationFlash;
      setEvaluations((prev) => [...prev, newEvaluation]);
      console.log("✅ Évaluation créée");
    } catch (err) {
      console.error("❌ Erreur createEvaluation:", err);
      throw err;
    }
  };

  const updateEvaluation = async (id: string, data: UpdateEvaluationFlashInput) => {
    try {
      const response = await fetch(`/api/evaluations-flash/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur mise à jour");
      }
      
      const updatedEvaluation = await response.json() as EvaluationFlash;
      setEvaluations((prev) =>
        prev.map((e) => (e.id === id ? updatedEvaluation : e))
      );
      console.log("✅ Évaluation mise à jour");
    } catch (err) {
      console.error("❌ Erreur updateEvaluation:", err);
      throw err;
    }
  };

  const deleteEvaluation = async (id: string) => {
    try {
      const response = await fetch(`/api/evaluations-flash/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Erreur suppression");
      
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
      console.log("✅ Évaluation supprimée");
    } catch (err) {
      console.error("❌ Erreur deleteEvaluation:", err);
      throw err;
    }
  };

  const getEvaluationsByEleve = (eleveId: string, matiereId: string): EvaluationFlash[] => {
    return evaluations.filter(
      (e) => e.id_eleve === eleveId && e.id_matiere === matiereId
    );
  };

  const value: EvaluationFlashContextType = {
    evaluations,
    loading,
    error,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    getEvaluationsByEleve,
    refreshEvaluations,
  };

  return (
    <EvaluationFlashContext.Provider value={value}>
      {children}
    </EvaluationFlashContext.Provider>
  );
}

export function useEvaluationFlash() {
  const context = useContext(EvaluationFlashContext);
  if (!context) {
    throw new Error("useEvaluationFlash doit être utilisé dans un EvaluationFlashProvider");
  }
  return context;
}