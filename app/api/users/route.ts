import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/app/src/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pseudo, contact, email, password, role } = body;

    if (!pseudo || !contact || !email || !password || !role) {
      return NextResponse.json(
        { error: "Champs manquants." },
        { status: 400 }
      );
    }

    if (!["user", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Rôle invalide." },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: pseudo,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      pseudo,
      contact,
      email,
      role,
      register_date: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        message: "Utilisateur créé avec succès.",
        uid: userRecord.uid,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    return NextResponse.json(
      {
        error: err.message || err.code || "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}