"use client"

import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { Matiere, CreateMatiereInput, UpdateMatiereInput } from "@/app/src/interface/data";

interface MatiereModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (matiere: CreateMatiereInput | UpdateMatiereInput) => Promise<void>;
  matiere?: Matiere | null;
  isEditing?: boolean;
}

const initialFormData: CreateMatiereInput = {
  libelle_matiere: "",
  coef: 1,
  qualificatif: "Fondamentale", // ✅ DÉFAUT
};

function MatiereModal({
  open,
  onClose,
  onSave,
  matiere,
  isEditing = false,
}: MatiereModalProps) {
  const [formData, setFormData] = useState<CreateMatiereInput>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ RÉINITIALISE QUAND LE MODAL S'OUVRE/FERME
  React.useEffect(() => {
    if (open) {
      if (isEditing && matiere) {
        setFormData({
          libelle_matiere: matiere.libelle_matiere || "",
          coef: matiere.coef || 1,
          qualificatif: matiere.qualificatif || "Fondamentale", // ✅ NOUVEAU
        });
      } else {
        setFormData(initialFormData);
      }
      setError(null);
    }
  }, [open, isEditing, matiere]);

  const handleLibelleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      libelle_matiere: e.target.value,
    }));
    setError(null);
  };

  const handleCoefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData((prev) => ({
      ...prev,
      coef: isNaN(value) ? 1 : value,
    }));
  };

  // ✅ NOUVEAU: GÉRER CHANGEMENT QUALIFICATIF
    // ✅ NOUVEAU: GÉRER CHANGEMENT QUALIFICATIF
   // ✅ NOUVEAU: GÉRER CHANGEMENT QUALIFICATIF
  const handleQualificatifChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      qualificatif: value as "Fondamentale" | "Facultative",
    }));
  };

  const handleSave = async () => {
    setError(null);
    
    if (!formData.libelle_matiere || !formData.coef) {
      setError("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    try {
      setSaving(true);
      
      if (isEditing && matiere) {
        await onSave({
          id: matiere.id,
          ...formData,
        } as UpdateMatiereInput);
      } else {
        await onSave(formData);
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
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
        {isEditing ? "Éditer Matière" : "Ajouter Matière"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        {/* ✅ AFFICHE L'ERREUR SI ELLE EXISTE */}
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <div className="flex flex-col gap-4">
          <TextField
            fullWidth
            label="Libellé de la matière *"
            value={formData.libelle_matiere || ""}
            onChange={handleLibelleChange}
            variant="outlined"
            size="small"
            placeholder="Ex: Mathématiques"
            className="mb-3"
            disabled={saving}
          />

          <TextField
            fullWidth
            label="Coefficient *"
            value={formData.coef || 1}
            onChange={handleCoefChange}
            variant="outlined"
            size="small"
            type="number"
            inputProps={{ step: "0.1", min: "0" }}
            placeholder="Ex: 3"
            disabled={saving}
          />

          {/* ✅ NOUVEAU: SELECT QUALIFICATIF */}
                   <FormControl fullWidth>
            <InputLabel>Qualificatif *</InputLabel>
            <Select
              value={formData.qualificatif || "Fondamentale"}
              onChange={(e) => handleQualificatifChange(e.target.value)}
              label="Qualificatif *"
              size="small"
              disabled={saving}
            >
              <MenuItem value="Fondamentale">Fondamentale</MenuItem>
              <MenuItem value="Facultative">Facultative</MenuItem>
            </Select>
          </FormControl>
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

export default MatiereModal;