// ===== ELEVE =====
// ===== ELEVE =====
export interface Eleve {
  id: string;
  id_individu: string;
  identite: Individu;
  id_classe: string;
  classe: string;
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
  statut_scolarite?: "en_cours" | "sorti";
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
  classe?: string;
  date_premier_inscription: string;
  en_regle: boolean;
  gbevou: boolean;
  statut_eleve: "actif" | "abandonné" | "suspendu";
  nom_tuteur: string;
  profession_tuteur: string;
  contact_tuteur: string;
}

// ✅ PAS DE Partial! TOUS LES CHAMPS OBLIGATOIRES COMME CreateEleveInput
export interface UpdateEleveInput extends CreateEleveInput {
  id?: string;
  id_individu?: string;
  date_suppression?: string;
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
export type NoteObservation =
  | "Excellent"
  | "Très bien"
  | "Bien"
  | "Assez bien"
  | "Passable"
  | "Insuffisant"
  | "Peut mieux faire";

export type StatObservation =
  | "Excellent"
  | "Très bien"
  | "Bien"
  | "Assez bien"
  | "Passable"
  | "Insuffisant"
  | "Très insuffisant";
// ===== STAT (MISE À JOUR) =====
export interface Stat {
  id: string;
  id_eleve: string;
  id_classe: string;
  id_matiere: string;
  id_enseignant: string;
  enseignant: string;
  classe: string;
  matiere: string;
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
  repartition: "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
  notes: Note[];
  jour: number;
  mois: number;
  annee: number;
  date: string;
  
  // Champs de notes
  I1?: number;
  I2?: number;
  I3?: number;
  I4?: number;
  I5?: number;
  I6?: number;
  Devoir?: number;
  Compo?: number;
  
  // Moyennes calculées
  moyenne_classe?: number;
  moyenne_matiere?: number;
  note_definitive?: number;  // 👈 AJOUTER ÇA
  coef?: number;  
  rang?: number;
rang_label?: string;
observations?: StatObservation;
  // Statut
  cloture: boolean;
  date_cloture?: string;
  createdAt?: string;
  updatedAt?: string;
  annee_scolaire: number;
}

// ===== NOTE =====
export interface Note {
  id: string;
  valeur: number;
  type_evaluation: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO";
  observation: NoteObservation;
  rang?: number;
  isSpecial?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ===== BULLETIN =====
export type VerdictBulletin = "Admis" | "Échoué" | "Admis par décision";
export interface Bulletin {
  id: string;
  id_eleve: string;
  id_classe: string;
  eleve_nom: string;
  eleve_prenom: string;
  classe: string;
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
  repartition: "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
  stats: Stat[];
  
  // Moyennes
  moyenne_trimestrielle?: number;
  moyenne_annuelle?: number;
  
  // ✅ RANG (basé sur moyenne_trimestrielle ou moyenne_annuelle selon repartition)
  rang?: number;
   search_nom_prenom?: string;
  // Verdict & Observation
  verdict: VerdictBulletin;
  observation:StatObservation;
  
  // Date
  jour: number;
  mois: number;
  annee: number;
  date: string;
  
  // Status
  publie: boolean;
  createdAt?: string;
  updatedAt?: string;
  annee_scolaire: number;
}

// ===== MOYENNE GÉNÉRALE CLASSE =====
// ✅ NOUVELLE INTERFACE POUR TRACKER LA MOYENNE GÉNÉRALE PAR CLASSE
export interface MoyenneGeneraleClasse {
  id: string;
  id_classe: string;
  classe: string;
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
  repartition: "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
  
  // Moyenne générale de la classe pour ce stat
  moyenneGenerale: number;
  
  // Nombre d'élèves dans la classe
  nombreEleves: number;
  
  // Date
  jour: number;
  mois: number;
  annee: number;
  date: string;
  
  createdAt?: string;
  updatedAt?: string;
}

// ===== CREATE INPUTS =====
export interface CreateStatInput {
  id_classe: string;
  id_matiere: string;
  id_enseignant: string;
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
  repartition: "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
}

export interface AddNoteToStatInput {
  id_stat: string;
  id_eleve: string;
  valeur: number;
  type_evaluation: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO";
}

export interface CreateBulletinInput {
  id_eleve: string;
  id_classe: string;
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
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
  id_classe_suivante?: string | null;
   classe_suivante_libelle?: string | null;
}

export interface CreateClasseInput {
  libelle_classe: string;
  id_titulaire: string;
  scolarite: number;
   id_classe_suivante?: string | null;
  classe_suivante_libelle?: string | null;
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
  id_classe_suivante?: string | null;
   classe_suivante_libelle?: string | null;
}
// ===== MATIERE =====
// ===== MATIERE =====
export interface Matiere {
  id: string;
  id_enseignant?: string | null;
  libelle_matiere: string;
  enseignant?: string | null;
  coef: number;
  qualificatif: "Fondamentale" | "Facultative"; // ✅ NOUVEAU
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
  qualificatif?: "Fondamentale" | "Facultative"; // ✅ NOUVEAU
  id_classe?: string;
  classe?: string;
}

export interface UpdateMatiereInput extends Partial<CreateMatiereInput> {
  id?: string;
  id_enseignant?: string | null | undefined;
  enseignant?: string | null | undefined;
  qualificatif?: "Fondamentale" | "Facultative"; // ✅ NOUVEAU
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
  email: string;
  contact: string;
  register_date: string;
  login_date?: string;
  role?: string;
}

//info utile
export interface Infogecole {
  id: string;
  nombre_eleve: number;
  nombre_abandon: number;
  nombre_admis: number;
  nombre_echec: number;  
 
}


// Ajoute ceci à la fin du fichier:

export interface EvaluationFlash {
  id: string;
  id_eleve: string;
  id_matiere: string;
  id_classe: string;
  note: number | null;  // ✅ Peut être null au départ
  coef: number;
  moyenne_evaluation: number | null;  // ✅ Peut être null
  
  // Optionnel - Lié à un Stat
  id_stat?: string | null;
  type_note_stat?: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO" | null;
  
  cloture: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  
  // ✅ AJOUTE CES CHAMPS (comme dans ton POST)
  classe?: string;
  matiere?: string;
  enseignant?: string;
  id_enseignant?: string | null;
  jour?: number;
  mois?: number;
  annee?: number;
  date?: string;
  stat_lie?: string | null;
  type_note?: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO" | null;
}

export interface CreateEvaluationFlashInput {
  id_eleve: string;
  id_matiere: string;
  id_classe: string;
  note?: number | null;  // ✅ Optionnel
  id_stat?: string | null;
  type_note_stat?: "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO" | null;
}

export interface UpdateEvaluationFlashInput extends Partial<CreateEvaluationFlashInput> {
  id?: string;
}

export interface Inscription {
  id: string;
  id_eleve: string;

  annee_scolaire: number;

  id_classe: string;
  classe: string;

  anciennete: "nouveau" | "ancien";

  origine_id_classe?: string | null;
  origine_classe?: string | null;

  verdict_fin_annee?: VerdictBulletin | null;

  createdAt?: string;
}