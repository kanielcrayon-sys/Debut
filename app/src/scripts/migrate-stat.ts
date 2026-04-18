import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

type StatDoc = {
  annee?: number;
  mois?: number;
  date?: string; // "YYYY-MM-DD"
  createdAt?: string; // ISO
  annee_scolaire?: number;
};

function guessStartYear(s: StatDoc): number | null {
  // 1) Priorité: annee+mois (déjà présents dans tes docs)
  if (typeof s.annee === "number" && Number.isFinite(s.annee) && typeof s.mois === "number" && Number.isFinite(s.mois)) {
    return s.mois >= 9 ? s.annee : s.annee - 1;
  }

  // 2) Sinon: parse date "YYYY-MM-DD"
  if (typeof s.date === "string") {
    const m = s.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      return month >= 9 ? year : year - 1;
    }
  }

  // 3) Sinon: parse createdAt ISO
  if (typeof s.createdAt === "string") {
    const m = s.createdAt.match(/^(\d{4})-(\d{2})-/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      return month >= 9 ? year : year - 1;
    }
  }

  return null;
}

async function main() {
  const snap = await db.collection("statistique").get();
  console.log(`Total docs statistique: ${snap.size}`);

  let updated = 0;
  let skipped = 0;
  let noYear = 0;

  let batch = db.batch();
  let ops = 0;

  for (const d of snap.docs) {
    const data = d.data() as StatDoc;

    if (typeof data.annee_scolaire === "number" && Number.isFinite(data.annee_scolaire)) {
      skipped += 1;
      continue;
    }

    const startYear = guessStartYear(data);
    if (!startYear) {
      noYear += 1;
      continue;
    }

    batch.update(d.ref, {
      annee_scolaire: startYear,
      updatedAt: new Date().toISOString(),
    });

    updated += 1;
    ops += 1;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();

  console.log({ updated, skipped, noYear });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});