import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

type StatType = "Stat1" | "Stat2" | "Stat3";

type EleveStatEntryObject = {
  id?: string;
  libelle_stat?: string;
  id_matiere?: string;
  repartition?: string;
};

type EleveStatEntry = string | EleveStatEntryObject;

type EleveDoc = {
  stat?: EleveStatEntry[];
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      classeId?: string;
      matiereId?: string;
      libelle_stat?: StatType;
      annee_scolaire?: number; // ⚠️ Requis maintenant !
    };

    const { classeId, matiereId, libelle_stat, annee_scolaire } = body;

    if (!classeId || !matiereId || !libelle_stat || typeof annee_scolaire !== "number") {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // 1) Supprimer les stats de la classe/matière/libelle_stat/annee_scolaire choisis
    const snap = await db
      .collection("statistique")
      .where("id_classe", "==", classeId)
      .where("id_matiere", "==", matiereId)
      .where("libelle_stat", "==", libelle_stat)
      .where("annee_scolaire", "==", annee_scolaire)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: "Stat pas encore créé (rien à supprimer)" },
        { status: 404 }
      );
    }

    const statDocIdsToDelete = snap.docs.map((d) => d.id);
    const statIdSet = new Set(statDocIdsToDelete);

    // 2) Supprimer les docs "statistique" en batch
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += 450) {
      const chunk = snap.docs.slice(i, i + 450);
      const batch = db.batch();
      for (const d of chunk) batch.delete(d.ref);
      await batch.commit();
      deleted += chunk.length;
    }

    // 3) Récupère SEULEMENT les élèves ACTIFS de la CLASSE pour l'année
    const inscriptionsSnap = await db
      .collection("inscriptions")
      .where("id_classe", "==", classeId)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("statut", "==", "actif")
      .get();

    const eleveIds: string[] = inscriptionsSnap.docs
      .map((d) => d.data().eleve_id)
      .filter((id): id is string => typeof id === "string");

    // Firestore limitation: "in" max 10 per query
    for (let i = 0; i < eleveIds.length; i += 10) {
      const chunk = eleveIds.slice(i, i + 10);
      if (chunk.length === 0) continue;

      const elevesSnap = await db.collection("eleves").where("__name__", "in", chunk).get();

      for (const e of elevesSnap.docs) {
        const data = e.data() as EleveDoc | undefined;
        const statArr = Array.isArray(data?.stat) ? data!.stat! : [];

        const filtered = statArr.filter((entry) => {
          // Format 1: string id
          if (typeof entry === "string") {
            return !statIdSet.has(entry);
          }
          // Format 2: objet
          if (isObject(entry)) {
            const obj = entry as EleveStatEntryObject;
            if (!obj.id) return true;
            if (statIdSet.has(obj.id)) return false;
            const lib = String(obj.libelle_stat ?? "");
            if (lib !== libelle_stat) return true;
            if (!obj.id_matiere) return false;
            return obj.id_matiere !== matiereId;
          }
          return true;
        });

        const changed = filtered.length !== statArr.length;
        if (changed) {
          await e.ref.update({ stat: filtered });
        }
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      removedIds: statDocIdsToDelete.length,
      elevesNettoyés: eleveIds.length,
    });
  } catch (e) {
    console.error("❌ POST /api/stats/delete-bulk:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}