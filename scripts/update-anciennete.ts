import 'dotenv/config'; // charge les variables d'env depuis ton .env.local/.env
import { db } from '../app/src/lib/firebase-admin';

async function updateAnciennete() {
  const snaps = await db.collection("inscriptions").get();
  let count = 0;
  for (const doc of snaps.docs) {
    if (!doc.data().anciennete) {
      await doc.ref.update({ anciennete: "nouveau" });
      console.log(`➕ MAJ sur ${doc.id}`);
      count++;
    }
  }
  console.log(`Mise à jour terminée : ${count} inscriptions corrigées.`);
  process.exit(0);
}

updateAnciennete();