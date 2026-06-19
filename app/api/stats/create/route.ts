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
  annee_scolaire_active: number; // ex: 2025 => 2025-2026
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

    if (!allowedRepartitionsFor(libelle_stat).includes(repartition)) {
      return NextResponse.json(
        { error: `Repartition ${repartition} interdite pour ${libelle_stat}` },
        { status: 400 }
      );
    }

    const annee_scolaire = await getAnneeScolaireActive();

    console.log("[CREATE] START", {
      classeId,
      matiereId,
      libelle_stat,
      repartition,
      annee_scolaire,
    });

    // 1) Charger classe + matière
    const [classeDoc, matiereDoc] = await Promise.all([
      db.collection("classes").doc(classeId).get(),
      db.collection("matieres").doc(matiereId).get(),
    ]);

    if (!classeDoc.exists) {
      console.log("[CREATE] Classe introuvable", { classeId });
      return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    }

    if (!matiereDoc.exists) {
      console.log("[CREATE] Matière introuvable", { matiereId });
      return NextResponse.json({ error: "Matière introuvable" }, { status: 404 });
    }

    const classeData = classeDoc.data();
    const matiereData = matiereDoc.data();

    // 2) Récupérer élèves actifs via inscriptions
    const inscriptionsSnap = await db
      .collection("inscriptions")
      .where("id_classe", "==", classeId)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("statut", "==", "actif")
      .get();

    console.log("[CREATE] inscriptions actifs", inscriptionsSnap.size);

    if (inscriptionsSnap.empty) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun élève actif trouvé pour cette année scolaire",
          created: 0,
          annee_scolaire,
        },
        { status: 200 }
      );
    }

    const rawEleveIds = inscriptionsSnap.docs
      .map((d) => d.data().eleve_id)
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

    const eleveIds = Array.from(new Set(rawEleveIds));

    console.log("[CREATE] eleveIds actifs (unique)", eleveIds.length, eleveIds);

    if (eleveIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun eleve_id valide trouvé dans inscriptions.",
          created: 0,
          annee_scolaire,
        },
        { status: 200 }
      );
    }

    // 3) Vérification ROBUSTE par élève (évite faux positifs global query)
    const toCreateEleveIds: string[] = [];
    const alreadyHasStat: string[] = [];

    for (const eleveId of eleveIds) {
      const check = await db
        .collection("statistique")
        .where("id_classe", "==", classeId)
        .where("id_matiere", "==", matiereId)
        .where("id_eleve", "==", eleveId)
        .where("libelle_stat", "==", libelle_stat)
        .where("repartition", "==", repartition)
        .where("annee_scolaire", "==", annee_scolaire)
        .limit(1)
        .get();

      if (check.empty) toCreateEleveIds.push(eleveId);
      else alreadyHasStat.push(eleveId);
    }

    console.log("[CREATE] alreadyHasStat", alreadyHasStat.length, alreadyHasStat);
    console.log("[CREATE] toCreateEleveIds", toCreateEleveIds.length, toCreateEleveIds);

    if (toCreateEleveIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `${libelle_stat}/${repartition} existe déjà pour tous les élèves (rien à créer).`,
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
      annee_scolaire,

      notes: [],
      cloture: false,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // 4) Créer stats en batch
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
      console.log("[CREATE] batch committed", { chunkSize: chunk.length, createdSoFar: created });
    }

    // 5) Mise à jour eleves.stat sans doublons
    for (let i = 0; i < toCreateEleveIds.length; i += 200) {
      const chunk = toCreateEleveIds.slice(i, i + 200);

      await Promise.all(
        chunk.map(async (eleveId) => {
          const eleveRef = db.collection("eleves").doc(eleveId);
          const eleveSnap = await eleveRef.get();

          if (!eleveSnap.exists) {
            console.log("[CREATE] eleve introuvable pour update stat[]", { eleveId });
            return;
          }

          const eleveData = eleveSnap.data() as EleveDoc | undefined;
          const existing = Array.isArray(eleveData?.stat) ? (eleveData!.stat as unknown[]) : [];

          const entry: EleveStatEntry = {
            id: statIdByEleve[eleveId],
            libelle_stat,
            repartition,
            id_matiere: matiereId,
          };

          const alreadyInEleveStat = existing.some((x) => {
            if (!x || typeof x !== "object") return false;
            const r = x as Partial<EleveStatEntry>;
            return (
              r.id === entry.id ||
              (r.libelle_stat === entry.libelle_stat &&
                r.repartition === entry.repartition &&
                r.id_matiere === entry.id_matiere)
            );
          });

          if (!alreadyInEleveStat) {
            await eleveRef.update({ stat: [...existing, entry] });
          }
        })
      );
    }

    console.log("[CREATE] DONE", {
      classeId,
      matiereId,
      libelle_stat,
      repartition,
      annee_scolaire,
      created,
    });

    return NextResponse.json({
      success: true,
      message: `${created} stat(s) créé(s) pour toute la classe`,
      created,
      annee_scolaire,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/stats/create:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des stats", details: String(error) },
      { status: 500 }
    );
  }
}