"use client"
import React, { useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from "@mui/material";
import { Classe, CreateClasseInput, UpdateClasseInput } from "@/app/src/interface/data";
import { Professeur } from "@/app/src/interface/data";
import { mockProfesseurs } from "@/app/src/data/mockData";

interface ClasseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (classe: CreateClasseInput | UpdateClasseInput) => void;
  classe?: Classe | null;
  isEditing?: boolean;
}

const initialFormData: CreateClasseInput = {
  libelle_classe: "",
  id_titulaire: "",
  scolarite: 250000,
};

export default function ClasseModal({
  open,
  onClose,
  onSave,
  classe,
  isEditing = false,
}: ClasseModalProps) {
  const [formData, setFormData] = useState<CreateClasseInput>(initialFormData);
  const [scolariteInputValue, setScolariteInputValue] = useState("");

  const defaultFormData = useMemo(() => {
    if (open && classe && isEditing) {
      return {
        libelle_classe: classe.libelle_classe,
        id_titulaire: classe.id_titulaire,
        scolarite: classe.scolarite,
      };
    }
    return initialFormData;
  }, [open, classe, isEditing]);

  React.useEffect(() => {
    setFormData(defaultFormData);
    setScolariteInputValue(defaultFormData.scolarite.toString());
  }, [defaultFormData]);

  const scolaritePredefinies = [250000, 300000, 350000, 400000];
  const scolariteOptions = Array.from(new Set([...scolaritePredefinies, formData.scolarite]));

  const handleLibelleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      libelle_classe: e.target.value,
    }));
  };

  const handleTitulaireChange = (
    event: React.SyntheticEvent,
    value: Professeur | null
  ) => {
    if (value) {
      setFormData((prev) => ({
        ...prev,
        id_titulaire: value.id,
      }));
    }
  };

  const handleScolariteChange = (
    event: React.SyntheticEvent,
    value: number | string | null
  ) => {
    if (value !== null) {
      if (typeof value === "string") {
        const num = parseInt(value);
        if (!isNaN(num)) {
          setFormData((prev) => ({
            ...prev,
            scolarite: num,
          }));
          setScolariteInputValue(num.toString());
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          scolarite: value,
        }));
        setScolariteInputValue(value.toString());
      }
    }
  };

  const handleScolariteInputChange = (
    event: React.SyntheticEvent,
    value: string
  ) => {
    setScolariteInputValue(value);
  };

  const handleSave = () => {
    if (
      !formData.libelle_classe ||
      !formData.id_titulaire ||
      !formData.scolarite
    ) {
      alert("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }

    if (isEditing && classe) {
      onSave({
        id: classe.id,
        ...formData,
      } as UpdateClasseInput);
    } else {
      onSave(formData);
    }

    onClose();
  };

  const selectedProfesseur = mockProfesseurs.find(
    (p) => p.id === formData.id_titulaire
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        {isEditing ? "Éditer Classe" : "Ajouter Classe"}
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4">
          <TextField
            fullWidth
            label="Libellé de la classe *"
            value={formData.libelle_classe}
            onChange={handleLibelleChange}
            variant="outlined"
            size="small"
            placeholder="Ex: 3ème A"
            className="mb-3"
          />

          <Autocomplete
            options={mockProfesseurs}
            getOptionLabel={(option) =>
              `${option.identite.prenom_individu} ${option.identite.nom_individu}`
            }
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            value={selectedProfesseur || null}
            onChange={handleTitulaireChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Professeur Titulaire *"
                variant="outlined"
                size="small"
              />
            )}
          />

          <Autocomplete
            freeSolo
            options={scolariteOptions}
            value={formData.scolarite}
            onChange={handleScolariteChange}
            inputValue={scolariteInputValue}
            onInputChange={handleScolariteInputChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Scolarité (FCFA) *"
                variant="outlined"
                size="small"
                type="number"
              />
            )}
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