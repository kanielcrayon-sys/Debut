"use client"

import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import { Matiere, CreateMatiereInput, UpdateMatiereInput } from "@/app/src/interface/data";

interface MatiereModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (matiere: CreateMatiereInput | UpdateMatiereInput) => void;
  matiere?: Matiere | null;
  isEditing?: boolean;
}

const initialFormData: CreateMatiereInput = {
  libelle_matiere: "",
  coef: 1,
};

function MatiereModal({
  open,
  onClose,
  onSave,
  matiere,
  isEditing = false,
}: MatiereModalProps) {
  const [formData, setFormData] = useState<CreateMatiereInput>(initialFormData);

  const defaultFormData = useMemo(() => {
    if (open && matiere && isEditing) {
      return {
        libelle_matiere: matiere.libelle_matiere,
        coef: matiere.coef,
      };
    }
    return initialFormData;
  }, [open, matiere, isEditing]);

  React.useEffect(() => {
    setFormData(defaultFormData);
  }, [defaultFormData]);

  const handleLibelleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      libelle_matiere: e.target.value,
    }));
  };

  const handleCoefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData((prev) => ({
      ...prev,
      coef: isNaN(value) ? 1 : value,
    }));
  };

  const handleSave = () => {
    if (!formData.libelle_matiere || !formData.coef) {
      alert("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    if (isEditing && matiere) {
      onSave({
        id: matiere.id,
        ...formData,
      } as UpdateMatiereInput);
    } else {
      onSave(formData);
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Matière" : "Ajouter Matière"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4">
          <TextField
            fullWidth
            label="Libellé de la matière *"
            value={formData.libelle_matiere}
            onChange={handleLibelleChange}
            variant="outlined"
            size="small"
            placeholder="Ex: Mathématiques"
            className="mb-3"
          />

          <TextField
            fullWidth
            label="Coefficient *"
            value={formData.coef}
            onChange={handleCoefChange}
            variant="outlined"
            size="small"
            type="number"
            inputProps={{ step: "0.1", min: "0" }}
            placeholder="Ex: 3"
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

export default MatiereModal;