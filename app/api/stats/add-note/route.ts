import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import { calculateObservation } from "@/app/src/lib/observations";
import type { NoteObservation, StatObservation } from "@/app/src/interface/data";

type EvaluationType = "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "DEVOIR" | "COMPO";
type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

const normalizeTypeEvaluation = (t: unknown): EvaluationType => {
  const raw = String(t ?? "").trim();
  const upper = raw.toUpperCase();

  // Interros
  if (
    upper === "I1" ||
    upper === "I2" ||
    upper === "I3" ||
    upper === "I4" ||
    upper === "I5" ||
    upper === "I6"
  ) {
    return upper as EvaluationType;
  }

  // Devoir / Compo (tolère "Devoir"/"Compo")
  if (upper === "DEVOIR" || raw === "Devoir") return "DEVOIR";
  if (upper === "COMPO" || raw === "Compo") return "COMPO";

  throw new Error(`type_evaluation invalide: ${raw}`);
};

interface Note {
  id: string;
  type_evaluation: EvaluationType;
  valeur: number;
  observation: NoteObservation;
  rang: number | null;
  createdAt: string;
  isSpecial?: boolean;
}

interface Stat {
  id: string;
  id_classe: string;
  id_matiere: string;
  id_eleve: string;

  // ✅ indispensables pour éviter le mélange de périodes
  libelle_stat: StatType;
  repartition: Repartition;

  notes: Note[];
  identite?: { nom_individu: string };
  moyenne_classe?: number | null;
  moyenne_matiere?: number | null;
  coef?: number;
  note_definitive?: number | null;
  rang?: number | null;
  rang_label?: string;
  observations?: StatObservation;
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
const calculateObservationsFromMoyenne = (moyenne: number | null): StatObservation => {
  if (moyenne === null) return "Très insuffisant";

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
    const body = (await req.json()) as {
      statId?: string;
      type_evaluation?: unknown;
      valeur?: unknown;
      isSpecial?: unknown;
    };

    const { statId, type_evaluation, valeur, isSpecial } = body;

    if (!statId) {
      return NextResponse.json({ error: "statId manquant" }, { status: 400 });
    }

    const valeurNum = typeof valeur === "number" ? valeur : Number(valeur);
    if (!Number.isFinite(valeurNum)) {
      return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    }

    const normalizedType = normalizeTypeEvaluation(type_evaluation);

    console.log(`📝 Ajout note - Stat: ${statId}, Type: ${normalizedType}, Valeur: ${valeurNum}`);

    // ✅ RÉCUPÉRER LE STAT ACTUEL
    const statRef = db.collection("statistique").doc(statId);
    const statDoc = await statRef.get();

    if (!statDoc.exists) {
      return NextResponse.json({ error: "Stat non trouvé" }, { status: 404 });
    }

    const statData = statDoc.data() as Stat;

    // ✅ RÉCUPÉRER LE COEF DE LA MATIÈRE
    const matiereDoc = await db.collection("matieres").doc(statData.id_matiere).get();
    const matiereData = matiereDoc.data();
    const coef: number = typeof matiereData?.coef === "number" ? matiereData.coef : 1;

    const currentNotes: Note[] = Array.isArray(statData.notes) ? statData.notes : [];

    // ✅ VÉRIFIER S'IL Y A DÉJÀ UNE NOTE DE CE TYPE
    const existingNoteIndex = currentNotes.findIndex((n) => n.type_evaluation === normalizedType);
    const updatedNotes: Note[] = [...currentNotes];

    // ✅ observation automatique
    const observation: NoteObservation = calculateObservation(valeurNum);

    const noteData: Note = {
      id: `${normalizedType}_${Date.now()}`,
      type_evaluation: normalizedType,
      valeur: valeurNum,
      observation,
      rang: null,
      createdAt: new Date().toISOString(),
      isSpecial: Boolean(isSpecial),
    };

    if (existingNoteIndex !== -1) updatedNotes[existingNoteIndex] = noteData;
    else updatedNotes.push(noteData);

    // ✅ CALCULER MOYENNES
    const moyenneClasse = calculateMoyenneClasse(updatedNotes);
    const moyenneMatiere = calculateMoyenneMatiere(updatedNotes);
    const observations: StatObservation = calculateObservationsFromMoyenne(moyenneMatiere);

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

    // ✅ CALCULER LES RANGS — FILTRÉ (évite mélange Stat1/2/3 et périodes)
    const snapshot = await db
      .collection("statistique")
      .where("id_classe", "==", statData.id_classe)
      .where("id_matiere", "==", statData.id_matiere)
      .where("libelle_stat", "==", statData.libelle_stat)
      .where("repartition", "==", statData.repartition)
      .get();

    interface EleveWithMoyenne {
      statId: string;
      moyenneMatiere: number | null;
      nom: string;
    }

    const elevesWithMoyennes: EleveWithMoyenne[] = [];
    const statDataMap = new Map<string, Stat>();

    snapshot.forEach((docSnap) => {
      const docData = docSnap.data() as Stat;
      const notes: Note[] = Array.isArray(docData.notes) ? docData.notes : [];
      const docMoyenneMatiere = calculateMoyenneMatiere(notes);

      statDataMap.set(docSnap.id, docData);
      elevesWithMoyennes.push({
        statId: docSnap.id,
        moyenneMatiere: docMoyenneMatiere,
        nom: docData.identite?.nom_individu || "",
      });
    });

    // ✅ TRIER PAR MOYENNE_MATIERE DÉCROISSANTE, PUIS PAR NOM
    elevesWithMoyennes.sort((a, b) => {
      if (a.moyenneMatiere === null && b.moyenneMatiere === null) return a.nom.localeCompare(b.nom);
      if (a.moyenneMatiere === null) return 1;
      if (b.moyenneMatiere === null) return -1;
      if (b.moyenneMatiere !== a.moyenneMatiere) return b.moyenneMatiere - a.moyenneMatiere;
      return a.nom.localeCompare(b.nom);
    });

    // ✅ METTRE À JOUR LES RANGS STAT ET NOTE
    let currentRang = 1;
    for (let i = 0; i < elevesWithMoyennes.length; i++) {
      const eleve = elevesWithMoyennes[i];
      const prev = i > 0 ? elevesWithMoyennes[i - 1] : null;

      const isExAequo =
        Boolean(prev && eleve.moyenneMatiere !== null && eleve.moyenneMatiere === prev.moyenneMatiere);

      if (!isExAequo) currentRang = i + 1;

      const rangLabel = createRangLabel(eleve.moyenneMatiere !== null ? currentRang : null, isExAequo);

      const updateStatRef = db.collection("statistique").doc(eleve.statId);
      const updateStatData = statDataMap.get(eleve.statId);
      if (!updateStatData) continue;

      const notesWithRang: Note[] = updateStatData.notes.map((note) => {
        const allNotesOfType: { statId: string; valeur: number }[] = [];

        elevesWithMoyennes.forEach((e) => {
          const eStatData = statDataMap.get(e.statId);
          if (!eStatData) return;

          const noteOfType = eStatData.notes.find((n) => n.type_evaluation === note.type_evaluation);
          if (noteOfType) allNotesOfType.push({ statId: e.statId, valeur: noteOfType.valeur });
        });

        allNotesOfType.sort((a, b) => b.valeur - a.valeur);

        // rang note
        let noteRang = 1;
        for (let j = 0; j < allNotesOfType.length; j++) {
          if (allNotesOfType[j].statId === eleve.statId) {
            noteRang = j + 1;
            if (j > 0 && allNotesOfType[j].valeur === allNotesOfType[j - 1].valeur) {
              noteRang = j; // même rang que précédent (1-index)
            }
            break;
          }
        }

        return { ...note, rang: noteRang };
      });

      await updateStatRef.update({
        notes: notesWithRang,
        rang: eleve.moyenneMatiere !== null ? currentRang : null,
        rang_label: rangLabel,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Note ajoutée avec succès",
      note: noteData,
      moyenneClasse,
      moyenneMatiere,
      observations,
    });
  } catch (error) {
    console.error("❌ Erreur POST stats/add-note:", error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}