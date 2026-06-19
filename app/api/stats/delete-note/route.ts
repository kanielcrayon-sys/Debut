import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';

interface Note {
  id: string;
  type_evaluation: string;
  valeur: number;
  observation: string;
  rang: number | null;
  createdAt: string;
  isSpecial?: boolean;
}

interface Stat {
  id: string;
  id_classe: string;
  id_matiere: string;
  id_eleve: string;

  // ✅ pour filtrer correctement les recalculs
  libelle_stat: "Stat1" | "Stat2" | "Stat3";
  repartition: "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";
  annee_scolaire: number;

  notes: Note[];
  identite?: {
    nom_individu: string;
  };

  moyenne_classe?: number | null;
  moyenne_matiere?: number | null;
  coef?: number;
  note_definitive?: number | null;
  rang?: number | null;
  rang_label?: string;
  observations?: string;
}

// ✅ CALCULER MOYENNE CLASSE
const calculateMoyenneClasse = (notes: Note[]): number | null => {
  const iNotes = notes.filter((n) => n.type_evaluation.startsWith("I"));
  if (iNotes.length === 0) return null;
  const sum = iNotes.reduce((acc, n) => acc + n.valeur, 0);
  return parseFloat((sum / iNotes.length).toFixed(2));
};

// ✅ CALCULER MOYENNE MATIERE
const calculateMoyenneMatiere = (notes: Note[]): number | null => {
  const moyenneClasse = calculateMoyenneClasse(notes);
  if (moyenneClasse === null) return null;

  const devoir = notes.find((n) => n.type_evaluation === "DEVOIR");
  const compo = notes.find((n) => n.type_evaluation === "COMPO");

  if (!devoir || !compo) return null;

  const moyenne = (moyenneClasse + devoir.valeur + compo.valeur) / 3;
  return parseFloat(moyenne.toFixed(2));
};

// ✅ CALCULER OBSERVATIONS BASÉE SUR MOYENNE_MATIERE
const calculateObservationsFromMoyenne = (moyenne: number | null): string => {
  if (moyenne === null) return "";

  if (moyenne < 8) return "Très insuffisant";
  if (moyenne < 10) return "Insuffisant";
  if (moyenne < 12) return "Passable";
  if (moyenne < 14) return "Assez bien";
  if (moyenne < 17) return "Bien";
  if (moyenne < 19) return "Très bien";
  return "Excellent";
};

// ✅ CRÉER LE LABEL DU RANG
const createRangLabel = (rang: number | null, isExAequo: boolean): string => {
  if (rang === null) return "";
  
  if (rang === 1) return "1er";
  return `${rang}ème${isExAequo ? " ex" : ""}`;
};

    // ✅ CALCULER NOTE DÉFINITIVE
    const calculateNoteDefinitive = (moyenneMatiere: number | null, coef: number): number | null => {
    if (moyenneMatiere === null) return null;
    return parseFloat((moyenneMatiere * coef).toFixed(2));
    };

export async function POST(req: NextRequest) {
  try {
    const { statId, noteId } = await req.json();

    console.log(`🗑️ Suppression note - Stat: ${statId}, Note: ${noteId}`);

    // ✅ RÉCUPÉRER LE STAT ACTUEL
    const statRef = db.collection('statistique').doc(statId);
    const statDoc = await statRef.get();
    
    
    if (!statDoc.exists) {
      return NextResponse.json(
        { error: 'Stat non trouvé' },
        { status: 404 }
      );
    }
    const statData = statDoc.data() as Stat;

    // ✅ RÉCUPÉRER LE COEF DE LA MATIÈRE
    const matiereDoc = await db.collection('matieres').doc(statData.id_matiere).get();
    const matiereData = matiereDoc.data();
    const coef = typeof matiereData?.coef === "number" ? matiereData.coef : 1;
    const currentNotes: Note[] = Array.isArray(statData.notes) ? statData.notes : [];
    
    // ✅ SUPPRIMER LA NOTE
    const noteIndex = currentNotes.findIndex((n: Note) => n.id === noteId);
    if (noteIndex === -1) {
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      );
    }

    const updatedNotes = currentNotes.filter((n: Note) => n.id !== noteId);
    console.log(`✅ Note supprimée`);

    // ✅ CALCULER NOUVELLE MOYENNE_CLASSE ET MOYENNE_MATIERE
    const moyenneClasse = calculateMoyenneClasse(updatedNotes);
    const moyenneMatiere = calculateMoyenneMatiere(updatedNotes);
    const observations = calculateObservationsFromMoyenne(moyenneMatiere);
    // ✅ CALCULER NOTE DÉFINITIVE
    const noteDefinitive = calculateNoteDefinitive(moyenneMatiere, coef);
    // ✅ METTRE À JOUR LE STAT
    await statRef.update({
      notes: updatedNotes,
      moyenne_classe: moyenneClasse,
      moyenne_matiere: moyenneMatiere,
      observations,
      coef,
      note_definitive: noteDefinitive,
    });
    console.log(`✅ Stat mise à jour après suppression`);

    // ✅ RECALCULER LES RANGS (même logique que add-note)
    const snapshot = await db
      .collection('statistique')
      .where('id_classe', '==', statData.id_classe)
      .where('id_matiere', '==', statData.id_matiere)
      .where("libelle_stat", "==", statData.libelle_stat)
     .where("repartition", "==", statData.repartition)
      .where("annee_scolaire", "==", statData.annee_scolaire)
      .get();

    interface EleveWithMoyenne {
      statId: string;
      moyenneMatiere: number | null;
      nom: string;
    }

    const elevesWithMoyennes: EleveWithMoyenne[] = [];
    const statDataMap = new Map<string, Stat>();

    snapshot.forEach((doc) => {
      const docData = doc.data() as Stat;
      const notes: Note[] = Array.isArray(docData.notes) ? docData.notes : [];
      const docMoyenneMatiere = calculateMoyenneMatiere(notes);
      
      statDataMap.set(doc.id, docData);
      elevesWithMoyennes.push({
        statId: doc.id,
        moyenneMatiere: docMoyenneMatiere,
        nom: docData.identite?.nom_individu || "",
      });
    });

    // ✅ TRIER PAR MOYENNE_MATIERE DÉCROISSANTE
    elevesWithMoyennes.sort((a, b) => {
      if (a.moyenneMatiere === null && b.moyenneMatiere === null) {
        return a.nom.localeCompare(b.nom);
      }
      if (a.moyenneMatiere === null) return 1;
      if (b.moyenneMatiere === null) return -1;

      if (b.moyenneMatiere !== a.moyenneMatiere) {
        return b.moyenneMatiere - a.moyenneMatiere;
      }
      return a.nom.localeCompare(b.nom);
    });

    // ✅ METTRE À JOUR LES RANGS
    let currentRang = 1;
    for (let i = 0; i < elevesWithMoyennes.length; i++) {
      const eleve = elevesWithMoyennes[i];
      
      let isExAequo = false;
      
      if (i > 0 && eleve.moyenneMatiere === elevesWithMoyennes[i - 1].moyenneMatiere) {
        isExAequo = true;
      } else {
        currentRang = i + 1;
        isExAequo = false;
      }

      const rangLabel = createRangLabel(
        eleve.moyenneMatiere !== null ? currentRang : null,
        isExAequo
      );

      const updateStatRef = db.collection('statistique').doc(eleve.statId);
      const updateStatData = statDataMap.get(eleve.statId);

      if (updateStatData) {
        const notesWithRang: Note[] = updateStatData.notes.map((note: Note) => {
          const allNotesOfType: { statId: string; valeur: number }[] = [];

          elevesWithMoyennes.forEach((e) => {
            const eStatData = statDataMap.get(e.statId);
            if (eStatData) {
              const noteOfType = eStatData.notes.find((n) => n.type_evaluation === note.type_evaluation);
              if (noteOfType) {
                allNotesOfType.push({
                  statId: e.statId,
                  valeur: noteOfType.valeur,
                });
              }
            }
          });

          allNotesOfType.sort((a, b) => b.valeur - a.valeur);

          let noteRang = 1;
          for (let j = 0; j < allNotesOfType.length; j++) {
            if (allNotesOfType[j].statId === eleve.statId) {
              if (j > 0 && allNotesOfType[j].valeur === allNotesOfType[j - 1].valeur) {
                noteRang = j;
              } else {
                noteRang = j + 1;
              }
              break;
            }
          }

          return {
            ...note,
            rang: noteRang,
          };
        });
                const docMoyenneClasse = calculateMoyenneClasse(notesWithRang);
        const docMoyenneMatiere = calculateMoyenneMatiere(notesWithRang);
        const docObservations = calculateObservationsFromMoyenne(docMoyenneMatiere);
        const docNoteDefinitive = calculateNoteDefinitive(docMoyenneMatiere, coef);

       await updateStatRef.update({
        notes: notesWithRang,
        moyenne_classe: docMoyenneClasse,
        moyenne_matiere: docMoyenneMatiere,
        coef,
        note_definitive: docNoteDefinitive,
        observations: docObservations,
        rang: docMoyenneMatiere !== null ? currentRang : null,
        rang_label: rangLabel,
      });
      }
    }

    console.log('✅ Rangs recalculés après suppression');

    return NextResponse.json({
      success: true,
      message: 'Note supprimée avec succès',
      moyenneClasse,
      moyenneMatiere,
      observations,
    });
  } catch (error) {
    console.error('❌ Erreur POST stats/delete-note:', error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}