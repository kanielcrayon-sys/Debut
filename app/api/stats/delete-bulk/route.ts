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
    };

    const { classeId, matiereId, libelle_stat } = body;

    if (!classeId || !matiereId || !libelle_stat) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // 1) Trouver tous les docs statistique concernés
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

    const statDocIdsToDelete = snap.docs.map((d) => d.id);
    const statIdSet = new Set(statDocIdsToDelete);

    // 2) Supprimer les docs statistique (batch)
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += 450) {
      const chunk = snap.docs.slice(i, i + 450);
      const batch = db.batch();
      for (const d of chunk) batch.delete(d.ref);
      await batch.commit();
      deleted += chunk.length;
    }

    // 3) Nettoyer eleves.stat (tous formats)
    const elevesSnap = await db.collection("eleves").where("id_classe", "==", classeId).get();

    for (const e of elevesSnap.docs) {
      const data = e.data() as EleveDoc | undefined;
      const statArr = Array.isArray(data?.stat) ? data!.stat! : [];

      const filtered = statArr.filter((entry) => {
        // Format 1: string id
        if (typeof entry === "string") {
          // si c'est un des statIds supprimés => remove
          return !statIdSet.has(entry);
        }

        // Format 2: objet
        if (isObject(entry)) {
          const obj = entry as EleveStatEntryObject;

          // si l'objet n'a pas d'id, on ne peut pas lier à un doc => on garde
          // (mais ça serait bien de nettoyer ces vieux objets plus tard)
          if (!obj.id) return true;

          // si son id fait partie des docs supprimés => remove
          if (statIdSet.has(obj.id)) return false;

          // fallback: si ça match libelle_stat et matière (quand dispo) => remove
          const lib = String(obj.libelle_stat ?? "");
          if (lib !== libelle_stat) return true;

          // si id_matiere absent => ancien format: on supprime quand même
          if (!obj.id_matiere) return false;

          return obj.id_matiere !== matiereId;
        }

        // inconnu => garder par prudence
        return true;
      });

      // évite write inutile
      const changed = filtered.length !== statArr.length;
      if (changed) {
        await e.ref.update({ stat: filtered });
      }
    }

    return NextResponse.json({ success: true, deleted, removedIds: statDocIdsToDelete.length });
  } catch (e) {
    console.error("❌ POST /api/stats/delete-bulk:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}