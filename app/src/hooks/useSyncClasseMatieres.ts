import { useEffect } from "react";
import { useClasses } from "@/app/src/context/classeContext";
import { useMatieres } from "@/app/src/context/matiereContext";
import { Classe } from "@/app/src/interface/data";

export function useSyncClasseMatieres() {
  const { classes, updateClasse } = useClasses();
  const { matieres } = useMatieres();

  useEffect(() => {
    // ✅ SYNCHRONISER LES NOMS DE MATIÈRES DANS LES CLASSES
    const syncMatieres = async () => {
      for (const classe of classes) {
        if (classe.id_matieres && classe.id_matieres.length > 0) {
          // ✅ RÉCUPÉRER LES NOMS DES MATIÈRES À JOUR
          const updatedMatieres = classe.id_matieres
            .map(id => matieres.find(m => m.id === id)?.libelle_matiere)
            .filter((name): name is string => !!name);

          // ✅ VÉRIFIER SI LES NOMS ONT CHANGÉ
          const matieresChanged = 
            !classe.matieres || 
            classe.matieres.length !== updatedMatieres.length ||
            !classe.matieres.every((m, i) => m === updatedMatieres[i]);

          if (matieresChanged) {
            console.log(
              `🔄 Sync matières pour classe ${classe.libelle_classe}: ${classe.matieres?.join(", ")} → ${updatedMatieres.join(", ")}`
            );

            await updateClasse(classe.id, {
              libelle_classe: classe.libelle_classe,
              id_titulaire: classe.id_titulaire,
              scolarite: classe.scolarite,
              nombre_eleve: classe.nombre_eleve,
              id_matieres: classe.id_matieres,
              matieres: updatedMatieres,
              nombre_matiere: updatedMatieres.length,
            });
          }
        }
      }
    };

    syncMatieres();
  }, [matieres]); // ✅ DÉCLENCHÉ QUAND LES MATIÈRES CHANGENT
}