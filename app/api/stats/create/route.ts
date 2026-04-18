import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

const allowedRepartitionsFor = (libelle: StatType): Repartition[] => {
  if (libelle === "Stat1") return ["Trimestre1", "Semestre1"];
  if (libelle === "Stat2") return ["Trimestre2", "Semestre2"];
  return ["Trimestre3"];
};

type EleveStatEntry = {
  id: string;
  libelle_stat: StatType;
  repartition: Repartition;
  id_matiere: string;
};

type EleveDoc = {
  stat?: unknown[];
};

type SettingsScolariteDoc = {
  // ✅ convention: année de début (ex: 2025 => 2025-2026)
  annee_scolaire_active: number;
  createdAt?: string;
  updatedAt?: string;
};

async function getAnneeScolaireActive(): Promise<number> {
  const ref = db.collection("settings").doc("scolarite");
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("settings/scolarite introuvable. Appelle POST /api/settings/init d'abord.");
  }

  const data = snap.data() as Partial<SettingsScolariteDoc> | undefined;
  const y = data?.annee_scolaire_active;

  if (typeof y !== "number" || !Number.isFinite(y)) {
    throw new Error("settings/scolarite invalide (annee_scolaire_active manquant)");
  }

  return y;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      classeId?: string;
      matiereId?: string;
      libelle_stat?: StatType;
      repartition?: Repartition;
    };

    const { classeId, matiereId, libelle_stat, repartition } = body;

    if (!classeId || !matiereId || !libelle_stat || !repartition) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // ✅ validation règle métier
    if (!allowedRepartitionsFor(libelle_stat).includes(repartition)) {
      return NextResponse.json(
        { error: `Repartition ${repartition} interdite pour ${libelle_stat}` },
        { status: 400 }
      );
    }

    // ✅ année scolaire active (année de début: 2025 => 2025-2026)
    const annee_scolaire = await getAnneeScolaireActive();

    console.log(
      `📊 Création Stats (classe entière) - Libelle: ${libelle_stat}, Repartition: ${repartition}, Année scolaire: ${annee_scolaire}-${annee_scolaire + 1}`
    );

    // 1) Charger classe + matière
    const [classeDoc, matiereDoc] = await Promise.all([
      db.collection("classes").doc(classeId).get(),
      db.collection("matieres").doc(matiereId).get(),
    ]);

    if (!classeDoc.exists) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    if (!matiereDoc.exists) return NextResponse.json({ error: "Matière introuvable" }, { status: 404 });

    const classeData = classeDoc.data();
    const matiereData = matiereDoc.data();

    // 2) Récupérer TOUS les élèves actifs de la classe
    const elevesSnap = await db
      .collection("eleves")
      .where("id_classe", "==", classeId)
      .where("statut_eleve", "==", "actif")
      .get();

    if (elevesSnap.empty) {
      return NextResponse.json({ success: false, message: "Aucun élève actif trouvé", created: 0 }, { status: 200 });
    }

    const eleveIds = elevesSnap.docs.map((d) => d.id);

    // 3) Éviter les doublons (✅ filtré aussi par année)
    const existingStatsSnap = await db
      .collection("statistique")
      .where("id_classe", "==", classeId)
      .where("id_matiere", "==", matiereId)
      .where("libelle_stat", "==", libelle_stat)
      .where("annee_scolaire", "==", annee_scolaire)
      .get();

    const alreadyHasStat = new Set<string>(); // eleveId
    existingStatsSnap.forEach((d) => {
      const s = d.data() as Partial<{ id_eleve: string; repartition: Repartition }>;
      if (!s.id_eleve) return;
      // si tu veux être strict et éviter doublon par repartition aussi, décommente:
      // if (s.repartition !== repartition) return;
      alreadyHasStat.add(s.id_eleve);
    });

    const toCreateEleveIds = eleveIds.filter((id) => !alreadyHasStat.has(id));

    if (toCreateEleveIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `${libelle_stat} existe déjà pour tous les élèves (rien à créer).`,
        created: 0,
        annee_scolaire,
      });
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const baseStatData = {
      id_classe: classeId,
      id_matiere: matiereId,
      id_enseignant: matiereData?.id_enseignant ?? null,
      libelle_stat,
      repartition,
      classe: classeData?.libelle_classe ?? "",
      matiere: matiereData?.libelle_matiere ?? "",
      enseignant: matiereData?.enseignant ?? "Non assigné",
      jour: now.getDate(),
      mois: now.getMonth() + 1,
      annee: now.getFullYear(),
      date: nowISO.split("T")[0],
      annee_scolaire, // ✅ AJOUT CRITIQUE
      notes: [],
      cloture: false,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // 4) Créer stats + update eleves.stat
    let created = 0;
    const statIdByEleve: Record<string, string> = {};

    for (let i = 0; i < toCreateEleveIds.length; i += 400) {
      const chunk = toCreateEleveIds.slice(i, i + 400);
      const batch = db.batch();

      for (const eleveId of chunk) {
        const statRef = db.collection("statistique").doc();
        statIdByEleve[eleveId] = statRef.id;

        batch.set(statRef, {
          ...baseStatData,
          id_eleve: eleveId,
        });
      }

      await batch.commit();
      created += chunk.length;
    }

    // 5) Mise à jour eleves.stat (format stable)
    for (let i = 0; i < toCreateEleveIds.length; i += 200) {
      const chunk = toCreateEleveIds.slice(i, i + 200);

      await Promise.all(
        chunk.map(async (eleveId) => {
          const eleveRef = db.collection("eleves").doc(eleveId);
          const eleveSnap = await eleveRef.get();
          const eleveData = eleveSnap.data() as EleveDoc | undefined;

          const existing = Array.isArray(eleveData?.stat) ? (eleveData!.stat as unknown[]) : [];

          const entry: EleveStatEntry = {
            id: statIdByEleve[eleveId],
            libelle_stat,
            repartition,
            id_matiere: matiereId,
          };

          await eleveRef.update({ stat: [...existing, entry] });
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: `${created} stat(s) créé(s) pour toute la classe`,
      created,
      annee_scolaire,
    });
  } catch (error) {
    console.error("❌ Erreur POST stats/create:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des stats", details: String(error) },
      { status: 500 }
    );
  }
}