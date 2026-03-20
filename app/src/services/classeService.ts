import { Classe, CreateClasseInput, UpdateClasseInput } from '@/app/src/interface/data';
import { mockProfesseurs } from '@/app/src/data/mockData'; // ✅ AJOUTE

const API_BASE = '/api';

export const classeService = {
  // 📖 Récupérer toutes les classes
  async getAll(): Promise<Classe[]> {
    const res = await fetch(`${API_BASE}/classes`);
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de récupérer les classes`);
    }
    return res.json();
  },

  // 📖 Récupérer une classe par ID
  async getById(id: string): Promise<Classe> {
    const res = await fetch(`${API_BASE}/classes/${id}`);
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Classe non trouvée`);
    }
    return res.json();
  },

  // 📝 Créer une nouvelle classe
  async create(data: CreateClasseInput): Promise<Classe> {
    // ✅ RÉCUPÈRE LE NOM DU PROFESSEUR
    let titulaire_classe = "";
    if (data.id_titulaire) {
      const prof = mockProfesseurs.find(p => p.id === data.id_titulaire);
      if (prof) {
        titulaire_classe = `${prof.identite.prenom_individu} ${prof.identite.nom_individu}`;
      }
    }

    const res = await fetch(`${API_BASE}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        titulaire_classe, // ✅ AJOUTE LE NOM
      }),
    });
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de créer la classe`);
    }
    return res.json();
  },

  // 🟡 Mettre à jour une classe
  async update(id: string, data: UpdateClasseInput): Promise<Classe> {
    console.log('📤 Envoi UPDATE:', { id, data });
    
    // ✅ RÉCUPÈRE LE NOM DU PROFESSEUR SI id_titulaire CHANGE
    let titulaire_classe = data.titulaire_classe;
    if (data.id_titulaire) {
      const prof = mockProfesseurs.find(p => p.id === data.id_titulaire);
      if (prof) {
        titulaire_classe = `${prof.identite.prenom_individu} ${prof.identite.nom_individu}`;
      }
    }
    
    const res = await fetch(`${API_BASE}/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        titulaire_classe, // ✅ AJOUTE LE NOM
      }),
    });
    
    console.log('📥 Réponse UPDATE:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erreur réponse:', errorText);
      throw new Error(`Erreur ${res.status}: Impossible de mettre à jour la classe`);
    }
    return res.json();
  },

  // 🔴 Supprimer une classe
  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/classes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de supprimer la classe`);
    }
    return true;
  },
};