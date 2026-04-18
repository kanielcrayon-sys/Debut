"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { Classe, CreateClasseInput, UpdateClasseInput } from "@/app/src/interface/data";
import { classeService } from "@/app/src/services/classeService";

interface ClasseContextType {
  classes: Classe[];
  loading: boolean;
  error: string | null;
  fetchClasses: () => Promise<void>;
  refreshClasses: () => Promise<void>;
  createClasse: (data: CreateClasseInput) => Promise<Classe | null>;
  updateClasse: (id: string, data: UpdateClasseInput) => Promise<Classe | null>;
  deleteClasse: (id: string) => Promise<boolean>;
  restoreClasse: (id: string) => Promise<Classe | null>;
}

export const ClasseContext = createContext<ClasseContextType | undefined>(undefined);

export function ClasseProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classeService.getAll();
      setClasses(data || []);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur fetch classes:', err);
      setError('Erreur lors du chargement des classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVELLE FONCTION: RAFRAÎCHIR LES CLASSES
  const refreshClasses = async () => {
    console.log("🔄 Rafraîchissement des classes...");
    await fetchClasses();
    console.log("✅ Classes rafraîchies");
  };

  const createClasse = async (data: CreateClasseInput): Promise<Classe | null> => {
    try {
      const newClasse = await classeService.create(data);
      if (newClasse) {
        setClasses([...classes, newClasse]);
        setError(null);
      }
      return newClasse || null;
    } catch (err) {
      console.error('❌ Erreur création classe:', err);
      setError('Erreur lors de la création de la classe');
      return null;
    }
  };

  const updateClasse = async (id: string, data: UpdateClasseInput): Promise<Classe | null> => {
    try {
      const updatedClasse = await classeService.update(id, data);
      if (updatedClasse) {
        setClasses(classes.map(c => c.id === id ? updatedClasse : c));
        setError(null);
      }
      return updatedClasse || null;
    } catch (err) {
      console.error('❌ Erreur mise à jour classe:', err);
      setError('Erreur lors de la mise à jour de la classe');
      return null;
    }
  };

  const deleteClasse = async (id: string): Promise<boolean> => {
    try {
      const success = await classeService.delete(id);
      if (success) {
        setClasses(classes.filter(c => c.id !== id));
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('❌ Erreur suppression classe:', err);
      setError('Erreur lors de la suppression de la classe');
      return false;
    }
  };

  const restoreClasse = async (id: string): Promise<Classe | null> => {
    try {
      console.log(`🔄 Restauration de la classe ${id}...`);
      
      const classe = classes.find(c => c.id === id);
      if (!classe) {
        throw new Error('Classe non trouvée');
      }

      const restoredClasse = await classeService.update(id, {
        ...classe,
        statut_classe: 'actif',
      });

      if (restoredClasse) {
        setClasses(classes.map(c => c.id === id ? restoredClasse : c));
        console.log('✅ Classe restaurée avec succès');
        setError(null);
      }
      return restoredClasse || null;
    } catch (err) {
      console.error('❌ Erreur restauration classe:', err);
      setError('Erreur lors de la restauration de la classe');
      return null;
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return (
    <ClasseContext.Provider
      value={{
        classes,
        loading,
        error,
        fetchClasses,
        refreshClasses,
        createClasse,
        updateClasse,
        deleteClasse,
        restoreClasse,
      }}
    >
      {children}
    </ClasseContext.Provider>
  );
}

export function useClasses() {
  const context = useContext(ClasseContext);
  if (!context) {
    throw new Error("useClasses must be used within ClasseProvider");
  }
  return context;
}