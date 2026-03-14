"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Checkbox } from "@mui/material";
import { Eleve, Classe, CreateEleveInput, UpdateEleveInput } from "@/app/src/interface/data";

interface EleveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (eleve: CreateEleveInput | UpdateEleveInput) => void;
  eleve?: Eleve | null;
  isEditing?: boolean;
  classes: Classe[]; // ✅ NOUVEAU
}

const initialFormData: CreateEleveInput = {
  identite: {
    nom_individu: "",
    prenom_individu: "",
    date_naissance: "",
    sexe: "M",
    ville: "",
    nationalite: "Française",
    email: "",
    contact: "",
    vehicule: "",
  },
  id_classe: "1",
  date_premier_inscription: new Date().toISOString().split("T")[0],
  en_regle: true,
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
  classes, // ✅ NOUVEAU
}: EleveModalProps) {
  const [formData, setFormData] = useState<CreateEleveInput>(initialFormData);

  const defaultFormData = useMemo(() => {
    if (open && eleve && isEditing) {
      return {
        identite: eleve.identite,
        id_classe: eleve.id_classe,
        date_premier_inscription: eleve.date_premier_inscription,
        en_regle: eleve.en_regle,
        gbevou: eleve.gbevou,
        statut_eleve: eleve.statut_eleve,
        nom_tuteur: eleve.nom_tuteur,
        profession_tuteur: eleve.profession_tuteur,
        contact_tuteur: eleve.contact_tuteur,
      };
    }
    return initialFormData;
  }, [open, eleve, isEditing]);

  React.useEffect(() => {
    setFormData(defaultFormData);
  }, [defaultFormData]);

  const handleIdentiteChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      identite: {
        ...prev.identite,
        [field]: value,
      },
    }));
  };

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (
      !formData.identite.nom_individu ||
      !formData.identite.prenom_individu ||
      !formData.identite.email ||
      !formData.nom_tuteur ||
      !formData.contact_tuteur
    ) {
      alert("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    if (isEditing && eleve) {
      onSave({
        id: eleve.id,
        id_individu: eleve.id_individu,
        ...formData,
      } as UpdateEleveInput);
    } else {
      onSave(formData);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Élève" : "Ajouter Élève"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {/* Identité */}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
            Informations Personnelles
          </div>

          <TextField
            fullWidth
            label="Nom *"
            value={formData.identite.nom_individu}
            onChange={(e) => handleIdentiteChange("nom_individu", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label="Prénom *"
            value={formData.identite.prenom_individu}
            onChange={(e) => handleIdentiteChange("prenom_individu", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label="Date de Naissance"
            type="date"
            value={formData.identite.date_naissance}
            onChange={(e) => handleIdentiteChange("date_naissance", e.target.value)}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Sexe</InputLabel>
            <Select
              value={formData.identite.sexe}
              onChange={(e) => handleIdentiteChange("sexe", e.target.value)}
              label="Sexe"
            >
              <MenuItem value="M">Masculin</MenuItem>
              <MenuItem value="F">Féminin</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Ville"
            value={formData.identite.ville}
            onChange={(e) => handleIdentiteChange("ville", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label="Nationalité"
            value={formData.identite.nationalite}
            onChange={(e) => handleIdentiteChange("nationalite", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label="Email *"
            type="email"
            value={formData.identite.email}
            onChange={(e) => handleIdentiteChange("email", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label="Contact"
            value={formData.identite.contact}
            onChange={(e) => handleIdentiteChange("contact", e.target.value)}
            variant="outlined"
            size="small"
          />

          {/* Classe */}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">
            Information Scolaire
          </div>

          <FormControl fullWidth size="small">
            <InputLabel>Classe *</InputLabel>
            <Select
              value={formData.id_classe}
              onChange={(e) => handleFieldChange("id_classe", e.target.value)}
              label="Classe *"
            >
              {classes.map((classe) => (
                <MenuItem key={classe.id} value={classe.id}>
                  {classe.libelle_classe}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label={`Date d'Inscription`}
            type="date"
            value={formData.date_premier_inscription}
            onChange={(e) => handleFieldChange("date_premier_inscription", e.target.value)}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Statut *</InputLabel>
            <Select
              value={formData.statut_eleve}
              onChange={(e) => handleFieldChange("statut_eleve", e.target.value)}
              label="Statut *"
            >
              <MenuItem value="actif">Actif</MenuItem>
              <MenuItem value="suspendu">Suspendu</MenuItem>
              <MenuItem value="abandonné">Abandonné</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.en_regle}
                onChange={(e) => handleFieldChange("en_regle", e.target.checked)}
              />
            }
            label="En Règle"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.gbevou}
                onChange={(e) => handleFieldChange("gbevou", e.target.checked)}
              />
            }
            label="GBEVOU"
          />

          {/* Tuteur */}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">
            Informations du Tuteur
          </div>

          <TextField
            fullWidth
            label={`Nom du Tuteur *`}
            value={formData.nom_tuteur}
            onChange={(e) => handleFieldChange("nom_tuteur", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label={`Profession du Tuteur`}
            value={formData.profession_tuteur}
            onChange={(e) => handleFieldChange("profession_tuteur", e.target.value)}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label={`Contact du Tuteur *`}
            value={formData.contact_tuteur}
            onChange={(e) => handleFieldChange("contact_tuteur", e.target.value)}
            variant="outlined"
            size="small"
          />
        </div>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" className="!bg-blue-600">
          {isEditing ? "Modifier" : "Ajouter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}