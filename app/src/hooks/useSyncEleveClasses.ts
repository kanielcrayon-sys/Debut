import { useEffect, useRef } from "react";
import { useEleves } from "@/app/src/context/eleveContext";
import { useClasses } from "@/app/src/context/classeContext";
import { UpdateClasseInput } from "@/app/src/interface/data";

export function useSyncEleveClasses() {
  const { eleves, updateEleve, loading: elevesLoading } = useEleves();
  const { classes, updateClasse, refreshClasses, loading: classesLoading } = useClasses();
  const isSyncingRef = useRef(false);
  const lastClassesRef = useRef<string>("");
  const prevStatsRef = useRef<{ [key: string]: { eleves: number; abandons: number } }>({});

  // 🆕 CRÉER UNE SIGNATURE DES ÉLÈVES (LONGUEUR + STATUTS)
  const elevesSignature = JSON.stringify(
    eleves.map(e => `${e.id}:${e.statut_eleve}`)
  );

  useEffect(() => {
    if (elevesLoading || classesLoading) {
      return;
    }

    if (eleves.length === 0 || classes.length === 0) {
      return;
    }

    if (isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;

    const syncClasses = async () => {
      try {
        for (const classe of classes) {
          const nombreEleve = eleves.filter(
            (e) => e.id_classe === classe.id && e.statut_eleve !== "abandonné"
          ).length;

          const nombreAbandons = eleves.filter(
            (e) => e.id_classe === classe.id && e.statut_eleve === "abandonné"
          ).length;

          const prevStats = prevStatsRef.current[classe.id] ?? { eleves: 0, abandons: 0 };

          if (prevStats.eleves !== nombreEleve || prevStats.abandons !== nombreAbandons) {
            const updateData: UpdateClasseInput = {
              libelle_classe: classe.libelle_classe,
              id_titulaire: classe.id_titulaire,
              scolarite: classe.scolarite,
              nombre_eleve: nombreEleve,
              nombre_abandons: nombreAbandons,
              id_matieres: classe.id_matieres,
              matieres: classe.matieres,
              nombre_matiere: classe.nombre_matiere,
            };

            await updateClasse(classe.id, updateData);
            prevStatsRef.current[classe.id] = { eleves: nombreEleve, abandons: nombreAbandons };
          }
        }

        // ✅ ATTENDRE 500ms ET RAFRAÎCHIR
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshClasses();
        
      } catch (err) {
        console.error("❌ Erreur sync:", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    syncClasses();
  }, [elevesSignature, elevesLoading]); // 🆕 UTILISER elevesSignature À LA PLACE DE eleves.length
}