import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import { Eleve } from "@/app/src/interface/data";

type EleveLigne = Eleve & {
  id_inscription: string;
  id_classe: string;
  annee_scolaire: number | undefined;
};

type RawInscription = {
  id: string;
  eleve_id: string;
  id_classe: string;
  annee_scolaire?: number;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classeId: string }> }
) {
  try {
    const { classeId } = await params;
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 50);
    const after = searchParams.get("after") || null;
    const searchFilter = (searchParams.get("search") || "").trim().toLowerCase();
    const anneeScolaire = parseInt(
      searchParams.get("annee_scolaire") || `${new Date().getFullYear()}`,
      10
    );
    
    // --- AJOUT DEBUG ---
    console.log("[CLASSE API debug]", { classeId, anneeScolaire });
    const inscSnap = await db
      .collection("inscriptions")
      .where("id_classe", "==", classeId)
      .where("annee_scolaire", "==", anneeScolaire)
      .get();
    console.log("Inscriptions trouvées:", inscSnap.size);
    inscSnap.forEach(d => console.log("Insc#", d.id, d.data()));
    // --- FIN DEBUG ---

    const allInscriptions = inscSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<RawInscription, "id">),
    }));

    // 2. Récupère les élèves correspondants
    const eleveIds = allInscriptions.map((i) => i.eleve_id);

    console.log("IDs élèves à récupérer:", eleveIds);

    const eleveDocs = await Promise.all(
      eleveIds.map((id) => db.collection("eleves").doc(id).get())
    );
    const allEleves = eleveDocs
      .map((doc) =>
        doc.exists ? ({ id: doc.id, ...(doc.data() as Omit<Eleve, "id">) } as Eleve) : undefined
      );

    // Compose [{ inscription, eleve }] -- bien filter pour retirer tous undefined
    let allCombos: EleveLigne[] = allInscriptions.map((insc) => {
      const eleve = allEleves.find((el) => el && el.id === insc.eleve_id);
      if (!eleve) return undefined;
      return {
        ...eleve,
        id_inscription: insc.id,
        id_classe: insc.id_classe,
        annee_scolaire: insc.annee_scolaire,
      };
    }).filter((x): x is EleveLigne => !!x);

    // Recherche globale sur nom/prénom
    if (searchFilter) {
      allCombos = allCombos.filter((e) =>
        [
          e.identite?.nom_individu?.toLowerCase() || "",
          e.identite?.prenom_individu?.toLowerCase() || "",
        ].join(" ").startsWith(searchFilter)
      );
    }

    // Tri par nom, prénom
    allCombos.sort((a, b) => {
      const nA = (a.identite?.nom_individu || "").localeCompare(b.identite?.nom_individu || "");
      if (nA) return nA;
      return (a.identite?.prenom_individu || "").localeCompare(b.identite?.prenom_individu || "");
    });

    // Pagination façon "after" (cursor = id_inscription)
    let data: EleveLigne[] = [];
    let startIdx = 0;
    if (after) {
      startIdx = allCombos.findIndex((i) => i.id_inscription === after) + 1;
    }
    data = allCombos.slice(startIdx, startIdx + limit);

    const totalCount = allCombos.length;
    const hasPrev = startIdx > 0;
    const hasNext = startIdx + limit < totalCount;
    const firstCursor = data[0]?.id_inscription ?? null;
    const lastCursor = data[data.length - 1]?.id_inscription ?? null;

    // Stats
    let boys = 0, girls = 0;
    data.forEach((e) => {
      if (e.identite?.sexe === "M") boys++;
      if (e.identite?.sexe === "F") girls++;
    });

    return NextResponse.json({
      data,
      pagination: {
        limit,
        totalCount,
        cursors: {
          first: firstCursor,
          last: lastCursor,
        },
        hasPrev,
        hasNext,
      },
      stats: {
        boys,
        girls,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("❌ Erreur GET:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération des élèves" },
      { status: 500 }
    );
  }
}