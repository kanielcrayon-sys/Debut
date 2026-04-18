import { NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import { anneeScolaireStartFromDate } from "@/app/src/lib/scolarite";

type SettingsScolariteDoc = {
  // ✅ convention: année de début (ex: 2025 => 2025-2026)
  annee_scolaire_active: number;
  createdAt?: string;
  updatedAt?: string;
};

export async function GET() {
  const ref = db.collection("settings").doc("scolarite");
  const snap = await ref.get();

  if (!snap.exists) {
    return NextResponse.json(
      { error: "settings/scolarite introuvable. Appelle POST /api/settings/init d'abord." },
      { status: 404 }
    );
  }

  const data = snap.data() as Partial<SettingsScolariteDoc> | undefined;
  if (!data || typeof data.annee_scolaire_active !== "number") {
    return NextResponse.json({ error: "settings/scolarite invalide" }, { status: 500 });
  }

  // ✅ on renvoie aussi un label pratique pour l'UI
  const start = data.annee_scolaire_active;
  return NextResponse.json({
    ok: true,
    data: {
      ...data,
      annee_scolaire_label: `${start}-${start + 1}`,
    },
  });
}

type PatchBody = {
  annee_scolaire_active?: number; // ✅ optionnel: si absent, on calcule
  auto?: boolean; // ✅ si true: calcule depuis la date du jour
};

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<PatchBody> | null;

  const useAuto = body?.auto === true;
  const computed = anneeScolaireStartFromDate(new Date());

  const annee = useAuto ? computed : body?.annee_scolaire_active;

  if (typeof annee !== "number" || !Number.isFinite(annee)) {
    return NextResponse.json({ error: "annee_scolaire_active invalide" }, { status: 400 });
  }

  const ref = db.collection("settings").doc("scolarite");
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "settings/scolarite introuvable. Appelle POST /api/settings/init d'abord." },
      { status: 404 }
    );
  }

  await ref.set(
    {
      annee_scolaire_active: annee,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  const updated = await ref.get();
  const data = updated.data() as Partial<SettingsScolariteDoc> | undefined;

  if (!data || typeof data.annee_scolaire_active !== "number") {
    return NextResponse.json({ error: "settings/scolarite invalide après update" }, { status: 500 });
  }

  const start = data.annee_scolaire_active;
  return NextResponse.json({
    ok: true,
    data: {
      ...data,
      annee_scolaire_label: `${start}-${start + 1}`,
    },
  });
}