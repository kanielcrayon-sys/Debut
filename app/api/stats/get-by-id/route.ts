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

    // ✅ sécurité: si l'URL fournit des ids, on vérifie la cohérence
    if (eleveId && data.id_eleve !== eleveId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cet élève" }, { status: 400 });
    }
    if (matiereId && data.id_matiere !== matiereId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cette matière" }, { status: 400 });
    }
    if (classeId && data.id_classe !== classeId) {
      return NextResponse.json({ error: "Stat ne correspond pas à cette classe" }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        id: docSnap.id,
        ...data,
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