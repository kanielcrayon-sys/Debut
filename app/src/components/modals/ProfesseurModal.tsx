"use client"
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem, FormControl, InputLabel, Alert } from "@mui/material";
import { Professeur, CreateProfesseurInput, UpdateProfesseurInput } from "@/app/src/interface/data";

interface ProfesseurModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (professeur: CreateProfesseurInput | UpdateProfesseurInput) => Promise<void>;
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
    email: "", // ✅ OPTIONNEL
    contact: "",
    vehicule: "",
  },
  id_classe: "1",
  id_matiere: [],
  date_embauche: new Date().toISOString().split("T")[0],
  diplome_enseignant: "Licence",
  personnage_a_contacter: "",
  contact_personne_a_contacter: "",
  salaire: 0,
  poste: "Enseignant", // ✅ Default
};

const diplomes = ["BAC", "Licence", "Master", "Bac+2", "CAP1", "CAP2", "CAP CEG"];
const postes = ["Directeur", "Directeur-Adjoint", "Censeur", "Surveillant", "Enseignant"];

export default function ProfesseurModal({
  open,
  onClose,
  onSave,
  professeur,
  isEditing = false,
}: ProfesseurModalProps) {
  const [formData, setFormData] = useState<CreateProfesseurInput>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ RÉINITIALISE QUAND LE MODAL S'OUVRE/FERME
  React.useEffect(() => {
    if (open) {
      if (isEditing && professeur) {
        setFormData({
          identite: professeur.identite,
          id_classe: professeur.id_classe,
          id_matiere: professeur.id_matiere || [],
          date_embauche: professeur.date_embauche,
          diplome_enseignant: professeur.diplome_enseignant,
          personnage_a_contacter: professeur.personnage_a_contacter,
          contact_personne_a_contacter: professeur.contact_personne_a_contacter,
          salaire: professeur.salaire,
          poste: professeur.poste,
        });
      } else {
        setFormData(initialFormData);
      }
      setError(null);
      setWarning(null);
    }
  }, [open, isEditing, professeur]);

  const handleIdentiteChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      identite: {
        ...prev.identite,
        [field]: value,
      },
    }));
    setError(null);
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setWarning(null);
    
    // ✅ VALIDATION
    if (!formData.identite.nom_individu || !formData.identite.prenom_individu) {
      setError("Nom et prénom obligatoires (*)");
      return;
    }

    if (!formData.identite.contact) {
      setError("Contact obligatoire (*) - Rendez l'email optionnel");
      return;
    }

    if (!formData.personnage_a_contacter || !formData.contact_personne_a_contacter || formData.salaire === 0) {
      setError("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    try {
      setSaving(true);
      
      if (isEditing && professeur) {
        await onSave({
          id: professeur.id,
          id_individu: professeur.id_individu,
          ...formData,
        } as UpdateProfesseurInput);
      } else {
        await onSave(formData);
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        // ✅ CHECK SI C'EST UN WARNING (nom/prenom existe)
        if (err.message.includes("existe déjà")) {
          setWarning(
            `⚠️ ${err.message}\n\nVoulez-vous continuer quand même?`
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Erreur lors de la sauvegarde");
      }
      console.error("❌ Erreur save:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Professeur" : "Ajouter Professeur"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {/* ✅ AFFICHE L'ERREUR SI ELLE EXISTE */}
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* ✅ AFFICHE L'AVERTISSEMENT SI ELLE EXISTE */}
          {warning && (
            <Alert severity="warning" className="mb-4">
              {warning}
            </Alert>
          )}

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
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Prénom *"
            value={formData.identite.prenom_individu}
            onChange={(e) => handleIdentiteChange("prenom_individu", e.target.value)}
            variant="outlined"
            size="small"
            disabled={saving}
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
            disabled={saving}
          />

          <FormControl fullWidth size="small" disabled={saving}>
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
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Nationalité"
            value={formData.identite.nationalite}
            onChange={(e) => handleIdentiteChange("nationalite", e.target.value)}
            variant="outlined"
            size="small"
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.identite.email}
            onChange={(e) => handleIdentiteChange("email", e.target.value)}
            variant="outlined"
            size="small"
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Contact *"
            value={formData.identite.contact}
            onChange={(e) => handleIdentiteChange("contact", e.target.value)}
            variant="outlined"
            size="small"
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Véhicule"
            value={formData.identite.vehicule}
            onChange={(e) => handleIdentiteChange("vehicule", e.target.value)}
            variant="outlined"
            size="small"
            disabled={saving}
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
            disabled={saving}
          />

          <FormControl fullWidth size="small" disabled={saving}>
            <InputLabel>Diplôme *</InputLabel>
            <Select
              value={formData.diplome_enseignant}
              onChange={(e) => handleFieldChange("diplome_enseignant", e.target.value)}
              label="Diplôme *"
            >
              {diplomes.map((diplome) => (
                <MenuItem key={diplome} value={diplome}>
                  {diplome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={saving}>
            <InputLabel>Poste</InputLabel>
            <Select
              value={formData.poste || "Enseignant"}
              onChange={(e) => handleFieldChange("poste", e.target.value)}
              label="Poste"
            >
              {postes.map((poste) => (
                <MenuItem key={poste} value={poste}>
                  {poste}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Salaire (FCFA) *"
            type="number"
            value={formData.salaire}
            onChange={(e) => handleFieldChange("salaire", parseInt(e.target.value) || 0)}
            variant="outlined"
            size="small"
            disabled={saving}
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
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Contact Personne *"
            value={formData.contact_personne_a_contacter}
            onChange={(e) => handleFieldChange("contact_personne_a_contacter", e.target.value)}
            variant="outlined"
            size="small"
            placeholder="Ex: +33612345678"
            disabled={saving}
          />
        </div>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white" disabled={saving}>
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          className="!bg-blue-600"
          disabled={saving}
        >
          {saving ? "Enregistrement..." : (isEditing ? "Modifier" : "Ajouter")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}