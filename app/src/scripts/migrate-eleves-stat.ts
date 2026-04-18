import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

type EleveStatEntry = {
  id: string; // id du doc statistique
  libelle_stat?: string;
  repartition?: string;
  id_matiere?: string;
  annee_scolaire?: number;
};

type EleveDoc = {
  stat?: unknown[];
};

async function main() {
  const elevesSnap = await db.collection("eleves").get();
  console.log("Total eleves:", elevesSnap.size);

  let updatedEleves = 0;
  let skippedEleves = 0;
  let missingStatId = 0;

  for (const e of elevesSnap.docs) {
    const data = e.data() as EleveDoc;
    const arr = Array.isArray(data.stat) ? (data.stat as unknown[]) : [];
    if (!arr.length) {
      skippedEleves += 1;
      continue;
    }

    let changed = false;
    const next: EleveStatEntry[] = [];

    for (const item of arr) {
      const entry = (item ?? {}) as EleveStatEntry;

      if (!entry?.id) {
        next.push(entry);
        missingStatId += 1;
        continue;
      }

      // déjà migré
      if (typeof entry.annee_scolaire === "number" && Number.isFinite(entry.annee_scolaire)) {
        next.push(entry);
        continue;
      }

      // lire la stat référencée pour récupérer annee_scolaire
      const statSnap = await db.collection("statistique").doc(entry.id).get();
      if (!statSnap.exists) {
        next.push(entry);
        continue;
      }

      const s = statSnap.data() as { annee_scolaire?: unknown } | undefined;
      const y = s?.annee_scolaire;

      if (typeof y === "number" && Number.isFinite(y)) {
        next.push({ ...entry, annee_scolaire: y });
        changed = true;
      } else {
        next.push(entry);
      }
    }

    if (!changed) {
      skippedEleves += 1;
      continue;
    }

    await e.ref.set(
      {
        stat: next,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    updatedEleves += 1;
  }

  console.log({ updatedEleves, skippedEleves, missingStatId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});