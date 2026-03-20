"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Matiere, CreateMatiereInput, UpdateMatiereInput } from "@/app/src/interface/data";

interface MatiereContextType {
  matieres: Matiere[];
  loading: boolean;
  error: string | null;
  createMatiere: (data: CreateMatiereInput) => Promise<void>;
  updateMatiere: (id: string, data: UpdateMatiereInput) => Promise<void>;
  deleteMatiere: (id: string) => Promise<void>;
  restoreMatiere: (id: string) => Promise<void>;
  permanentDeleteMatiere: (id: string) => Promise<void>;
  getMatiere: (id: string) => Matiere | undefined;
  getMatieresDisponibles: () => Matiere[];
  getMatierByProfesseur: (profId: string) => Matiere[];
  getMatieresByIds: (ids: string[]) => Matiere[];
  refreshMatieres: () => Promise<void>;
}

const MatiereContext = createContext<MatiereContextType | undefined>(undefined);

export function MatiereProvider({ children }: { children: ReactNode }) {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatieres();
  }, []);

  const fetchMatieres = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/matieres");
      if (!response.ok) throw new Error("Erreur chargement matières");
      const data = await response.json();
      console.log("📥 Matières chargées:", data.length);
      setMatieres(data);
      setError(null);
    } catch (err) {
      console.error("❌ Erreur fetchMatieres:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshMatieres = async () => {
    try {
      console.log("🔄 Rafraîchissement des matières...");
      const response = await fetch("/api/matieres");
      if (!response.ok) throw new Error("Erreur chargement matières");
      const data = await response.json();
      console.log("✅ Matières rafraîchies:", data.length);
      setMatieres(data);
    } catch (err) {
      console.error("❌ Erreur refreshMatieres:", err);
    }
  };

  const createMatiere = async (data: CreateMatiereInput) => {
    try {
      const response = await fetch("/api/matieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur création");
      }
      
      const newMatiere = await response.json() as Matiere;
      
      setMatieres((prev) => {
        const updated = [...prev, newMatiere];
        console.log("✅ Matière créée");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur createMatiere:", err);
      throw err;
    }
  };

  const updateMatiere = async (id: string, data: UpdateMatiereInput) => {
    try {
      const response = await fetch(`/api/matieres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur mise à jour");
      }
      
      const updatedMatiere = await response.json() as Matiere;
      
      setMatieres((prev) => {
        const updated = prev.map((m) =>
          m.id === id ? updatedMatiere : m
        );
        console.log("✅ Matière mise à jour");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur updateMatiere:", err);
      throw err;
    }
  };

  const deleteMatiere = async (id: string) => {
    try {
      const matiere = matieres.find(m => m.id === id);
      if (!matiere) throw new Error("Matière non trouvée");
      
      const dateStr = new Date().toISOString().split("T")[0];
      
      console.log(`🗑️ Suppression matière: ${id}`);
      
      const response = await fetch(`/api/matieres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut_matiere: "abandonné",
          date_suppression: dateStr,
          id_enseignant: matiere.id_enseignant || null,
          enseignant: matiere.enseignant || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur suppression");
      }
      
      const updatedMatiere = await response.json() as Matiere;
      
      setMatieres((prev) => {
        const updated = prev.map((m) =>
          m.id === id ? updatedMatiere : m
        );
        console.log("✅ Matière supprimée - API désaffecte le prof");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur deleteMatiere:", err);
      throw err;
    }
  };

  const restoreMatiere = async (id: string) => {
    try {
      console.log(`🔄 Restauration matière: ${id}`);
      
      const response = await fetch(`/api/matieres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut_matiere: "actif",
          id_enseignant: null,
          enseignant: null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur restauration");
      }
      
      const updatedMatiere = await response.json() as Matiere;
      
      setMatieres((prev) => {
        const updated = prev.map((m) =>
          m.id === id ? updatedMatiere : m
        );
        console.log("✅ Matière restaurée - Pas de prof assigné");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur restoreMatiere:", err);
      throw err;
    }
  };

  const permanentDeleteMatiere = async (id: string) => {
    try {
      console.log(`🗑️ Suppression définitive: ${id}`);
      
      const response = await fetch(`/api/matieres/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Erreur suppression");
      
      setMatieres((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        console.log("✅ Matière supprimée définitivement");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur permanentDeleteMatiere:", err);
      throw err;
    }
  };

  const getMatiere = (id: string): Matiere | undefined => {
    return matieres.find((m) => m.id === id);
  };

  const getMatieresDisponibles = (): Matiere[] => {
    const disponibles = matieres.filter(
      (m) =>
        m.statut_matiere !== "abandonné" &&
        (!m.id_enseignant || m.id_enseignant === "")
    );
    return disponibles;
  };

  const getMatierByProfesseur = (profId: string): Matiere[] => {
    const matieresDuProf = matieres.filter((m) => m.id_enseignant === profId);
    return matieresDuProf;
  };

  const getMatieresByIds = (ids: string[]): Matiere[] => {
    return matieres.filter((m) => ids.includes(m.id));
  };

  const value: MatiereContextType = {
    matieres,
    loading,
    error,
    createMatiere,
    updateMatiere,
    deleteMatiere,
    restoreMatiere,
    permanentDeleteMatiere,
    getMatiere,
    getMatieresDisponibles,
    getMatierByProfesseur,
    getMatieresByIds,
    refreshMatieres,
  };

  return (
    <MatiereContext.Provider value={value}>
      {children}
    </MatiereContext.Provider>
  );
}

export function useMatieres() {
  const context = useContext(MatiereContext);
  if (!context) {
    throw new Error("useMatieres doit être utilisé dans un MatiereProvider");
  }
  return context;
}