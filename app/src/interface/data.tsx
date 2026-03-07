//eleve

export interface Eleve {
    id: string;
    id_individu: string;
    identite: Individu;
    id_classe: string;
    classe: Classe;
    stat: Stat[];
    date_premier_inscription:string;
    en_regle:boolean;
    gbevou: boolean;
    frais_scolarite: Tranche[];
    penalite:Penalite[];
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

export interface Classe{

    id: string;
    libelle_classe: string;
    titulaire_classe: string;
    nombre_eleve: number;
    nombre_enseignant: number;
    nombre_matiere:number;
    scolarite: number;
}

//matiere

export interface matiere{
    id: string;
    id_enseignant: string;
    libelle_matiere: string;
    enseignant: string;
    coef: number;
}

//Enseignant

export interface Enseignant{
    id: string;
    id_individu: string;
    identite: Individu;
    id_classe: string;
    id_matiere: string;
    classe:string;
    matiere: string;
    date_embauche: string;
    statut_ensiegnant: string;
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
    

