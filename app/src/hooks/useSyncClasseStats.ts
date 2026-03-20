import { useEffect, useRef } from "react";
import { useClasses } from "@/app/src/context/classeContext";
import { useEleves } from "@/app/src/context/eleveContext";
import { Classe, UpdateClasseInput } from "@/app/src/interface/data";

export function useSyncClasseStats() {
  const { classes, updateClasse } = useClasses();
  const { eleves } = useEleves();
  const prevElevesCountRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    classes.forEach((classe: Classe) => {
      const nombreEleve = eleves.filter(
        (e) => e.id_classe === classe.id && e.statut_eleve === "actif"
      ).length;

      const prevCount = prevElevesCountRef.current[classe.id] ?? 0;

      // ✅ UPDATE SEULEMENT SI LE NOMBRE A CHANGÉ
      if (prevCount !== nombreEleve) {
        console.log(
          `📊 Sync: ${classe.libelle_classe} - ${prevCount} → ${nombreEleve} élèves`
        );

        // ✅ ENVOYER TOUS LES CHAMPS REQUIS
        const updateData: UpdateClasseInput = {
          libelle_classe: classe.libelle_classe,
          id_titulaire: classe.id_titulaire,
          scolarite: classe.scolarite,
          nombre_eleve: nombreEleve,
          id_matieres: classe.id_matieres,
          matieres: classe.matieres,
          nombre_matiere: classe.nombre_matiere,
        };

        updateClasse(classe.id, updateData);

        prevElevesCountRef.current[classe.id] = nombreEleve;
      }
    });
  }, [eleves.length, classes.length]); // ✅ DÉPENDANCES CORRECTES
}