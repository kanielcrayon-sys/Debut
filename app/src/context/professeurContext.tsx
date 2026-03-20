"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Professeur, CreateProfesseurInput, UpdateProfesseurInput } from "@/app/src/interface/data";

interface ProfesseurContextType {
  professeurs: Professeur[];
  loading: boolean;
  error: string | null;
  createProfesseur: (data: CreateProfesseurInput) => Promise<void>;
  updateProfesseur: (id: string, data: UpdateProfesseurInput) => Promise<void>;
  deleteProfesseur: (id: string) => Promise<void>;
  restoreProfesseur: (id: string) => Promise<void>;
  permanentDeleteProfesseur: (id: string) => Promise<void>;
  getProfesseur: (id: string) => Professeur | undefined;
  refreshProfesseurs: () => Promise<void>;
}

const ProfesseurContext = createContext<ProfesseurContextType | undefined>(undefined);

export function ProfesseurProvider({ children }: { children: ReactNode }) {
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfesseurs();
  }, []);

  const fetchProfesseurs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/professeurs");
      if (!response.ok) throw new Error("Erreur chargement professeurs");
      const data = await response.json();
      console.log("📥 Professeurs chargés:", data.length);
      setProfesseurs(data);
      setError(null);
    } catch (err) {
      console.error("❌ Erreur fetchProfesseurs:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const refreshProfesseurs = async () => {
    try {
      console.log("🔄 Rafraîchissement des professeurs...");
      const response = await fetch("/api/professeurs");
      if (!response.ok) throw new Error("Erreur chargement professeurs");
      const data = await response.json();
      console.log("✅ Professeurs rafraîchis:", data.length);
      setProfesseurs(data);
    } catch (err) {
      console.error("❌ Erreur refreshProfesseurs:", err);
    }
  };

  const createProfesseur = async (data: CreateProfesseurInput) => {
    try {
      if (!data.identite.contact) {
        throw new Error("Le contact est obligatoire (*)");
      }

      const response = await fetch("/api/professeurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur création");
      }
      
      const newProfesseur = await response.json() as Professeur;
      
      setProfesseurs((prev) => {
        const updated = [...prev, newProfesseur];
        console.log("✅ Prof créé");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur createProfesseur:", err);
      throw err;
    }
  };

  const updateProfesseur = async (id: string, data: UpdateProfesseurInput) => {
    try {
      if (data.identite && !data.identite.contact) {
        throw new Error("Le contact est obligatoire (*)");
      }

      const response = await fetch(`/api/professeurs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur mise à jour");
      }
      
      const updatedProfesseur = await response.json() as Professeur;
      
      setProfesseurs((prev) => {
        const updated = prev.map((prof) =>
          prof.id === id ? updatedProfesseur : prof
        );
        console.log("✅ Prof mis à jour - Matières:", updatedProfesseur.matieres?.length);
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur updateProfesseur:", err);
      throw err;
    }
  };

  const deleteProfesseur = async (id: string) => {
    try {
      const prof = professeurs.find(p => p.id === id);
      if (!prof) throw new Error("Prof non trouvé");
      
      const dateStr = new Date().toISOString().split("T")[0];
      
      console.log(`🗑️ Suppression prof: ${id}`);
      
      const response = await fetch(`/api/professeurs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut_enseignant: "abandonné",
          date_suppression: dateStr,
          id_matiere: [],
          matieres: [],
        }),
      });
      
      if (!response.ok) throw new Error("Erreur suppression");
      
      setProfesseurs((prev) => {
        const updated = prev.map((p) =>
          p.id === id
            ? ({
                ...p,
                statut_enseignant: "abandonné" as const,
                date_suppression: dateStr,
                id_matiere: [],
                matieres: [],
              } as Professeur)
            : p
        );
        console.log("✅ Prof supprimé");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur deleteProfesseur:", err);
      throw err;
    }
  };

  const restoreProfesseur = async (id: string) => {
    try {
      console.log(`🔄 Restauration prof: ${id}`);
      
      const response = await fetch(`/api/professeurs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut_enseignant: "actif",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur restauration");
      }
      
      const updatedProfesseur = await response.json() as Professeur;
      
      setProfesseurs((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? updatedProfesseur : p
        );
        console.log("✅ Prof restauré");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur restoreProfesseur:", err);
      throw err;
    }
  };

  const permanentDeleteProfesseur = async (id: string) => {
    try {
      console.log(`🗑️ Suppression définitive: ${id}`);
      
      const response = await fetch(`/api/professeurs/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Erreur suppression");
      
      setProfesseurs((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        console.log("✅ Prof supprimé définitivement");
        return updated;
      });
    } catch (err) {
      console.error("❌ Erreur permanentDeleteProfesseur:", err);
      throw err;
    }
  };

  const getProfesseur = (id: string): Professeur | undefined => {
    return professeurs.find((p) => p.id === id);
  };

  const value: ProfesseurContextType = {
    professeurs,
    loading,
    error,
    createProfesseur,
    updateProfesseur,
    deleteProfesseur,
    restoreProfesseur,
    permanentDeleteProfesseur,
    getProfesseur,
    refreshProfesseurs,
  };

  return (
    <ProfesseurContext.Provider value={value}>
      {children}
    </ProfesseurContext.Provider>
  );
}

export function useProfesseurs() {
  const context = useContext(ProfesseurContext);
  if (!context) {
    throw new Error("useProfesseurs doit être utilisé dans un ProfesseurProvider");
  }
  return context;
}