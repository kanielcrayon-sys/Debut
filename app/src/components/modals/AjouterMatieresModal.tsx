"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Box, Typography } from "@mui/material";
import { Classe } from "@/app/src/interface/data";
import { useMatieres } from "@/app/src/context/matiereContext";

interface AjouterMatieresModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (updatedClasse: Classe) => void;
  classe?: Classe | null;
}

interface MatiereSelection {
  ids: string[];
  names: string[];
}

export default function AjouterMatieresModal({
  open,
  onClose,
  onSave,
  classe,
}: AjouterMatieresModalProps) {
  const { matieres } = useMatieres();
  
  // ✅ INITIALISER DIRECTEMENT AVEC classe.id_matieres
  const [selectedMatieres, setSelectedMatieres] = useState<MatiereSelection>({
    ids: classe?.id_matieres || [],
    names: classe?.matieres || [],
  });

  // ✅ FILTRER LES MATIÈRES ACTIVES UNIQUEMENT
  const activeMatieres = useMemo(() => {
    return matieres.filter(m => m.statut_matiere === "actif");
  }, [matieres]);

  // ✅ QUAND LE MODAL S'OUVRE, RÉINITIALISER L'ÉTAT
  React.useEffect(() => {
    if (open && classe) {
      setSelectedMatieres({
        ids: classe.id_matieres || [],
        names: classe.matieres || [],
      });
      console.log("📚 Matières actuelles de la classe:", classe.matieres);
    }
  }, [open, classe?.id]); // ✅ DÉPEND DE classe.id, PAS classe

  const handleMatiereToggle = (matiereId: string, matiereName: string) => {
    console.log(`🔄 Toggle matière: ${matiereName} (${matiereId})`);
    
    setSelectedMatieres((prev) => {
      const newIds = prev.ids.includes(matiereId)
        ? prev.ids.filter((id) => id !== matiereId)
        : [...prev.ids, matiereId];

      const newNames = prev.names.includes(matiereName)
        ? prev.names.filter((name) => name !== matiereName)
        : [...prev.names, matiereName];

      return {
        ids: newIds,
        names: newNames,
      };
    });
  };

  const handleSave = () => {
    if (!classe) return;

    console.log("📤 Sauvegarde matières:", {
      id_matieres: selectedMatieres.ids,
      matieres: selectedMatieres.names,
      nombre_matiere: selectedMatieres.ids.length,
    });

    const updatedClasse: Classe = {
      ...classe,
      id_matieres: selectedMatieres.ids,
      matieres: selectedMatieres.names,
      nombre_matiere: selectedMatieres.ids.length,
    };

    onSave(updatedClasse);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        Affecter Matières à la Classe
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <Box className="mb-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
          <Typography className="text-sm font-semibold text-blue-900 dark:text-blue-300">
            📚 Classe: {classe?.libelle_classe}
          </Typography>
          <Typography className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            Sélectionnées: {selectedMatieres.ids.length} matière(s)
          </Typography>
        </Box>

        <FormGroup>
          {activeMatieres.length > 0 ? (
            activeMatieres.map((matiere) => (
              <FormControlLabel
                key={matiere.id}
                control={
                  <Checkbox
                    checked={selectedMatieres.ids.includes(matiere.id)}
                    onChange={() =>
                      handleMatiereToggle(matiere.id, matiere.libelle_matiere)
                    }
                  />
                }
                label={
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold dark:text-white">
                      {matiere.libelle_matiere}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      Coef: {matiere.coef}
                    </span>
                    {matiere.enseignant && (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {matiere.enseignant}
                      </span>
                    )}
                  </div>
                }
              />
            ))
          ) : (
            <Typography className="text-gray-500 dark:text-gray-400">
              Aucune matière active disponible
            </Typography>
          )}
        </FormGroup>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3">
        <Button onClick={onClose} className="dark:text-white">
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          className="!bg-green-600"
          disabled={selectedMatieres.ids.length === 0}
        >
          Affecter ({selectedMatieres.ids.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}