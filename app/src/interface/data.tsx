//eleve

export interface Eleve {
  id: string;
  id_individu: string;
  identite: Individu;
  id_classe: string;
  classe: Classe;
  stat: Stat[];
  date_premier_inscription: string;
  en_regle: boolean;
  gbevou: boolean;
  frais_scolarite: Tranche[];
  penalite: Penalite[];
  statut_eleve: "actif" | "abandonné" | "suspendu";
  date_suppression?: string;
  // ✅ NOUVEAUX CHAMPS TUTEUR
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
  date_premier_inscription: string;
  en_regle: boolean;
  gbevou: boolean;
  statut_eleve: "actif" | "abandonné" | "suspendu";
  // ✅ NOUVEAUX CHAMPS TUTEUR
  nom_tuteur: string;
  profession_tuteur: string;
  contact_tuteur: string;
}

export interface UpdateEleveInput extends CreateEleveInput {
  id: string;
  id_individu: string;
}

//individu

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
    vehicule:string;

}

//stat

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
    jour: number ;
    mois: number;
    annee: number;
    date: string;

}

//note

export interface Note{
    id: string;
    valeur: number;
    matiere: string;
    type_evaluation: string;
    observation: string;
    rang: string;

}

//classe

export interface Classe {
    id: string;
    libelle_classe: string;
    titulaire_classe: string;
    id_titulaire: string;  // ← ID du professeur titulaire
    id_matieres: string[]; // ← Array d'IDs de matières
    matieres: string[];    // ← Array de noms de matières
    nombre_eleve: number;  // Calculé à partir des élèves
    nombre_enseignant: number; // Calculé à partir des enseignants
    nombre_matiere: number; // Calculé automatiquement (length id_matieres)
    scolarite: number;
}

// À AJOUTER aussi:
export interface CreateClasseInput {
    libelle_classe: string;
    id_titulaire: string;
    scolarite: number;
}

export interface UpdateClasseInput extends CreateClasseInput {
    id: string;
}

//matiere

// ===== MATIERE =====
export interface Matiere {
    id: string;
    id_enseignant?: string;  // Optional - peut être vide
    libelle_matiere: string;
    enseignant?: string;     // Optional - nom du prof
    coef: number;
    id_classe?: string;
}

export interface CreateMatiereInput {
    libelle_matiere: string;
    coef: number;
}

export interface UpdateMatiereInput extends CreateMatiereInput {
    id: string;
}

export interface AffecterProfInput {
    id_matiere: string;
    id_enseignant: string;
}

//Enseignant

//Enseignant

export interface Professeur {
    id: string;
    id_individu: string;
    identite: Individu;
    id_classe: string;
    id_matiere: string[];
    classe: string;
    matieres: string[]; // Array de noms de matières
    date_embauche: string;
    statut_enseignant: "BAC" | "Licence" | "Master" | "Bac+2" | "CAP1" | "CAP2" | "CAP CEG";
    personnage_a_contacter: string; // Nom du parent proche
    contact_personne_a_contacter: string; // Contact du parent
    salaire: number;
}

export interface CreateProfesseurInput {
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
    id_matiere: string[];
    date_embauche: string;
    statut_enseignant: "BAC" | "Licence" | "Master" | "Bac+2" | "CAP1" | "CAP2" | "CAP CEG";
    personnage_a_contacter: string;
    contact_personne_a_contacter: string;
    salaire: number;
}

export interface UpdateProfesseurInput extends CreateProfesseurInput {
    id: string;
    id_individu: string;
}

//tranche

export interface Tranche{
    id: string;
    type_tranche: string;
    montant: number;
    date: string;
    its_over: boolean;
}

//penalite

export interface Penalite{
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

//user

export interface Users{
    id: string;
    pseudo: string;
    password: string;
    email: string;
    contact: string;
    token: string;
    register_date: string;
    login_date: string;

}
    

// Types pour le formulaire (ajoute à la fin du fichier)

