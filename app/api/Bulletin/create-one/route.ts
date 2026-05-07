import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/src/lib/firebase-admin";
import type { Bulletin, Classe, Eleve, Matiere, Stat, StatObservation, VerdictBulletin } from "@/app/src/interface/data";
import { preserveDecisionVerdict } from "@/app/src/lib/verdict";
import { getAnneeScolaireActive } from "@/app/api/_utils/scolarite";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = Stat["repartition"];

type MatiereInfo = { coef: number; qualificatif: "Fondamentale" | "Facultative" };

const isStatType = (v: unknown): v is StatType => v === "Stat1" || v === "Stat2" || v === "Stat3";

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
      const coef = typeof m?.coef === "number" ? m.coef : 1;
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

const computeMoyenneTrimestrielle = (statsReady: Stat[], matiereInfoById: Record<string, MatiereInfo>) => {
  let sumFond = 0;
  let sumCoefFond = 0;
  let bonus = 0;

  for (const st of statsReady) {
    const info = matiereInfoById[st.id_matiere];
    if (!info) continue;

    const noteDef = toNumber(st.note_definitive);
    if (!Number.isFinite(noteDef)) continue;

    if (info.qualificatif === "Fondamentale") {
      // ✅ pondéré par coef (cohérent avec create-for-class)
      sumFond += noteDef * info.coef;
      sumCoefFond += info.coef;
    } else {
      if (noteDef <= 10) bonus += 0;
      else if (noteDef <= 14) bonus += noteDef - 10;
      else bonus += 5;
    }
  }

  if (sumCoefFond <= 0) return null;
  return parseFloat(((sumFond + bonus) / sumCoefFond).toFixed(2));
};

const computeMoyenneAnnuelleIfFinal = async (params: {
  id_eleve: string;
  id_classe: string;
  repartition: Repartition;
  annee_scolaire: number;
}): Promise<number | null> => {
  const { id_eleve, id_classe, repartition, annee_scolaire } = params;

  if (repartition === "Trimestre3") {
    const ids = [
      `${id_eleve}_${id_classe}_Stat1_Trimestre1_${annee_scolaire}`,
      `${id_eleve}_${id_classe}_Stat2_Trimestre2_${annee_scolaire}`,
      `${id_eleve}_${id_classe}_Stat3_Trimestre3_${annee_scolaire}`,
    ];

    const snaps = await Promise.all(ids.map((id) => db.collection("bulletins").doc(id).get()));
    const moyennes = snaps
      .filter((s) => s.exists)
      .map((s) => (s.data() as Partial<Bulletin> | undefined)?.moyenne_trimestrielle)
      .filter((m): m is number => typeof m === "number" && Number.isFinite(m));

    if (moyennes.length !== 3) return null;
    return parseFloat((moyennes.reduce((a, b) => a + b, 0) / 3).toFixed(2));
  }

  if (repartition === "Semestre2") {
    const ids = [
      `${id_eleve}_${id_classe}_Stat1_Semestre1_${annee_scolaire}`,
      `${id_eleve}_${id_classe}_Stat2_Semestre2_${annee_scolaire}`,
    ];

    const snaps = await Promise.all(ids.map((id) => db.collection("bulletins").doc(id).get()));
    const moyennes = snaps
      .filter((s) => s.exists)
      .map((s) => (s.data() as Partial<Bulletin> | undefined)?.moyenne_trimestrielle)
      .filter((m): m is number => typeof m === "number" && Number.isFinite(m));

    if (moyennes.length !== 2) return null;
    return parseFloat((moyennes.reduce((a, b) => a + b, 0) / 2).toFixed(2));
  }

  return null;
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

  const elevesSnap = await db
    .collection("eleves")
    .where("id_classe", "==", id_classe)
    .where("statut_eleve", "==", "actif")
    .get();

  const effectif = elevesSnap.size;
  if (!effectif) return { ok: false as const, reason: "Aucun élève actif" };

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

  let sum = 0;
  let count = 0;

  bSnap.forEach((d) => {
    const b = d.data() as Partial<Bulletin> | undefined;
    const v = useAnnual ? b?.moyenne_annuelle : b?.moyenne_trimestrielle;
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    sum += v;
    count += 1;
  });

  if (count !== effectif) {
    return {
      ok: false as const,
      reason: "Certaines moyennes manquent",
      details: { effectif, countAvecMoyenne: count },
    };
  }

  const moyenneGenerale = parseFloat((sum / effectif).toFixed(2));
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

  return { ok: true as const, moyenneGenerale, effectif };
};

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { id_eleve, libelle_stat, force, repartition: repartitionInput } = (body ?? {}) as {
      id_eleve?: string;
      libelle_stat?: unknown;
      repartition?: unknown;
      force?: boolean;
    };

    if (!id_eleve) return NextResponse.json({ error: "id_eleve manquant" }, { status: 400 });
    if (!isStatType(libelle_stat)) return NextResponse.json({ error: "libelle_stat invalide" }, { status: 400 });

    if (!isRepartition(repartitionInput)) {
      return NextResponse.json({ error: "repartition invalide/manquant" }, { status: 400 });
    }
    const repartition = repartitionInput as Repartition;

    const annee_scolaire = await getAnneeScolaireActive();

    const eleveSnap = await db.collection("eleves").doc(id_eleve).get();
    if (!eleveSnap.exists) return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });
    const eleve = { id: eleveSnap.id, ...(eleveSnap.data() as Omit<Eleve, "id">) } as Eleve;
    // Patch multi-année : On s'assure que cet élève a une inscription "officielle" dans cette classe ET cette année
    const inscSnap = await db
      .collection("inscriptions")
      .where("eleve_id", "==", id_eleve)
      .where("id_classe", "==", eleve.id_classe)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("statut", "==", "actif")
      .get();

    if (inscSnap.empty) {
      return NextResponse.json(
        { error: "Cet élève n'est pas inscrit dans cette classe pour cette année scolaire." },
        { status: 400 }
      );
    }

    if (!eleve.id_classe) return NextResponse.json({ error: "id_classe manquant sur élève" }, { status: 400 });

    const classeSnap = await db.collection("classes").doc(eleve.id_classe).get();
    if (!classeSnap.exists) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    const classe = { id: classeSnap.id, ...(classeSnap.data() as Omit<Classe, "id">) } as Classe;

    const classeLibelle = classe.libelle_classe ?? "";

    const nbMatieres = getNbMatieres(classe);
    if (!nbMatieres) return NextResponse.json({ error: "Nombre matières introuvable" }, { status: 400 });

    const statsSnap = await db
      .collection("statistique")
      .where("id_eleve", "==", id_eleve)
      .where("id_classe", "==", eleve.id_classe)
      .where("annee_scolaire", "==", annee_scolaire)
      .where("libelle_stat", "==", libelle_stat)
      .where("repartition", "==", repartition)
      .get();

    const statsAll = statsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Stat, "id">),
    })) as Stat[];

    const statsReady = statsAll.filter((s) => isFiniteNumber(s.moyenne_matiere));
    if (statsReady.length !== nbMatieres) {
      return NextResponse.json(
        { error: "Élève pas prêt", details: { nbMatieres, countStatsAvecMoyenne: statsReady.length } },
        { status: 409 }
      );
    }

    const matiereInfoById = await loadMatieresInfoById(classe);

    const moyenne_trimestrielle = computeMoyenneTrimestrielle(statsReady, matiereInfoById);

    const moyenne_annuelle = await computeMoyenneAnnuelleIfFinal({
      id_eleve,
      id_classe: eleve.id_classe,
      repartition,
      annee_scolaire,
    });

    const baseForVerdict =
      repartition === "Trimestre3" || repartition === "Semestre2" ? moyenne_annuelle : moyenne_trimestrielle;

    const observation = calculateObservation(baseForVerdict);
    const computedVerdict = calculateVerdict(baseForVerdict);

    const bulletinId = `${id_eleve}_${eleve.id_classe}_${libelle_stat}_${repartition}_${annee_scolaire}`;
    const bulletinRef = db.collection("bulletins").doc(bulletinId);
    const bulletinSnap = await bulletinRef.get();

    if (bulletinSnap.exists && !force) {
      return NextResponse.json(
        { alreadyExists: true, message: "Bulletin déjà créé. Confirme (force=true) pour recréer." },
        { status: 200 }
      );
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const search_nom_prenom = `${eleve.identite.nom_individu} ${eleve.identite.prenom_individu}`
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

    // ✅ si on réécrit un bulletin final, on préserve "Admis par décision"
    const existing = bulletinSnap.exists ? (bulletinSnap.data() as Partial<Bulletin> | undefined) : null;
    const verdict = preserveDecisionVerdict(existing?.verdict ?? null, computedVerdict);

    const payload: Bulletin = {
      id: bulletinId,
      id_eleve,
      id_classe: eleve.id_classe,
      libelle_stat,
      repartition,
      annee_scolaire,

      eleve_nom: eleve.identite.nom_individu,
      eleve_prenom: eleve.identite.prenom_individu,
      classe: eleve.classe ?? classe.libelle_classe,
      stats: statsReady,
      ...(moyenne_trimestrielle !== null ? { moyenne_trimestrielle } : {}),
      ...(moyenne_annuelle !== null ? { moyenne_annuelle } : {}),
      verdict,
      observation,
      search_nom_prenom,

      jour: now.getDate(),
      mois: now.getMonth() + 1,
      annee: now.getFullYear(),
      date: nowISO,
      publie: false,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    await bulletinRef.set(payload, { merge: false });

    await recomputeRanksForClasse({ id_classe: eleve.id_classe, libelle_stat, repartition, annee_scolaire });

    const mg = await recomputeMoyenneGeneraleClasse({
      id_classe: eleve.id_classe,
      classe_libelle: classeLibelle,
      libelle_stat,
      repartition,
      annee_scolaire,
    });

    return NextResponse.json({
      success: true,
      bulletin: payload,
      repartition,
      annee_scolaire,
      moyenneGeneraleClasse: mg.ok ? mg.moyenneGenerale : null,
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/Bulletin/create-one:", error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}