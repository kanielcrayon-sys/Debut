// ===== ELEVE =====
// ===== ELEVE =====
export interface Eleve {
  id: string;
  id_individu: string;
  identite: Individu;
  id_classe: string;
  classe: string; // ✅ CHANGER DE Classe À string
  stat: Stat[];
  date_premier_inscription: string;
  en_regle: boolean;
  gbevou: boolean;
  frais_scolarite: Tranche[];
  penalite: Penalite[];
  statut_eleve: "actif" | "abandonné" | "suspendu";
  date_suppression?: string;
  nom_tuteur: string;
  profession_tuteur: string;
  contact_tuteur: string;
}

export interface CreateEleveInput {
  identite: {
    nom_individu: string;
    prenom_individu: string;
    date_naissance: string;
    sexe: string;
    ville: string;
    nationalite: string;
    email: string;
    contact: string;
    vehicule: string;
  };
  id_classe: string;
  classe?: string; // ✅ Optionnel
  date_premier_inscription: string;
  en_regle: boolean;
  gbevou: boolean;
  statut_eleve: "actif" | "abandonné" | "suspendu";
  nom_tuteur: string;
  profession_tuteur: string;
  contact_tuteur: string;
}

export interface UpdateEleveInput extends Partial<CreateEleveInput> {
  id?: string;
  id_individu?: string;
}

// ===== INDIVIDU =====
export interface Individu {
  id: string;
  nom_individu: string;
  prenom_individu: string;
  date_naissance: string;
  sexe: string;
  ville: string;
  nationalite: string;
  avatar: string;
  email: string;
  contact: string;
  vehicule: string;
}

// ===== STAT =====
export interface Stat {
  id: string;
  id_eleve: string;
  id_classe: string;
  id_enseignant: string;
  enseignant: string;
  classe: string;
  type_evaluation: string;
  note: Note[];
  observation: string;
  jour: number;
  mois: number;
  annee: number;
  date: string;
}

// ===== NOTE =====
export interface Note {
  id: string;
  valeur: number;
  matiere: string;
  type_evaluation: string;
  observation: string;
  rang: string;
}

// ===== CLASSE =====
export interface Classe {
  id: string;
  libelle_classe: string;
  titulaire_classe: string;
  id_titulaire: string;
  id_matieres: string[];
  matieres: string[];
  nombre_eleve: number;
  nombre_enseignant: number;
  nombre_matiere: number;
  scolarite: number;
  statut_classe?: "actif" | "abandonné" | "suspendu";
  date_suppression?: string;
}

export interface CreateClasseInput {
  libelle_classe: string;
  id_titulaire: string;
  scolarite: number;
}

export interface UpdateClasseInput extends Partial<CreateClasseInput> {
  id?: string;
  statut_classe?: "actif" | "abandonné" | "suspendu";
  date_suppression?: string;
  titulaire_classe?: string;
  nombre_eleve?: number;
  nombre_abandons?: number;
  // ✅ AJOUTER CES CHAMPS
  id_matieres?: string[];
  matieres?: string[];
  nombre_matiere?: number;
  id_classe?: string;
  classe?: string;
  nombre_enseignant?: number;
}
// ===== MATIERE =====
export interface Matiere {
  id: string;
  id_enseignant?: string | null;
  libelle_matiere: string;
  enseignant?: string | null;
  coef: number;
  id_classe?: string;
  classe?: string;
  statut_matiere?: "actif" | "abandonné";
  date_suppression?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateMatiereInput {
  libelle_matiere: string;
  coef: number;
  id_classe?: string;
  classe?: string;
}

export interface UpdateMatiereInput extends Partial<CreateMatiereInput> {
  id?: string;
  id_enseignant?: string | null | undefined;
  enseignant?: string | null | undefined;
  statut_matiere?: "actif" | "abandonné";
  date_suppression?: string | null;
}

export interface AffecterProfInput {
  id_matiere: string;
  id_enseignant: string;
}

// ===== PROFESSEUR =====
export interface Professeur {
  id: string;
  id_individu: string;
  identite: Individu;
  id_classe: string;
  id_matiere: string[];
  classe: string;
  matieres: string[];
  date_embauche: string;
  diplome_enseignant: "BAC" | "Licence" | "Master" | "Bac+2" | "CAP1" | "CAP2" | "CAP CEG";
  personnage_a_contacter: string;
  contact_personne_a_contacter: string;
  salaire: number;
  poste: "Directeur" | "Directeur-Adjoint" | "Censeur" | "Surveillant" | "Enseignant";
  is_titulaire: boolean;
  statut_enseignant: "actif" | "abandonné";
  date_suppression?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProfesseurInput {
  identite: {
    nom_individu: string;
    prenom_individu: string;
    date_naissance: string;
    sexe: string;
    ville: string;
    nationalite: string;
    email?: string;
    contact: string;
    vehicule: string;
  };
  id_classe: string;
  id_matiere: string[];
  date_embauche: string;
  diplome_enseignant: "BAC" | "Licence" | "Master" | "Bac+2" | "CAP1" | "CAP2" | "CAP CEG";
  personnage_a_contacter: string;
  contact_personne_a_contacter: string;
  salaire: number;
  poste?: "Directeur" | "Directeur-Adjoint" | "Censeur" | "Surveillant" | "Enseignant";
  is_titulaire?: boolean;
}

export interface UpdateProfesseurInput extends Partial<CreateProfesseurInput> {
  id?: string;
  id_individu?: string;
  id_matiere?: string[];
  matieres?: string[];
  poste?: "Directeur" | "Directeur-Adjoint" | "Censeur" | "Surveillant" | "Enseignant";
  is_titulaire?: boolean;
  statut_enseignant?: "actif" | "abandonné";
  date_suppression?: string;
}

// ===== TRANCHE =====
export interface Tranche {
  id: string;
  type_tranche: string;
  montant: number;
  date: string;
  its_over: boolean;
}

// ===== PENALITE =====
export interface Penalite {
  id: string;
  type_penalite: string;
  level: number;
  sanction: string;
  id_eleve: string;
  eleve: string;
  date_penalite: string;
  nom_senseur: string;
  id_senseur: string;
}

// ===== USERS =====
export interface Users {
  id: string;
  pseudo: string;
  password: string;
  email: string;
  contact: string;
  token: string;
  register_date: string;
  login_date: string;
}