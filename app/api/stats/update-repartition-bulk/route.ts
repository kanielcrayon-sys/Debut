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
    };

    const { classeId, matiereId, libelle_stat, newRepartition } = body;

    if (!classeId || !matiereId || !libelle_stat || !newRepartition) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // ✅ validation règle métier
    if (!allowedRepartitionsFor(libelle_stat).includes(newRepartition)) {
      return NextResponse.json(
        { error: `Repartition ${newRepartition} interdite pour ${libelle_stat}` },
        { status: 400 }
      );
    }

    // 1) Trouver stats existants
    const snap = await db
      .collection("statistique")
      .where("id_classe", "==", classeId)
      .where("id_matiere", "==", matiereId)
      .where("libelle_stat", "==", libelle_stat)
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

    // 3) MAJ eleves.stat (si utilisé)
    const elevesSnap = await db.collection("eleves").where("id_classe", "==", classeId).get();
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

    return NextResponse.json({ success: true, updated, newRepartition });
  } catch (e) {
    console.error("❌ POST /api/stats/update-repartition-bulk:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}