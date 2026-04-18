import { db } from "@/app/src/lib/firebase-admin";
import { anneeScolaireStartFromDate } from "@/app/src/lib/scolarite";

type SettingsScolariteDoc = { annee_scolaire_active: number };

export async function getAnneeScolaireActive(fallbackDate: Date = new Date()): Promise<number> {
  // ✅ fallback correct (ex: avril 2026 => 2025)
  const computed = anneeScolaireStartFromDate(fallbackDate);

  const snap = await db.collection("settings").doc("scolarite").get();
  if (!snap.exists) return computed;

  const data = snap.data() as Partial<SettingsScolariteDoc> | undefined;
  const y = data?.annee_scolaire_active;

  return typeof y === "number" && Number.isFinite(y) ? y : computed;
}