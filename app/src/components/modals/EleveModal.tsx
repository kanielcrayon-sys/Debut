"use client"
import React, { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from "@mui/material";
import { Eleve, CreateEleveInput, UpdateEleveInput, Classe, Individu } from "@/app/src/interface/data";
import { useClasses } from "@/app/src/context/classeContext";

interface EleveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateEleveInput | UpdateEleveInput) => void;
  eleve?: Eleve | null;
  isEditing?: boolean;
  classes?: Classe[];
}

const initialFormData: CreateEleveInput = {
  identite: {
    nom_individu: "",
    prenom_individu: "",
    date_naissance: "",
    sexe: "",
    ville: "",
    nationalite: "",
    email: "",
    contact: "",
    vehicule: "",
  },
  id_classe: "",
  classe: "",
  date_premier_inscription: new Date().toISOString().split("T")[0],
  en_regle: false,
  gbevou: false,
  statut_eleve: "actif",
  nom_tuteur: "",
  profession_tuteur: "",
  contact_tuteur: "",
};

export default function EleveModal({
  open,
  onClose,
  onSave,
  eleve,
  isEditing = false,
  classes: propClasses,
}: EleveModalProps) {
  const { classes: contextClasses } = useClasses();
  const classes = propClasses || contextClasses;
  const [_, startTransition] = useTransition();
  const isInitialized = useRef(false);
  
  const activeClasses = useMemo(() => {
    return classes.filter(c => !c.statut_classe || c.statut_classe === "actif");
  }, [classes]);

  const [formValues, setFormValues] = useState<CreateEleveInput>(initialFormData);

  // ✅ INITIALISER QUAND LE MODAL S'OUVRE
  useEffect(() => {
    if (open && !isInitialized.current) {
      isInitialized.current = true;
      console.log("📍 Initializing form for modal open");
      
      if (isEditing && eleve && eleve.identite) {
        console.log("✅ Loading eleve data:", eleve);
        startTransition(() => {
          setFormValues({
            identite: eleve.identite,
            id_classe: eleve.id_classe || "",
            classe: eleve.classe || "",
            date_premier_inscription: eleve.date_premier_inscription || initialFormData.date_premier_inscription,
            en_regle: eleve.en_regle || false,
            gbevou: eleve.gbevou || false,
            statut_eleve: eleve.statut_eleve || "actif",
            nom_tuteur: eleve.nom_tuteur || "",
            profession_tuteur: eleve.profession_tuteur || "",
            contact_tuteur: eleve.contact_tuteur || "",
          });
        });
      } else {
        console.log("➕ Empty form");
        startTransition(() => {
          setFormValues(initialFormData);
        });
      }
    }
    
    // Réinitialiser le flag quand le modal ferme
    if (!open) {
      isInitialized.current = false;
    }
  }, [open]);

  const handleIdentiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // ✅ METTRE EN MAJUSCULES SI C'EST LE NOM
    let finalValue = value;
    if (name === "nom_individu") {
      finalValue = value.toUpperCase();
    }
    
    startTransition(() => {
      setFormValues((prev) => ({
        ...prev,
        identite: {
          ...prev.identite,
          [name]: finalValue,
        },
      }));
    });
  };

  const handleInputChange = (field: keyof CreateEleveInput, value: string | boolean) => {
    // ✅ METTRE EN MAJUSCULES SI C'EST LE NOM DU TUTEUR
    let finalValue = value;
    if (field === "nom_tuteur" && typeof value === "string") {
      finalValue = value.toUpperCase();
    }
    
    startTransition(() => {
      setFormValues((prev) => ({
        ...prev,
        [field]: finalValue,
      }));
    });
  };

  const handleClasseChange = (event: React.SyntheticEvent, value: Classe | null) => {
    startTransition(() => {
      setFormValues((prev) => ({
        ...prev,
        id_classe: value?.id || "",
        classe: value?.libelle_classe || "",
      }));
    });
  };

  const handleSexeChange = (event: React.SyntheticEvent, value: string | null) => {
    if (value) {
      startTransition(() => {
        setFormValues((prev) => ({
          ...prev,
          identite: {
            ...prev.identite,
            sexe: value,
          },
        }));
      });
    }
  };

  const handleSave = () => {
    if (
      !formValues.identite.nom_individu ||
      !formValues.identite.prenom_individu ||
      !formValues.id_classe ||
      !formValues.identite.date_naissance ||
      !formValues.identite.sexe ||
      !formValues.nom_tuteur ||
      !formValues.contact_tuteur
    ) {
      alert("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    if (isEditing && eleve) {
      onSave({
        ...formValues,
        id: eleve.id,
      } as UpdateEleveInput);
    } else {
      onSave(formValues);
    }

    onClose();
  };

  const selectedClasse = formValues.id_classe
    ? activeClasses.find((c) => c.id === formValues.id_classe)
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Élève" : "Ajouter Élève"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Identité</h3>
            <div className="flex flex-col gap-3">
              <TextField fullWidth label="Nom *" name="nom_individu" value={formValues.identite.nom_individu} onChange={handleIdentiteChange} variant="outlined" size="small" placeholder="Sera automatiquement en MAJUSCULES" />
              <TextField fullWidth label="Prénom *" name="prenom_individu" value={formValues.identite.prenom_individu} onChange={handleIdentiteChange} variant="outlined" size="small" />
              <TextField fullWidth label="Date de naissance *" name="date_naissance" type="date" value={formValues.identite.date_naissance} onChange={handleIdentiteChange} variant="outlined" size="small" InputLabelProps={{ shrink: true }} />
              <Autocomplete options={["M", "F"]} value={formValues.identite.sexe || null} onChange={handleSexeChange} renderInput={(params) => <TextField {...params} label="Sexe *" variant="outlined" size="small" />} />
              <TextField fullWidth label="Email" name="email" type="email" value={formValues.identite.email} onChange={handleIdentiteChange} variant="outlined" size="small" />
              <TextField fullWidth label="Contact" name="contact" value={formValues.identite.contact} onChange={handleIdentiteChange} variant="outlined" size="small" />
              <TextField fullWidth label="Ville" name="ville" value={formValues.identite.ville} onChange={handleIdentiteChange} variant="outlined" size="small" />
              <TextField fullWidth label="Nationalité" name="nationalite" value={formValues.identite.nationalite} onChange={handleIdentiteChange} variant="outlined" size="small" />
              <TextField fullWidth label="Véhicule" name="vehicule" value={formValues.identite.vehicule} onChange={handleIdentiteChange} variant="outlined" size="small" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Classe</h3>
            <Autocomplete options={activeClasses} getOptionLabel={(option) => option.libelle_classe} isOptionEqualToValue={(option, value) => option.id === value?.id} value={selectedClasse || null} onChange={handleClasseChange} renderInput={(params) => <TextField {...params} label="Classe *" variant="outlined" size="small" />} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tuteur</h3>
            <div className="flex flex-col gap-3">
              <TextField fullWidth label="Nom du tuteur *" value={formValues.nom_tuteur} onChange={(e) => handleInputChange("nom_tuteur", e.target.value)} variant="outlined" size="small" placeholder="Sera automatiquement en MAJUSCULES" />
              <TextField fullWidth label="Profession du tuteur" value={formValues.profession_tuteur} onChange={(e) => handleInputChange("profession_tuteur", e.target.value)} variant="outlined" size="small" />
              <TextField fullWidth label="Contact du tuteur *" value={formValues.contact_tuteur} onChange={(e) => handleInputChange("contact_tuteur", e.target.value)} variant="outlined" size="small" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Autres informations</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formValues.en_regle} onChange={(e) => handleInputChange("en_regle", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-900 dark:text-white">En règle</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formValues.gbevou} onChange={(e) => handleInputChange("gbevou", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-900 dark:text-white">GBEVOU</span>
              </label>
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">Annuler</Button>
        <Button onClick={handleSave} variant="contained" className="!bg-blue-600">{isEditing ? "Modifier" : "Ajouter"}</Button>
      </DialogActions>
    </Dialog>
  );
}