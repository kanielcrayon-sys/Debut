"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { Professeur, Matiere } from "@/app/src/interface/data";
import { mockMatieres } from "@/app/src/data/mockData";

interface AffecterMatieresProf {
  open: boolean;
  onClose: () => void;
  onSave: (professeur: Professeur, updatedMatieres: Matiere[]) => void;
  professeur: Professeur | null;
}

export default function AffecterMatieresProf({
  open,
  onClose,
  onSave,
  professeur,
}: AffecterMatieresProf) {
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);

  // Matières NON assignées (disponibles pour affectation)
  const unassignedMatieres = useMemo(() => {
    return mockMatieres.filter(
      (mat) => !mat.id_enseignant || mat.id_enseignant === professeur?.id
    );
  }, [professeur]);

  // Matières actuellement assignées au prof
  const currentAssignedMatieres = useMemo(() => {
    if (!professeur) return [];
    return mockMatieres.filter((mat) => mat.id_enseignant === professeur.id);
  }, [professeur]);

  React.useEffect(() => {
    if (open && professeur) {
      setSelectedMatieres(currentAssignedMatieres.map((m) => m.id));
    }
  }, [open, professeur, currentAssignedMatieres]);

  const handleMatiereChange = (matiereId: string) => {
    setSelectedMatieres((prev) =>
      prev.includes(matiereId)
        ? prev.filter((m) => m !== matiereId)
        : [...prev, matiereId]
    );
  };

  const handleSave = () => {
    if (!professeur) return;

    // Créer les matières mises à jour
    const updatedMatieres: Matiere[] = mockMatieres.map((mat) => {
      if (selectedMatieres.includes(mat.id)) {
        return {
          ...mat,
          id_enseignant: professeur.id,
          enseignant: `${professeur.identite.prenom_individu} ${professeur.identite.nom_individu}`,
        };
      }
      // Si la matière était assignée à ce prof mais n'est plus sélectionnée
      if (mat.id_enseignant === professeur.id && !selectedMatieres.includes(mat.id)) {
        return {
          ...mat,
          id_enseignant: undefined,
          enseignant: undefined,
        };
      }
      return mat;
    });

    // Mettre à jour le prof avec les nouvelles matières
    const updatedProfesseur: Professeur = {
      ...professeur,
      id_matiere: selectedMatieres,
      matieres: mockMatieres
        .filter((m) => selectedMatieres.includes(m.id))
        .map((m) => m.libelle_matiere),
    };

    onSave(updatedProfesseur, updatedMatieres);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        Affecter Matières à {professeur?.identite.prenom_individu}{" "}
        {professeur?.identite.nom_individu}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Sélectionnez les matières à affecter à ce professeur
          </div>

          <FormGroup>
            {unassignedMatieres.length > 0 ? (
              unassignedMatieres.map((matiere) => (
                <FormControlLabel
                  key={matiere.id}
                  control={
                    <Checkbox
                      checked={selectedMatieres.includes(matiere.id)}
                      onChange={() => handleMatiereChange(matiere.id)}
                    />
                  }
                  label={`${matiere.libelle_matiere} (Coef: ${matiere.coef})`}
                />
              ))
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Aucune matière disponible
              </div>
            )}
          </FormGroup>
        </div>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" className="!bg-green-600">
          Affecter
        </Button>
      </DialogActions>
    </Dialog>
  );
}