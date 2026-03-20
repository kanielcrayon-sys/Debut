"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { Eleve, CreateEleveInput, UpdateEleveInput, Classe } from "@/app/src/interface/data";
import { eleveService } from "@/app/src/services/eleveService";

interface EleveContextType {
  eleves: Eleve[];
  loading: boolean;
  error: string | null;
  fetchEleves: () => Promise<void>;
  createEleve: (data: CreateEleveInput) => Promise<Eleve | null>;
  updateEleve: (id: string, data: UpdateEleveInput) => Promise<Eleve | null>;
  deleteEleve: (id: string) => Promise<boolean>;
  restoreEleve: (id: string) => Promise<Eleve | null>;
  refreshEleves: () => Promise<void>;
}

export const EleveContext = createContext<EleveContextType | undefined>(undefined);

// ✅ HELPER FUNCTION: TRANSFORMER LES DONNÉES (SANS any)
// ✅ HELPER FUNCTION: S'ASSURER QUE TOUS LES CHAMPS SONT PRÉSENTS
const transformEleveData = (data: CreateEleveInput | UpdateEleveInput): UpdateEleveInput => {
  return {
    identite: data.identite,
    id_classe: data.id_classe,
    classe: typeof data.classe === 'string' ? data.classe : "",
    date_premier_inscription: data.date_premier_inscription,
    en_regle: data.en_regle ?? false,
    gbevou: data.gbevou ?? false,
    statut_eleve: data.statut_eleve ?? "actif",
    nom_tuteur: data.nom_tuteur,
    profession_tuteur: data.profession_tuteur,
    contact_tuteur: data.contact_tuteur,
  };
};

export function EleveProvider({ children }: { children: ReactNode }) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEleves = async () => {
    try {
      setLoading(true);
      const data = await eleveService.getAll();
      setEleves(data || []);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur fetch élèves:', err);
      setError('Erreur lors du chargement des élèves');
      setEleves([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshEleves = async () => {
    try {
      console.log("🔄 Rafraîchissement des élèves...");
      const data = await eleveService.getAll();
      setEleves(data || []);
      console.log("✅ Élèves rafraîchis");
      setError(null);
    } catch (err) {
      console.error('❌ Erreur refresh élèves:', err);
      setError('Erreur lors du rafraîchissement des élèves');
    }
  };

  const createEleve = async (data: CreateEleveInput): Promise<Eleve | null> => {
    try {
      // ✅ TRANSFORMER LES DONNÉES AVANT D'ENVOYER
      const transformedData = transformEleveData(data);
      
      // ✅ CAST EN CreateEleveInput
      const newEleve = await eleveService.create(transformedData as CreateEleveInput);
      if (newEleve) {
        setEleves([...eleves, newEleve]);
        setError(null);
      }
      return newEleve || null;
    } catch (err) {
      console.error('❌ Erreur création élève:', err);
      setError('Erreur lors de la création de l\'élève');
      return null;
    }
  };

  const updateEleve = async (id: string, data: UpdateEleveInput): Promise<Eleve | null> => {
    try {
      // ✅ TRANSFORMER LES DONNÉES AVANT D'ENVOYER
      const transformedData = transformEleveData(data);
      
      const updatedEleve = await eleveService.update(id, transformedData);
      if (updatedEleve) {
        setEleves(eleves.map(e => e.id === id ? updatedEleve : e));
        setError(null);
      }
      return updatedEleve || null;
    } catch (err) {
      console.error('❌ Erreur mise à jour élève:', err);
      setError('Erreur lors de la mise à jour de l\'élève');
      return null;
    }
  };

  const deleteEleve = async (id: string): Promise<boolean> => {
    try {
      const success = await eleveService.delete(id);
      if (success) {
        setEleves(eleves.filter(e => e.id !== id));
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('❌ Erreur suppression élève:', err);
      setError('Erreur lors de la suppression de l\'élève');
      return false;
    }
  };

  const restoreEleve = async (id: string): Promise<Eleve | null> => {
    try {
      console.log(`🔄 Restauration de l'élève ${id}...`);
      
      const eleve = eleves.find(e => e.id === id);
      if (!eleve) {
        throw new Error('Élève non trouvé');
      }

      // ✅ CONSTRUIRE L'OBJET UpdateEleveInput CORRECTEMENT
      const updateData: UpdateEleveInput = {
        identite: eleve.identite,
        id_classe: eleve.id_classe,
        classe: (eleve.classe && typeof eleve.classe === 'object')
          ? (eleve.classe as Classe).libelle_classe
          : (typeof eleve.classe === 'string' ? eleve.classe : ""),
        date_premier_inscription: eleve.date_premier_inscription,
        en_regle: eleve.en_regle,
        gbevou: eleve.gbevou,
        statut_eleve: 'actif',
        nom_tuteur: eleve.nom_tuteur,
        profession_tuteur: eleve.profession_tuteur,
        contact_tuteur: eleve.contact_tuteur,
      };

      const restoredEleve = await eleveService.update(id, updateData);

      if (restoredEleve) {
        setEleves(eleves.map(e => e.id === id ? restoredEleve : e));
        console.log('✅ Élève restauré avec succès');
        setError(null);
      }
      return restoredEleve || null;
    } catch (err) {
      console.error('❌ Erreur restauration élève:', err);
      setError('Erreur lors de la restauration de l\'élève');
      return null;
    }
  };

  useEffect(() => {
    fetchEleves();
  }, []);

  return (
    <EleveContext.Provider
      value={{
        eleves,
        loading,
        error,
        fetchEleves,
        createEleve,
        updateEleve,
        deleteEleve,
        restoreEleve,
        refreshEleves,
      }}
    >
      {children}
    </EleveContext.Provider>
  );
}

export function useEleves() {
  const context = useContext(EleveContext);
  if (!context) {
    throw new Error("useEleves must be used within EleveProvider");
  }
  return context;
}