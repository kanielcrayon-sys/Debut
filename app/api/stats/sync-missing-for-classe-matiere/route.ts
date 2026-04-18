import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

type StatKey = `${StatType}_${Repartition}`;

type EleveStatEntry = {
  id: string;
  libelle_stat: StatType;
  repartition: Repartition;
  id_matiere: string;
};

type EleveDoc = {
  stat?: EleveStatEntry[];
};

// (optionnel) validation cohérence stat/repartition
const allowedRepartitionsFor = (libelle: StatType): Repartition[] => {
  if (libelle === "Stat1") return ["Trimestre1", "Semestre1"];
  if (libelle === "Stat2") return ["Trimestre2", "Semestre2"];
  return ["Trimestre3"];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { classeId?: string; matiereId?: string };
    const { classeId, matiereId } = body;

    if (!classeId || !matiereId) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const [classeDoc, matiereDoc] = await Promise.all([
      db.collection("classes").doc(classeId).get(),
      db.collection("matieres").doc(matiereId).get(),
    ]);

    if (!classeDoc.exists) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    if (!matiereDoc.exists) return NextResponse.json({ error: "Matière introuvable" }, { status: 404 });

    const classeData = classeDoc.data();
    const matiereData = matiereDoc.data();

    // 1) Tous les stats existants pour cette matière/classe
    const existingStatsSnap = await db
      .collection("statistique")
      .where("id_classe", "==", classeId)
      .where("id_matiere", "==", matiereId)
      .get();

    // 2) Quelles "sessions" existent déjà ? (Stat1_Trimestre1, Stat2_Semestre2, etc.)
    const existingKeys = new Set<StatKey>();
    existingStatsSnap.forEach((d) => {
      const s = d.data() as Partial<{ libelle_stat: StatType; repartition: Repartition }>;
      if (!s.libelle_stat || !s.repartition) return;
      // garde seulement les cohérents selon ta logique
      if (!allowedRepartitionsFor(s.libelle_stat).includes(s.repartition)) return;
      existingKeys.add(`${s.libelle_stat}_${s.repartition}`);
    });

    if (existingKeys.size === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        message: "Aucun stat existant à synchroniser pour cette matière.",
      });
    }

    // 3) Eleves actifs de la classe
    const elevesSnap = await db
      .collection("eleves")
      .where("id_classe", "==", classeId)
      .where("statut_eleve", "==", "actif")
      .get();

    const eleveIds = elevesSnap.docs.map((d) => d.id);

    // 4) Index : quels (eleveId + key) existent déjà ?
    const existingByEleve = new Set<string>(); // `${eleveId}|${key}`
    existingStatsSnap.forEach((d) => {
      const s = d.data() as Partial<{ id_eleve: string; libelle_stat: StatType; repartition: Repartition }>;
      if (!s.id_eleve || !s.libelle_stat || !s.repartition) return;
      existingByEleve.add(`${s.id_eleve}|${s.libelle_stat}_${s.repartition}`);
    });

    // 5) Construire la liste à créer
    const toCreate: Array<{ eleveId: string; libelle_stat: StatType; repartition: Repartition }> = [];

    for (const eleveId of eleveIds) {
      for (const key of existingKeys) {
        const k = `${eleveId}|${key}`;
        if (!existingByEleve.has(k)) {
          const [libelle_stat, repartition] = key.split("_") as [StatType, Repartition];
          toCreate.push({ eleveId, libelle_stat, repartition });
        }
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: "Rien à créer (déjà synchronisé)." });
    }

    const now = new Date();
    let created = 0;

    // 6) Créer en batch + maj eleves.stat
    for (let i = 0; i < toCreate.length; i += 350) {
      const chunk = toCreate.slice(i, i + 350);
      const batch = db.batch();

      // pour update eleves.stat après commit
      const newEntriesByEleve: Record<string, EleveStatEntry[]> = {};

      for (const item of chunk) {
        const statRef = db.collection("statistique").doc();

        batch.set(statRef, {
          id_classe: classeId,
          id_matiere: matiereId,
          id_eleve: item.eleveId,
          id_enseignant: matiereData?.id_enseignant ?? null,
          libelle_stat: item.libelle_stat,
          repartition: item.repartition,
          classe: classeData?.libelle_classe ?? "",
          matiere: matiereData?.libelle_matiere ?? "",
          enseignant: matiereData?.enseignant ?? "Non assigné",
          jour: now.getDate(),
          mois: now.getMonth() + 1,
          annee: now.getFullYear(),
          date: now.toISOString().split("T")[0],
          notes: [],
          cloture: false,
          createdAt: now.toISOString(),
        });

        const entry: EleveStatEntry = {
          id: statRef.id,
          libelle_stat: item.libelle_stat,
          repartition: item.repartition,
          id_matiere: matiereId,
        };

        (newEntriesByEleve[item.eleveId] ??= []).push(entry);
      }

      await batch.commit();
      created += chunk.length;

      // maj eleves.stat
      for (const [eleveId, entries] of Object.entries(newEntriesByEleve)) {
        const eleveRef = db.collection("eleves").doc(eleveId);
        const eleveSnap = await eleveRef.get();
        const eleveData = eleveSnap.data() as EleveDoc | undefined;

        const existing = Array.isArray(eleveData?.stat) ? eleveData!.stat! : [];
        await eleveRef.update({ stat: [...existing, ...entries] });
      }
    }

    return NextResponse.json({ success: true, created, existingKeys: Array.from(existingKeys) });
  } catch (e) {
    console.error("❌ POST /api/stats/sync-missing-for-classe-matiere:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}