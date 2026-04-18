import { NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";

type Body = {
  id_classe: string;
  mode: "trimestre" | "semestre";
  annee_scolaire: number;
};

type ClasseDoc = {
  libelle_classe?: string;
  classe?: string;
  id_classe_suivante?: string | null;
};

type BulletinDoc = {
  id_eleve?: string;
  verdict?: "Admis" | "Échoué" | "Admis par décision" | string;
};

type ClotureFinal = {
  libelle_stat: "Stat2" | "Stat3";
  repartition: "Semestre2" | "Trimestre3";
};

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Body>;
  const id_classe = body.id_classe;
  const mode = body.mode;
  const annee_scolaire = body.annee_scolaire;

  if (!id_classe || !mode || !annee_scolaire) {
    return NextResponse.json({ error: "id_classe, mode, annee_scolaire requis" }, { status: 400 });
  }

  const final: ClotureFinal =
    mode === "semestre"
      ? { libelle_stat: "Stat2", repartition: "Semestre2" }
      : { libelle_stat: "Stat3", repartition: "Trimestre3" };

  // anti double-clôture
  const clotureId = `${annee_scolaire}_${id_classe}`;
  const clotureRef = db.collection("clotures").doc(clotureId);
  const clotureSnap = await clotureRef.get();
  if (clotureSnap.exists) {
    return NextResponse.json({ error: "Classe déjà clôturée pour cette année_scolaire" }, { status: 409 });
  }

  const classeRef = db.collection("classes").doc(id_classe);
  const classeSnap = await classeRef.get();
  if (!classeSnap.exists) {
    return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
  }

  const classe = classeSnap.data() as ClasseDoc;
  const classeLabel = classe.libelle_classe ?? classe.classe ?? "";
  const id_classe_suivante = classe.id_classe_suivante ?? null;

  let classeSuivanteLabel: string | null = null;
  if (id_classe_suivante) {
    const nextSnap = await db.collection("classes").doc(id_classe_suivante).get();
    if (!nextSnap.exists) {
      return NextResponse.json(
        { error: "id_classe_suivante pointe vers une classe introuvable" },
        { status: 400 }
      );
    }
    const nextClasse = nextSnap.data() as ClasseDoc;
    classeSuivanteLabel = nextClasse.libelle_classe ?? nextClasse.classe ?? "";
  }

  const bulletinsSnap = await db
    .collection("bulletins")
    .where("id_classe", "==", id_classe)
    .where("annee_scolaire", "==", annee_scolaire)
    .where("libelle_stat", "==", final.libelle_stat)
    .where("repartition", "==", final.repartition)
    .get();

  if (bulletinsSnap.empty) {
    return NextResponse.json(
      { error: "Aucun bulletin final trouvé pour cette classe/année (final). Génère les bulletins finaux avant de clôturer." },
      { status: 400 }
    );
  }

  const nextYear = annee_scolaire + 1;

  let batch = db.batch();
  let ops = 0;
  const commitBatch = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  let nb_admis = 0;
  let nb_echoues = 0;
  let nb_sortis = 0;
  let nb_processed = 0;

  for (const snap of bulletinsSnap.docs) {
    const b = snap.data() as BulletinDoc;
    const id_eleve = b.id_eleve;
    const verdict = b.verdict;

    if (!id_eleve || !verdict) continue;

    const eleveRef = db.collection("eleves").doc(id_eleve);
    const eleveSnap = await eleveRef.get();
    if (!eleveSnap.exists) continue;

    const isAdmis = verdict === "Admis" || verdict === "Admis par décision";
    const isEchoue = verdict === "Échoué";

    let destIdClasse: string | null = id_classe;
    let destClasseLabel: string | null = classeLabel;
    let statut_scolarite: "en_cours" | "sorti" = "en_cours";
    let anciennete: "nouveau" | "ancien" = "ancien";

    if (isAdmis) {
      nb_admis += 1;
      if (id_classe_suivante) {
        destIdClasse = id_classe_suivante;
        destClasseLabel = classeSuivanteLabel ?? "";
        anciennete = "nouveau";
      } else {
        destIdClasse = null;
        destClasseLabel = null;
        statut_scolarite = "sorti";
        nb_sortis += 1;
      }
    } else if (isEchoue) {
      nb_echoues += 1;
      destIdClasse = id_classe;
      destClasseLabel = classeLabel;
      anciennete = "ancien";
    } else {
      continue;
    }

    batch.update(eleveRef, {
      id_classe: destIdClasse,
      classe: destClasseLabel,
      statut_scolarite,
      updatedAt: new Date().toISOString(),
    });
    ops += 1;

    const inscId = `${nextYear}_${id_eleve}`;
    batch.set(db.collection("inscriptions").doc(inscId), {
      id: inscId,
      id_eleve,
      annee_scolaire: nextYear,
      id_classe: destIdClasse,
      classe: destClasseLabel,
      anciennete,
      origine_id_classe: id_classe,
      origine_classe: classeLabel,
      verdict_fin_annee: verdict,
      createdAt: new Date().toISOString(),
    });
    ops += 1;

    nb_processed += 1;
    if (ops >= 450) await commitBatch();
  }

  batch.set(clotureRef, {
    id: clotureId,
    id_classe,
    classe: classeLabel,
    annee_scolaire,
    mode,
    final,
    createdAt: new Date().toISOString(),
    nb_bulletins: bulletinsSnap.size,
    nb_processed,
    nb_admis,
    nb_echoues,
    nb_sortis,
  });
  ops += 1;

  await commitBatch();

  return NextResponse.json({
    ok: true,
    message: "Clôture effectuée",
    annee_scolaire,
    annee_scolaire_suivante: nextYear,
    nb_bulletins: bulletinsSnap.size,
    nb_processed,
    nb_admis,
    nb_echoues,
    nb_sortis,
  });
}