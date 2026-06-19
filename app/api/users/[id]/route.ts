import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/app/src/lib/firebase-admin";

async function checkAdmin(req: NextRequest) {
  const authorization = req.headers.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authorization.split("Bearer ")[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  const requesterUid = decodedToken.uid;

  const requesterDoc = await adminDb.collection("users").doc(requesterUid).get();

  if (!requesterDoc.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const requesterData = requesterDoc.data();

  if (requesterData?.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return { requesterUid };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await checkAdmin(req);

    const { id } = await context.params;
    const body = await req.json();
    const { pseudo, contact, role } = body;

    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    if (!pseudo || !contact || !role) {
      return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
    }

    if (!["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    await adminDb.collection("users").doc(id).update({
      pseudo,
      contact,
      role,
    });

    return NextResponse.json(
      { message: "Utilisateur modifié avec succès." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };

    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Token manquant ou invalide." },
        { status: 401 }
      );
    }

    if (err.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux admins." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: err.message || err.code || "Erreur serveur." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { requesterUid } = await checkAdmin(req);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID manquant." }, { status: 400 });
    }

    if (id === requesterUid) {
      return NextResponse.json(
        { error: "Un admin ne peut pas se supprimer lui-même." },
        { status: 400 }
      );
    }

    await adminAuth.deleteUser(id);
    await adminDb.collection("users").doc(id).delete();

    return NextResponse.json(
      { message: "Utilisateur supprimé avec succès." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };

    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Token manquant ou invalide." },
        { status: 401 }
      );
    }

    if (err.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    if (err.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux admins." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: err.message || err.code || "Erreur serveur." },
      { status: 500 }
    );
  }
}