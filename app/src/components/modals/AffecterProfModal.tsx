"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField } from "@mui/material";
import { Matiere, Professeur } from "@/app/src/interface/data";
import { mockProfesseurs } from "@/app/src/data/mockData";

interface AffecterProfModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (matiere: Matiere) => void;
  matiere: Matiere | null;
}

export default function AffecterProfModal({
  open,
  onClose,
  onSave,
  matiere,
}: AffecterProfModalProps) {
  const [selectedProf, setSelectedProf] = useState<Professeur | null>(null);

  const currentProf = useMemo(() => {
    if (matiere?.id_enseignant) {
      return mockProfesseurs.find((p) => p.id === matiere.id_enseignant) || null;
    }
    return null;
  }, [matiere]);

  React.useEffect(() => {
    if (open) {
      setSelectedProf(currentProf);
    }
  }, [open, currentProf]);

  const handleProfChange = (
    event: React.SyntheticEvent,
    value: Professeur | null
  ) => {
    setSelectedProf(value);
  };

  const handleSave = () => {
    if (!selectedProf) {
      alert("Veuillez sélectionner un professeur");
      return;
    }

    if (!matiere) return;

    const updatedMatiere: Matiere = {
      ...matiere,
      id_enseignant: selectedProf.id,
      enseignant: `${selectedProf.identite.prenom_individu} ${selectedProf.identite.nom_individu}`,
    };

    onSave(updatedMatiere);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        Affecter un Professeur à {matiere?.libelle_matiere}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <Autocomplete
          options={mockProfesseurs}
          getOptionLabel={(option) =>
            `${option.identite.prenom_individu} ${option.identite.nom_individu} (${option.matieres.join(", ")})`
          }
          isOptionEqualToValue={(option, value) => option.id === value?.id}
          value={selectedProf}
          onChange={handleProfChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sélectionner un Professeur *"
              variant="outlined"
              size="small"
            />
          )}
        />
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" className="!bg-blue-600">
          Affecter
        </Button>
      </DialogActions>
    </Dialog>
  );
}