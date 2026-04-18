import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import { Eleve } from "@/app/src/interface/data";
import { FieldPath, QueryDocumentSnapshot } from "firebase-admin/firestore";

// 🔵 Cursor helpers (ordre stable: nom, prenom, docId)
type CursorPayload = { nom: string; prenom: string; id: string };

const encodeCursor = (c: CursorPayload): string =>
  Buffer.from(JSON.stringify(c), "utf8").toString("base64url");

const decodeCursor = (raw: string): CursorPayload => {
  const json = Buffer.from(raw, "base64url").toString("utf8");
  const parsed: unknown = JSON.parse(json);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("nom" in parsed) ||
    !("prenom" in parsed) ||
    !("id" in parsed)
  ) {
    throw new Error("Cursor invalide");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.nom !== "string" || typeof obj.prenom !== "string" || typeof obj.id !== "string") {
    throw new Error("Cursor invalide");
  }

  return { nom: obj.nom, prenom: obj.prenom, id: obj.id };
};

const getCursorFromDoc = (doc: QueryDocumentSnapshot): CursorPayload => {
  const data = doc.data() as FirebaseFirestore.DocumentData;

  const identite = (data["identite"] ?? {}) as Record<string, unknown>;
  const nom = typeof identite["nom_individu"] === "string" ? identite["nom_individu"] : "";
  const prenom = typeof identite["prenom_individu"] === "string" ? identite["prenom_individu"] : "";

  return { nom, prenom, id: doc.id };
};

// 🔵 GET: Récupérer les élèves d'une classe avec pagination (CURSOR) + search
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classeId: string }> }
) {
  try {
    const { classeId } = await params;
    const { searchParams } = new URL(req.url);

    const limitRaw = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

    const after = searchParams.get("after"); // page suivante
    const before = searchParams.get("before"); // page précédente
    const search = (searchParams.get("search") || "").trim(); // ✅ recherche par nom (préfixe)

    console.log(
      `📖 Récupération élèves classe ${classeId} - Limit ${limit}${
        search ? ` search="${search}"` : ""
      }${after ? " (after)" : ""}${before ? " (before)" : ""}`
    );

    if (after && before) {
      return NextResponse.json(
        { error: "Utilisez soit 'after' soit 'before', pas les deux." },
        { status: 400 }
      );
    }

    // ✅ Base query paginée (DB-level) + tri stable
    let q = db
      .collection("eleves")
      .where("id_classe", "==", classeId)
      .where("statut_eleve", "==", "actif");

    // ✅ Recherche préfixe sur le NOM uniquement (évite startAt/endAt multi-champs)
    if (search) {
      q = q
        .where("identite.nom_individu", ">=", search)
        .where("identite.nom_individu", "<=", search + "\uf8ff");
    }

    // ✅ Ordre stable (toujours le même)
    q = q
      .orderBy("identite.nom_individu")
      .orderBy("identite.prenom_individu")
      .orderBy(FieldPath.documentId());

    // ✅ Pagination cursor
    if (after) {
      const c = decodeCursor(after);
      q = q.startAfter(c.nom, c.prenom, c.id).limit(limit);
    } else if (before) {
      const c = decodeCursor(before);
      q = q.endBefore(c.nom, c.prenom, c.id).limitToLast(limit);
    } else {
      q = q.limit(limit);
    }

    const snapshot = await q.get();

    const pageEleves: Eleve[] = snapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseFirestore.DocumentData;
      return { id: doc.id, ...(data as unknown as Omit<Eleve, "id">) } as Eleve;
    });

    const firstDoc = snapshot.docs[0];
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    const firstCursor = firstDoc ? encodeCursor(getCursorFromDoc(firstDoc)) : null;
    const lastCursor = lastDoc ? encodeCursor(getCursorFromDoc(lastDoc)) : null;

    // ✅ HAS NEXT (peek 1 doc) — respecte search aussi
    let hasNext = false;
    if (lastDoc) {
      const last = getCursorFromDoc(lastDoc);

      let peekQ = db
        .collection("eleves")
        .where("id_classe", "==", classeId)
        .where("statut_eleve", "==", "actif");

      if (search) {
        peekQ = peekQ
          .where("identite.nom_individu", ">=", search)
          .where("identite.nom_individu", "<=", search + "\uf8ff");
      }

      peekQ = peekQ
        .orderBy("identite.nom_individu")
        .orderBy("identite.prenom_individu")
        .orderBy(FieldPath.documentId());

      const peekSnap = await peekQ
        .startAfter(last.nom, last.prenom, last.id)
        .limit(1)
        .get();

      hasNext = !peekSnap.empty;
    }

    // ✅ HAS PREV (peek 1 doc) — respecte search aussi
    let hasPrev = false;
    if (firstDoc) {
      const first = getCursorFromDoc(firstDoc);

      let peekQ = db
        .collection("eleves")
        .where("id_classe", "==", classeId)
        .where("statut_eleve", "==", "actif");

      if (search) {
        peekQ = peekQ
          .where("identite.nom_individu", ">=", search)
          .where("identite.nom_individu", "<=", search + "\uf8ff");
      }

      peekQ = peekQ
        .orderBy("identite.nom_individu")
        .orderBy("identite.prenom_individu")
        .orderBy(FieldPath.documentId());

      const peekSnap = await peekQ
        .endBefore(first.nom, first.prenom, first.id)
        .limitToLast(1)
        .get();

      hasPrev = !peekSnap.empty;
    }

    // ✅ TOTAL COUNT + STATS (sur le même filtre: classe + actif + search éventuel)
    let countQ = db
      .collection("eleves")
      .where("id_classe", "==", classeId)
      .where("statut_eleve", "==", "actif");

    if (search) {
      countQ = countQ
        .where("identite.nom_individu", ">=", search)
        .where("identite.nom_individu", "<=", search + "\uf8ff");
    }

    const countSnap = await countQ.get();
    const totalCount = countSnap.size;

    let boys = 0;
    let girls = 0;

    countSnap.forEach((d) => {
      const data = d.data() as FirebaseFirestore.DocumentData;
      const identite = (data["identite"] ?? {}) as Record<string, unknown>;
      const sexe = identite["sexe"];
      if (sexe === "M") boys++;
      if (sexe === "F") girls++;
    });

    console.log(`✅ ${pageEleves.length} élève(s) retourné(s)`);

    return NextResponse.json({
      data: pageEleves,
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