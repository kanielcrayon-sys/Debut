import { Eleve, CreateEleveInput, UpdateEleveInput } from '@/app/src/interface/data';

const API_BASE = '/api';

export const eleveService = {
  // 📖 Récupérer tous les élèves
  async getAll(): Promise<Eleve[]> {
    const res = await fetch(`${API_BASE}/eleves`);
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de récupérer les élèves`);
    }
    return res.json();
  },

  // 📖 Récupérer un élève par ID
  async getById(id: string): Promise<Eleve> {
    const res = await fetch(`${API_BASE}/eleves/${id}`);
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Élève non trouvé`);
    }
    return res.json();
  },

  // 📝 Créer un nouvel élève
  async create(data: CreateEleveInput): Promise<Eleve> {
    const res = await fetch(`${API_BASE}/eleves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de créer l'élève`);
    }
    // ✅ LA SYNC SE FERA AUTOMATIQUEMENT VIA LE HOOK useSyncClasseStats
    return res.json();
  },

  // 🟡 Mettre à jour un élève
  async update(id: string, data: UpdateEleveInput): Promise<Eleve> {
    console.log('📤 Envoi UPDATE:', { id, data });
    
    const res = await fetch(`${API_BASE}/eleves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    console.log('📥 Réponse UPDATE:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Erreur réponse:', errorText);
      throw new Error(`Erreur ${res.status}: Impossible de mettre à jour l'élève`);
    }
    // ✅ LA SYNC SE FERA AUTOMATIQUEMENT VIA LE HOOK useSyncClasseStats
    return res.json();
  },

  // 🔴 Supprimer un élève
  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/eleves/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Erreur ${res.status}: Impossible de supprimer l'élève`);
    }
    // ✅ LA SYNC SE FERA AUTOMATIQUEMENT VIA LE HOOK useSyncClasseStats
    return true;
  },
};