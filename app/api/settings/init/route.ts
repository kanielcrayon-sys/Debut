import { NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import { anneeScolaireStartFromDate } from "@/app/src/lib/scolarite";

type Body = {
  annee_scolaire_active?: number; // ✅ optionnel maintenant
  force?: boolean; // si true: écrase la valeur existante
};

type SettingsScolariteDoc = {
  annee_scolaire_active: number; // ✅ année de début (ex: 2025 pour 2025-2026)
  createdAt: string;
  updatedAt: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<Body> | null;
  const force = Boolean(body?.force);

  const computed = anneeScolaireStartFromDate(new Date());
  const annee = body?.annee_scolaire_active ?? computed;

  if (typeof annee !== "number" || !Number.isFinite(annee)) {
    return NextResponse.json({ error: "annee_scolaire_active invalide" }, { status: 400 });
  }

  const ref = db.collection("settings").doc("scolarite");
  const snap = await ref.get();

  // existe déjà
  if (snap.exists && !force) {
    return NextResponse.json({ ok: true, created: false, updated: false, data: snap.data() });
  }

  const nowIso = new Date().toISOString();

  if (!snap.exists) {
    const payload: SettingsScolariteDoc = {
      annee_scolaire_active: annee,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await ref.set(payload);
    return NextResponse.json({ ok: true, created: true, updated: false, data: payload });
  }

  // force update
  await ref.set(
    {
      annee_scolaire_active: annee,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  const updated = await ref.get();
  return NextResponse.json({ ok: true, created: false, updated: true, data: updated.data() });
}