import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const statId = searchParams.get("statId");
    const eleveId = searchParams.get("eleveId");
    const matiereId = searchParams.get("matiereId");
    const classeId = searchParams.get("classeId");

    if (!statId) {
      return NextResponse.json({ error: "statId manquant" }, { status: 400 });
    }

    const docRef = db.collection("statistique").doc(statId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Stat non trouvé" }, { status: 404 });
    }

    const data = docSnap.data() as Record<string, unknown>;

    // ✅ sécurité cohérence URL
    if (eleveId && data.id_eleve !== eleveId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cet élève" }, { status: 400 });
    }
    if (matiereId && data.id_matiere !== matiereId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cette matière" }, { status: 400 });
    }
    if (classeId && data.id_classe !== classeId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cette classe" }, { status: 400 });
    }

    // ✅ Enrichir avec la matière ACTUELLE
    const idMatiere = (data.id_matiere as string | undefined) ?? matiereId ?? null;

    let matiereLibelle = data.matiere;
    let enseignant = data.enseignant;
    let coef = data.coef;

    if (idMatiere) {
      const matiereSnap = await db.collection("matieres").doc(idMatiere).get();
      if (matiereSnap.exists) {
        const m = matiereSnap.data() as Record<string, unknown>;

        matiereLibelle = (m.libelle_matiere as string | undefined) ?? matiereLibelle;
        enseignant = (m.enseignant as string | undefined) ?? enseignant;
        coef = (m.coef as number | undefined) ?? coef;
      }
    }

    return NextResponse.json({
      data: {
        id: docSnap.id,
        ...data,

        // ✅ valeurs fraîches (écrasent snapshot si dispo)
        matiere: matiereLibelle,
        enseignant,
        coef,
      },
    });
  } catch (e) {
    console.error("❌ GET /api/stats/get-by-id:", e);
    return NextResponse.json(
      { error: `Erreur: ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}