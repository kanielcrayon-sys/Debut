"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { Professeur, CreateProfesseurInput, UpdateProfesseurInput } from "@/app/src/interface/data";

interface ProfesseurModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (professeur: CreateProfesseurInput | UpdateProfesseurInput) => void;
  professeur?: Professeur | null;
  isEditing?: boolean;
}

const initialFormData: CreateProfesseurInput = {
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
  id_matiere: [],
  date_embauche: new Date().toISOString().split("T")[0],
  statut_enseignant: "Licence",
  personnage_a_contacter: "",
  contact_personne_a_contacter: "",
  salaire: 0,
};

const diplomes = ["BAC", "Licence", "Master", "Bac+2", "CAP1", "CAP2", "CAP CEG"];

export default function ProfesseurModal({
  open,
  onClose,
  onSave,
  professeur,
  isEditing = false,
}: ProfesseurModalProps) {
  const [formData, setFormData] = useState<CreateProfesseurInput>(initialFormData);

  const defaultFormData = useMemo(() => {
    if (open && professeur && isEditing) {
      return {
        identite: professeur.identite,
        id_classe: professeur.id_classe,
        id_matiere: professeur.id_matiere || [],
        date_embauche: professeur.date_embauche,
        statut_enseignant: professeur.statut_enseignant,
        personnage_a_contacter: professeur.personnage_a_contacter,
        contact_personne_a_contacter: professeur.contact_personne_a_contacter,
        salaire: professeur.salaire,
      };
    }
    return initialFormData;
  }, [open, professeur, isEditing]);

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

  const handleFieldChange = (field: string, value: string | number) => {
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
      !formData.personnage_a_contacter ||
      !formData.contact_personne_a_contacter ||
      formData.salaire === 0
    ) {
      alert("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    if (isEditing && professeur) {
      onSave({
        id: professeur.id,
        id_individu: professeur.id_individu,
        ...formData,
      } as UpdateProfesseurInput);
    } else {
      onSave(formData);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Professeur" : "Ajouter Professeur"}
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

          <TextField
            fullWidth
            label="Véhicule"
            value={formData.identite.vehicule}
            onChange={(e) => handleIdentiteChange("vehicule", e.target.value)}
            variant="outlined"
            size="small"
          />

          {/* Professeur Info */}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">
            Informations Professionnelles
          </div>

          <TextField
            fullWidth
            label={`Date d'Embauche`}
            type="date"
            value={formData.date_embauche}
            onChange={(e) => handleFieldChange("date_embauche", e.target.value)}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Diplôme *</InputLabel>
            <Select
              value={formData.statut_enseignant}
              onChange={(e) => handleFieldChange("statut_enseignant", e.target.value)}
              label="Diplôme *"
            >
              {diplomes.map((diplome) => (
                <MenuItem key={diplome} value={diplome}>
                  {diplome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Salaire (FCFA) *"
            type="number"
            value={formData.salaire}
            onChange={(e) => handleFieldChange("salaire", parseInt(e.target.value))}
            variant="outlined"
            size="small"
          />

          {/* Contact d'urgence */}
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">
            {`Contact d'Urgence`}
          </div>

          <TextField
            fullWidth
            label="Personne à Contacter *"
            value={formData.personnage_a_contacter}
            onChange={(e) => handleFieldChange("personnage_a_contacter", e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Ex: Parent proche"
          />

          <TextField
            fullWidth
            label="Contact Personne *"
            value={formData.contact_personne_a_contacter}
            onChange={(e) => handleFieldChange("contact_personne_a_contacter", e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Ex: +33612345678"
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