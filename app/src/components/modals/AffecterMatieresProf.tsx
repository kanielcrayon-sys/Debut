"use client"
import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, Alert, CircularProgress, Box } from "@mui/material";
import { Professeur, Matiere, UpdateProfesseurInput } from "@/app/src/interface/data";
import { useMatieres } from "@/app/src/context/matiereContext";
import { useProfesseurs } from "@/app/src/context/professeurContext";

interface AffecterMatieresProf {
  open: boolean;
  onClose: () => void;
  onSave: (updatedData: UpdateProfesseurInput) => Promise<void>;
  professeur: Professeur | null;
}

export default function AffecterMatieresProf({
  open,
  onClose,
  onSave,
  professeur,
}: AffecterMatieresProf) {
  const { matieres, loading } = useMatieres();
  const { getProfesseur } = useProfesseurs();
  
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ MATIÈRES DISPONIBLES: Pas abandonnées ET (non-assignées OU assignées à ce prof)
  const matieresAvailables = useMemo(() => {
    if (!professeur) return [];

    const disponibles = matieres.filter(
      (m) =>
        m.statut_matiere !== "abandonné" &&
        (!m.id_enseignant || m.id_enseignant === professeur.id)
    );

    console.log("📚 Matières disponibles:", disponibles.length);
    return disponibles.sort((a, b) => a.libelle_matiere.localeCompare(b.libelle_matiere));
  }, [matieres, professeur]);

  // ✅ INIT: Charger les matières actuelles du prof (filtrées)
  useEffect(() => {
    if (open && professeur) {
      const profActuel = getProfesseur(professeur.id);
      
      if (profActuel?.id_matiere && Array.isArray(profActuel.id_matiere)) {
        const matiereActuelles = profActuel.id_matiere.filter((mId: string) => {
          const matiere = matieres.find((m) => m.id === mId);
          return matiere?.statut_matiere !== "abandonné";
        });
        
        setSelectedMatieres(matiereActuelles);
        console.log("📚 Matières du prof chargées:", matiereActuelles.length);
      } else {
        setSelectedMatieres([]);
      }
      setError(null);
    }
  }, [open, professeur, matieres, getProfesseur]);

  const handleMatiereChange = (matiereId: string) => {
    setSelectedMatieres((prev) => {
      const updated = prev.includes(matiereId)
        ? prev.filter((m) => m !== matiereId)
        : [...prev, matiereId];
      
      console.log("✅ Matière togglée - Total:", updated.length);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!professeur) return;

    try {
      setSaving(true);
      setError(null);

      // ✅ RÉCUPÉRER LES NOMS DIRECTEMENT DE LA MATIÈRE TABLE
      const matiereNames = matieres
        .filter((m) => selectedMatieres.includes(m.id))
        .map((m) => m.libelle_matiere);

      console.log("💾 IDs sélectionnés:", selectedMatieres);
      console.log("💾 Noms des matières à envoyer:", matiereNames);

      const updatedData: UpdateProfesseurInput = {
        id: professeur.id,
        id_matiere: selectedMatieres,
        matieres: matiereNames,
      };

      console.log("📤 Envoi à l'API:", JSON.stringify(updatedData, null, 2));
      
      await onSave(updatedData);
      console.log("✅ Affectation réussie");
      
      // ✅ ATTENDRE UN PEU PUIS FERMER
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error("❌ Erreur affectation:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'affectation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle className="dark:bg-gray-800 dark:text-white">
          Chargement...
        </DialogTitle>
        <DialogContent className="dark:bg-gray-800 flex justify-center items-center py-8">
          <CircularProgress size={40} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="dark:bg-gray-800 dark:text-white">
        📚 Affecter Matières
        <div className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
          {professeur?.identite.prenom_individu} {professeur?.identite.nom_individu}
        </div>
      </DialogTitle>

      <DialogContent className="dark:bg-gray-800 mt-4">
        <div className="flex flex-col gap-4">
          {error && <Alert severity="error" className="mb-2">{error}</Alert>}

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Sélectionnez les matières à affecter.
            <br />
            <span className="text-xs">
              💡 Les matières grisées sont assignées à un autre professeur ou abandonnées.
            </span>
          </div>

          <Box className="max-h-80 overflow-y-auto">
            <FormGroup>
              {matieresAvailables.length > 0 ? (
                matieresAvailables.map((matiere) => {
                  const isSelected = selectedMatieres.includes(matiere.id);
                  const isAssignedToOther = matiere.id_enseignant && matiere.id_enseignant !== professeur?.id;
                  const isAbandonne = matiere.statut_matiere === "abandonné";
                  const isDisabled = isAssignedToOther || isAbandonne;

                  return (
                    <div
                      key={matiere.id}
                      className={`p-2 rounded mb-2 transition ${
                        isDisabled
                          ? "bg-gray-100 dark:bg-gray-700"
                          : isSelected
                          ? "bg-green-50 dark:bg-green-900"
                          : "hover:bg-blue-50 dark:hover:bg-blue-900"
                      }`}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleMatiereChange(matiere.id)}
                            disabled={isDisabled || saving}
                          />
                        }
                        label={
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-medium ${isDisabled ? "text-gray-400 dark:text-gray-500 line-through" : isSelected ? "text-green-700 dark:text-green-300 font-bold" : "text-gray-900 dark:text-white"}`}>
                              {matiere.libelle_matiere}
                              <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                                (Coef: {matiere.coef})
                              </span>
                            </span>

                            {isAssignedToOther && (
                              <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                🔒 Assignée à {matiere.enseignant}
                              </span>
                            )}

                            {isAbandonne && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                                ⚠️ Abandonnée
                              </span>
                            )}
                          </div>
                        }
                        className="!m-0 !w-full"
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  ✅ Aucune matière disponible
                </div>
              )}
            </FormGroup>
          </Box>

          {selectedMatieres.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                ✓ {selectedMatieres.length} matière(s):
              </p>
              <div className="flex flex-wrap gap-2">
                {matieres
                  .filter((m) => selectedMatieres.includes(m.id))
                  .map((m) => (
                    <span key={m.id} className="px-3 py-1 rounded-full bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs font-medium">
                      {m.libelle_matiere}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <DialogActions className="dark:bg-gray-800 p-3 gap-2">
        <Button onClick={onClose} className="dark:text-white" disabled={saving} variant="outlined">
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" className="!bg-green-600 !text-white" disabled={saving || matieresAvailables.length === 0}>
          {saving ? (
            <div className="flex items-center gap-2">
              <CircularProgress size={16} color="inherit" />
              En cours...
            </div>
          ) : (
            `Affecter (${selectedMatieres.length})`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}