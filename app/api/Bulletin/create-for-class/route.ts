import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import type { Bulletin, Classe, Eleve, Matiere, Stat, StatObservation, VerdictBulletin } from "@/app/src/interface/data";
import { preserveDecisionVerdict } from "@/app/src/lib/verdict";
import { getAnneeScolaireActive } from "@/app/api/_utils/scolarite";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = Stat["repartition"];

type MatiereInfo = { coef: number; qualificatif: "Fondamentale" | "Facultative" };

const isStatType = (v: unknown): v is StatType => v === "Stat1" || v === "Stat2" || v === "Stat3";
// AJOUTER ce helper
const isValidNoteDef = (n: number) => Number.isFinite(n) && n >= 0;

const isRepartition = (v: unknown): v is Repartition =>
  v === "Trimestre1" || v === "Trimestre2" || v === "Trimestre3" || v === "Semestre1" || v === "Semestre2";

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return NaN;
};
const isFiniteNumber = (v: unknown) => Number.isFinite(toNumber(v));

const calculateObservation = (moyenne: number | null): StatObservation => {
  if (moyenne === null) return "Très insuffisant";
  if (moyenne < 8) return "Très insuffisant";
  if (moyenne < 10) return "Insuffisant";
  if (moyenne < 12) return "Passable";
  if (moyenne < 14) return "Assez bien";
  if (moyenne < 17) return "Bien";
  if (moyenne < 19) return "Très bien";
  return "Excellent";
};

const calculateVerdict = (moyenne: number | null): VerdictBulletin => {
  if (moyenne === null) return "Échoué";
  return moyenne >= 10 ? "Admis" : "Échoué";
};

const getNbMatieres = (classe: Classe): number => {
  if (typeof classe.nombre_matiere === "number") return classe.nombre_matiere;
  if (Array.isArray(classe.id_matieres)) return classe.id_matieres.length;
  if (Array.isArray(classe.matieres)) return classe.matieres.length;
  return 0;
};


const loadMatieresInfoById = async (classe: Classe): Promise<Record<string, MatiereInfo>> => {
  const ids = Array.isArray(classe.id_matieres) ? classe.id_matieres : [];
  const entries = await Promise.all(
    ids.map(async (id) => {
      const snap = await db.collection("matieres").doc(id).get();
      if (!snap.exists) return null;

      const m = snap.data() as Partial<Matiere> | undefined;

      // coef live + garde-fou
      const rawCoef = typeof m?.coef === "number" ? m.coef : toNumber(m?.coef);
      const coef = Number.isFinite(rawCoef) && rawCoef > 0 ? rawCoef : 1;

      const qualificatif = m?.qualificatif === "Facultative" ? "Facultative" : "Fondamentale";
      return [id, { coef, qualificatif }] as const;
    })
  );

  const map: Record<string, MatiereInfo> = {};
  for (const e of entries) {
    if (!e) continue;
    map[e[0]] = e[1];
  }
  return map;
};


const computeMoyenneTrimestrielle = (
  statsReady: Stat[],
  matiereInfoById: Record<string, MatiereInfo>
) => {
  let sumFond = 0;
  let sumCoefFond = 0;
  let bonus = 0;

  // évite double comptage d'une même matière pour un élève
  const seenMatiere = new Set<string>();

  for (const st of statsReady) {
    const matiereId = st.id_matiere;
    if (!matiereId || seenMatiere.has(matiereId)) continue;
    seenMatiere.add(matiereId);

    const info = matiereInfoById[matiereId];
    if (!info) continue; // matière non liée à la classe => ignorée

    const coef = info.coef;
    if (!Number.isFinite(coef) || coef <= 0) continue;

    const noteDef = toNumber(st.note_definitive);
    if (!isValidNoteDef(noteDef)) continue; // borne 0..20 obligatoire

    if (info.qualificatif === "Fondamentale") {
       sumFond += noteDef;
        sumCoefFond += coef;
    } else {
      // bonus facultatif (ta règle conservée)
      if (noteDef <= 10) bonus += 0;
      else if (noteDef <= 14) bonus += noteDef - 10;
      else bonus += 5;
    }
  }

  if (sumCoefFond <= 0) return null;
    const moyenne = (sumFond + bonus) / sumCoefFond;
  return parseFloat(moyenne.toFixed(2));
};

const recomputeRanksForClasse = async (params: {
  id_classe: string;
  libelle_stat: StatType;
  repartition: Repartition;
  annee_scolaire: number;
}) => {
  const { id_classe, libelle_stat, repartition, annee_scolaire } = params;
  const useAnnual = repartition === "Trimestre3" || repartition === "Semestre2";

  const snap = await db
    .collection("bulletins")
    .where("id_classe", "==", id_classe)
    .where("annee_scolaire", "==", annee_scolaire)
    .where("libelle_stat", "==", libelle_stat)
    .where("repartition", "==", repartition)
    .get();

  const bulletins = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Bulletin, "id">),
  })) as Bulletin[];

  bulletins.sort((a, b) => {
    const va = useAnnual ? a.moyenne_annuelle : a.moyenne_trimestrielle;
    const vb = useAnnual ? b.moyenne_annuelle : b.moyenne_trimestrielle;

    const na = typeof va === "number" ? va : -Infinity;
    const nb = typeof vb === "number" ? vb : -Infinity;

    if (nb !== na) return nb - na;

    const sa = `${a.eleve_nom} ${a.eleve_prenom}`.toLowerCase();
    const sb = `${b.eleve_nom} ${b.eleve_prenom}`.toLowerCase();
    return sa.localeCompare(sb, "fr");
  });

  let currentRank = 0;
  let lastValue: number | null = null;

  for (let i = 0; i < bulletins.length; i++) {
    const b = bulletins[i];
    const v = useAnnual ? b.moyenne_annuelle : b.moyenne_trimestrielle;
    const value = typeof v === "number" && Number.isFinite(v) ? v : null;
    if (value === null) continue;

    if (lastValue === null || value !== lastValue) {
      currentRank = i + 1;
      lastValue = value;
    }

    await db.collection("bulletins").doc(b.id).update({
      rang: currentRank,
      updatedAt: new Date().toISOString(),
    });
  }
};

const recomputeMoyenneGeneraleClasse = async (params: {
  id_classe: string;
  classe_libelle: string;
  libelle_stat: StatType;
  repartition: Repartition;
  annee_scolaire: number;
}) => {
  const { id_classe, classe_libelle, libelle_stat, repartition, annee_scolaire } = params;

  const inscSnap = await db
    .collection("inscriptions")
    .where("id_classe", "==", id_classe)
    .where("annee_scolaire", "==", annee_scolaire)
    .where("statut", "==", "actif")
    .get();

  const effectif = inscSnap.size;
  if (!effectif) return { ok: false as const, reason: "Aucun élève actif pour cette année" };

  const bSnap = await db
    .collection("bulletins")
    .where("id_classe", "==", id_classe)
    .where("annee_scolaire", "==", annee_scolaire)
    .where("libelle_stat", "==", libelle_stat)
    .where("repartition", "==", repartition)
    .get();

  if (bSnap.size !== effectif) {
    return {
      ok: false as const,
      reason: "Bulletins incomplets",
      details: { effectif, bulletinsCount: bSnap.size },
    };
  }

  const useAnnual = repartition === "Trimestre3" || repartition === "Semestre2";

  const values: number[] = [];

  bSnap.forEach((d) => {
    const b = d.data() as Partial<Bulletin> | undefined;
    const v = useAnnual ? b?.moyenne_annuelle : b?.moyenne_trimestrielle;
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    values.push(v);
  });

  if (values.length !== effectif) {
    return {
      ok: false as const,
      reason: "Certaines moyennes manquent",
      details: { effectif, countAvecMoyenne: values.length },
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const moyenneGenerale = parseFloat((sum / effectif).toFixed(2));
  const moyenneFaible = parseFloat(Math.min(...values).toFixed(2));
  const moyenneForte = parseFloat(Math.max(...values).toFixed(2));

  const now = new Date();
  const nowISO = now.toISOString();
  const docId = `${id_classe}_${libelle_stat}_${repartition}_${annee_scolaire}`;

  await db.collection("moyennes_generales_classes").doc(docId).set(
    {
      id: docId,
      id_classe,
      classe: classe_libelle,
      libelle_stat,
      repartition,
      annee_scolaire,
      moyenneGenerale,
      moyenneFaible,
      moyenneForte,
      nombreEleves: effectif,
      jour: now.getDate(),
      mois: now.getMonth() + 1,
      annee: now.getFullYear(),
      date: nowISO,
      createdAt: nowISO,
      updatedAt: nowISO,
    },
    { merge: true }
  );

  return { ok: true as const, moyenneGenerale, moyenneFaible, moyenneForte, effectif };
};

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { id_classe, libelle_stat, force, repartition: repartitionInput } = (body ?? {}) as {
      id_classe?: string;
      libelle_stat?: unknown;
      repartition?: unknown;
      force?: boolean;
    };

    console.log("CREATE-FOR-CLASS BODY:", {
  id_classe,
  libelle_stat,
  repartitionInput,
  force,
  forceType: typeof force,
});

    if (!id_classe) return NextResponse.json({ error: "id_classe manquant" }, { status: 400 });
    if (!isStatType(libelle_stat)) return NextResponse.json({ error: "libelle_stat invalide" }, { status: 400 });

    if (!isRepartition(repartitionInput)) {
      return NextResponse.json({ error: "repartition invalide/manquant" }, { status: 400 });
    }
    const repartition = repartitionInput;

    const annee_scolaire = await getAnneeScolaireActive();

    const classeSnap = await db.collection("classes").doc(id_classe).get();
    if (!classeSnap.exists) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    const classe = { id: classeSnap.id, ...(classeSnap.data() as Omit<Classe, "id">) } as Classe;

    const classeLibelle = classe.libelle_classe ?? "";

    const nbMatieres = getNbMatieres(classe);
    if (!nbMatieres) return NextResponse.json({ error: "Nombre matières introuvable" }, { status: 400 });

    const matiereInfoById = await loadMatieresInfoById(classe);

    const inscSnap = await db
      .collection("inscriptions")
      .where("id_classe", "==", id_classe)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("statut", "==", "actif")
      .get();

    const eleveIds = inscSnap.docs.map((d) => d.data().eleve_id).filter(Boolean);

    const eleveDocs = await Promise.all(eleveIds.map((id) => db.collection("eleves").doc(id).get()));
    const eleves = eleveDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Eleve, "id">),
      })) as Eleve[];

    if (eleves.length === 0) {
      return NextResponse.json({ error: "Aucun élève actif trouvé pour cette année/classe" }, { status: 404 });
    }

    const statsSnap = await db
      .collection("statistique")
      .where("id_classe", "==", id_classe)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("libelle_stat", "==", libelle_stat)
      .where("repartition", "==", repartition)
      .get();

    const statsAll = statsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Stat, "id">),
    })) as Stat[];

   const byEleve = new Map<string, Stat[]>();
for (const s of statsAll) {
  if (!s.id_eleve) continue;
  if (!s.id_matiere) continue;
  if (!matiereInfoById[s.id_matiere]) continue; // matière de la classe uniquement

  // Readiness: accepte si moyenne_matiere existe (comme avant) OU note_definitive valide
  const hasMoyenne = isFiniteNumber(s.moyenne_matiere);
  const noteDef = toNumber(s.note_definitive);
  const hasValidNote = isValidNoteDef(noteDef);

  if (!hasMoyenne && !hasValidNote) continue;

  const arr = byEleve.get(s.id_eleve) ?? [];
  arr.push(s);
  byEleve.set(s.id_eleve, arr);
}

    const notReady: { id_eleve: string; nom: string; prenom: string; count: number; nbMatieres: number }[] = [];
    const alreadyExists: { id_eleve: string; bulletinId: string }[] = [];
    const created: { id_eleve: string; bulletinId: string; overwritten: boolean }[] = [];

 for (const e of eleves) {
  const rawStats = byEleve.get(e.id) ?? [];

  // dédoublonne par matière + garde uniquement note_definitive valide
  const byMat = new Map<string, Stat>();
  for (const s of rawStats) {
    if (!s.id_matiere) continue;
    const nd = toNumber(s.note_definitive);
    if (!isValidNoteDef(nd)) continue;
    byMat.set(s.id_matiere, s); // garde la dernière occurrence
  }

  const statsReady = Array.from(byMat.values());

  const uniqueMatieres = new Set(statsReady.map((s) => s.id_matiere).filter(Boolean));
  if (uniqueMatieres.size !== nbMatieres) {
    notReady.push({
      id_eleve: e.id,
      nom: e.identite?.nom_individu ?? "",
      prenom: e.identite?.prenom_individu ?? "",
      count: uniqueMatieres.size,
      nbMatieres,
    });
    continue;
  }

  const bulletinId = `${e.id}_${id_classe}_${libelle_stat}_${repartition}_${annee_scolaire}`;
  const bulletinRef = db.collection("bulletins").doc(bulletinId);
  const bulletinSnap = await bulletinRef.get();

  if (bulletinSnap.exists && !force) {
    alreadyExists.push({ id_eleve: e.id, bulletinId });
    continue;
  }

  const moyenne_trimestrielle = computeMoyenneTrimestrielle(statsReady, matiereInfoById);

  console.log("RECOMPUTE ELEVE", {
    eleve: `${e.identite?.nom_individu} ${e.identite?.prenom_individu}`,
    statsCount: statsReady.length,
    moyenne_trimestrielle,
    force,
  });

      const now = new Date();
      const nowISO = now.toISOString();
      const search_nom_prenom = `${e.identite.nom_individu} ${e.identite.prenom_individu}`
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

      const payload: Bulletin = {
        id: bulletinId,
        id_eleve: e.id,
        id_classe,
        libelle_stat,
        repartition,
        annee_scolaire,
        search_nom_prenom,
        eleve_nom: e.identite.nom_individu,
        eleve_prenom: e.identite.prenom_individu,
        classe: e.classe ?? classe.libelle_classe,
        stats: statsReady,
        ...(moyenne_trimestrielle !== null ? { moyenne_trimestrielle } : {}),
        verdict: "Échoué",
        observation: "Très insuffisant",
        jour: now.getDate(),
        mois: now.getMonth() + 1,
        annee: now.getFullYear(),
        date: nowISO,
        publie: false,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      await bulletinRef.set(payload, { merge: false });
      created.push({ id_eleve: e.id, bulletinId, overwritten: bulletinSnap.exists });
    }

    console.log("NOT READY ELEVES:", notReady);

  if (alreadyExists.length > 0 && !force) {
  // ✅ même si on ne recrée pas, on recalcule rangs + MG
  await recomputeRanksForClasse({ id_classe, libelle_stat, repartition, annee_scolaire });

  const mg = await recomputeMoyenneGeneraleClasse({
    id_classe,
    classe_libelle: classeLibelle,
    libelle_stat,
    repartition,
    annee_scolaire,
  });

  if (!mg.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "MG non calculée",
        reason: mg.reason,
        details: "Bulletins incomplets ou moyennes manquantes",
        id_classe,
        libelle_stat,
        repartition,
        annee_scolaire,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    id_classe,
    libelle_stat,
    repartition,
    annee_scolaire,
    nbMatieres,
    totalEleves: eleves.length,
    createdCount: created.length,
    alreadyExistsCount: alreadyExists.length,
    notReadyCount: notReady.length,
    alreadyExists,
    notReady,
    created,
    moyenneGeneraleClasse: mg.moyenneGenerale,
    moyenneFaibleClasse: mg.moyenneFaible,
    moyenneForteClasse: mg.moyenneForte,
    mg,
    message: "Bulletins déjà existants : rangs + moyenne générale/faible/forte recalculés.",
  });
}

    const isFinal = repartition === "Trimestre3" || repartition === "Semestre2";
    if (isFinal) {
      for (const e of eleves) {
        const bulletinId = `${e.id}_${id_classe}_${libelle_stat}_${repartition}_${annee_scolaire}`;
        const bulletinRef = db.collection("bulletins").doc(bulletinId);
        const snap = await bulletinRef.get();
        if (!snap.exists) continue;

        const current = snap.data() as Partial<Bulletin> | undefined;
        let moyenne_annuelle: number | null = null;

        if (repartition === "Trimestre3") {
          const ids = [
            `${e.id}_${id_classe}_Stat1_Trimestre1_${annee_scolaire}`,
            `${e.id}_${id_classe}_Stat2_Trimestre2_${annee_scolaire}`,
            `${e.id}_${id_classe}_Stat3_Trimestre3_${annee_scolaire}`,
          ];
          const snaps = await Promise.all(ids.map((id) => db.collection("bulletins").doc(id).get()));
          const ms = snaps
            .filter((s) => s.exists)
            .map((s) => (s.data() as Partial<Bulletin> | undefined)?.moyenne_trimestrielle)
            .filter((m): m is number => typeof m === "number" && Number.isFinite(m));

          if (ms.length === 3) moyenne_annuelle = parseFloat((ms.reduce((a, b) => a + b, 0) / 3).toFixed(2));
        }

        if (repartition === "Semestre2") {
          const ids = [
            `${e.id}_${id_classe}_Stat1_Semestre1_${annee_scolaire}`,
            `${e.id}_${id_classe}_Stat2_Semestre2_${annee_scolaire}`,
          ];
          const snaps = await Promise.all(ids.map((id) => db.collection("bulletins").doc(id).get()));
          const ms = snaps
            .filter((s) => s.exists)
            .map((s) => (s.data() as Partial<Bulletin> | undefined)?.moyenne_trimestrielle)
            .filter((m): m is number => typeof m === "number" && Number.isFinite(m));

          if (ms.length === 2) moyenne_annuelle = parseFloat((ms.reduce((a, b) => a + b, 0) / 2).toFixed(2));
        }

        const base = moyenne_annuelle;
        const computedVerdict = calculateVerdict(base);
        const verdict = preserveDecisionVerdict(current?.verdict ?? null, computedVerdict);
        const observation = calculateObservation(base);

        await bulletinRef.update({
          ...(moyenne_annuelle !== null ? { moyenne_annuelle } : {}),
          verdict,
          observation,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      const bSnap = await db
        .collection("bulletins")
        .where("id_classe", "==", id_classe)
        .where("annee_scolaire", "==", annee_scolaire)
        .where("libelle_stat", "==", libelle_stat)
        .where("repartition", "==", repartition)
        .get();

      for (const d of bSnap.docs) {
        const b = d.data() as Partial<Bulletin> | undefined;
        const m = typeof b?.moyenne_trimestrielle === "number" ? b.moyenne_trimestrielle : null;

        const computedVerdict = calculateVerdict(m);
        const verdict = preserveDecisionVerdict(b?.verdict ?? null, computedVerdict);
        const observation = calculateObservation(m);

        await db.collection("bulletins").doc(d.id).update({
          verdict,
          observation,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await recomputeRanksForClasse({ id_classe, libelle_stat, repartition, annee_scolaire });

    const mg = await recomputeMoyenneGeneraleClasse({
      id_classe,
      classe_libelle: classeLibelle,
      libelle_stat,
      repartition,
      annee_scolaire,
    });

if (!mg.ok) {
  return NextResponse.json(
    {
      success: false,
      error: "MG non calculée",
      reason: mg.reason,
      details: "Bulletins incomplets ou moyennes manquantes",
      id_classe,
      libelle_stat,
      repartition,
      annee_scolaire,
      mg,
    },
    { status: 409 }
  );
}
    return NextResponse.json({
      success: true,
      id_classe,
      libelle_stat,
      repartition,
      annee_scolaire,
      nbMatieres,
      totalEleves: eleves.length,
      createdCount: created.length,
      alreadyExistsCount: alreadyExists.length,
      notReadyCount: notReady.length,
      alreadyExists,
      notReady,
      created,
    moyenneGeneraleClasse: mg.moyenneGenerale,
    moyenneFaibleClasse: mg.moyenneFaible,
    moyenneForteClasse: mg.moyenneForte,
         mg,
      message: "Création terminée + rangs recalculés + moyenne générale/faible/forte classe recalculées.",
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/Bulletin/create-for-class:", error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}