"use client"
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { Classe } from "@/app/src/interface/data";
import { mockMatieres } from "@/app/src/data/mockData";

interface AjouterMatieresModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (classe: Classe) => void;
  classe: Classe | null;
}

export default function AjouterMatieresModal({
  open,
  onClose,
  onSave,
  classe,
}: AjouterMatieresModalProps) {
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);

  React.useEffect(() => {
    if (open && classe) {
      setSelectedMatieres(classe.id_matieres);
    }
  }, [open, classe]);

  const handleMatiereToggle = (matiereId: string) => {
    setSelectedMatieres((prev) =>
      prev.includes(matiereId)
        ? prev.filter((id) => id !== matiereId)
        : [...prev, matiereId]
    );
  };

  const handleSave = () => {
    if (!classe) return;

    const selectedMatierDetails = mockMatieres.filter((m) =>
      selectedMatieres.includes(m.id)
    );

    const updatedClasse: Classe = {
      ...classe,
      id_matieres: selectedMatieres,
      matieres: selectedMatierDetails.map((m) => m.libelle_matiere),
      nombre_matiere: selectedMatieres.length,
    };

    onSave(updatedClasse);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        Ajouter Matières à {classe?.libelle_classe}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <FormGroup>
          {mockMatieres.map((matiere) => (
            <FormControlLabel
              key={matiere.id}
              control={
                <Checkbox
                  checked={selectedMatieres.includes(matiere.id)}
                  onChange={() => handleMatiereToggle(matiere.id)}
                />
              }
              label={`${matiere.libelle_matiere} (Coef: ${matiere.coef})`}
              className="dark:text-white"
            />
          ))}
        </FormGroup>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" className="!bg-blue-600">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}