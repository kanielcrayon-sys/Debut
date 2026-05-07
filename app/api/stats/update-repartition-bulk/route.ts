import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

type EleveStatEntry = {
  id: string;
  libelle_stat: StatType;
  repartition?: Repartition;
  id_matiere?: string;
};

type EleveDoc = {
  stat?: EleveStatEntry[];
};

const allowedRepartitionsFor = (libelle: StatType): Repartition[] => {
  if (libelle === "Stat1") return ["Trimestre1", "Semestre1"];
  if (libelle === "Stat2") return ["Trimestre2", "Semestre2"];
  return ["Trimestre3"];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      classeId?: string;
      matiereId?: string;
      libelle_stat?: StatType;
      newRepartition?: Repartition;
      annee_scolaire?: number; // <- nouvel argument obligatoire
    };

    const { classeId, matiereId, libelle_stat, newRepartition, annee_scolaire } = body;

    if (
      !classeId ||
      !matiereId ||
      !libelle_stat ||
      !newRepartition ||
      typeof annee_scolaire !== "number"
    ) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // ✅ validation règle métier
    if (!allowedRepartitionsFor(libelle_stat).includes(newRepartition)) {
      return NextResponse.json(
        { error: `Repartition ${newRepartition} interdite pour ${libelle_stat}` },
        { status: 400 }
      );
    }

    // 1) Trouver stats existants pour cette classe/matière/stat/ANNEE SCOLAIRE
    const snap = await db
      .collection("statistique")
      .where("id_classe", "==", classeId)
      .where("id_matiere", "==", matiereId)
      .where("libelle_stat", "==", libelle_stat)
      .where("annee_scolaire", "==", annee_scolaire)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: "Stat pas encore créé" },
        { status: 404 }
      );
    }

    // 2) Update en batch
    const docs = snap.docs;
    let updated = 0;

    for (let i = 0; i < docs.length; i += 450) {
      const chunk = docs.slice(i, i + 450);
      const batch = db.batch();
      for (const d of chunk) batch.update(d.ref, { repartition: newRepartition });
      await batch.commit();
      updated += chunk.length;
    }

    // 3) MAJ eleves.stat mais UNIQUEMENT sur les élèves actifs dans la classe pour l'année
    const inscriptionsSnap = await db
      .collection("inscriptions")
      .where("id_classe", "==", classeId)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("statut", "==", "actif")
      .get();

    const eleveIds = inscriptionsSnap.docs
      .map((d) => d.data().eleve_id)
      .filter((id): id is string => typeof id === "string");

    // Firestore limitation: 10 par requête "in"
    for (let i = 0; i < eleveIds.length; i += 10) {
      const chunk = eleveIds.slice(i, i + 10);
      if (chunk.length === 0) continue;

      const elevesSnap = await db.collection("eleves").where("__name__", "in", chunk).get();

      for (const e of elevesSnap.docs) {
        const data = e.data() as EleveDoc | undefined;
        const statArr = Array.isArray(data?.stat) ? data!.stat! : [];

        const mapped = statArr.map((s) => {
          if (s.libelle_stat === libelle_stat && s.id_matiere === matiereId) {
            return { ...s, repartition: newRepartition };
          }
          return s;
        });

        await e.ref.update({ stat: mapped });
      }
    }

    return NextResponse.json({ success: true, updated, newRepartition });
  } catch (e) {
    console.error("❌ POST /api/stats/update-repartition-bulk:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}