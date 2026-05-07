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
      // ✅ moyenne pondérée par coef
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
    const { id_classe, libelle_stat, force, repartition: repartitionInput } = (body ?? {}) as {
      id_classe?: string;
      libelle_stat?: unknown;
      repartition?: unknown;
      force?: boolean;
    };

    if (!id_classe) return NextResponse.json({ error: "id_classe manquant" }, { status: 400 });
    if (!isStatType(libelle_stat)) return NextResponse.json({ error: "libelle_stat invalide" }, { status: 400 });

    if (!isRepartition(repartitionInput)) {
      return NextResponse.json({ error: "repartition invalide/manquant" }, { status: 400 });
    }
    const repartition = repartitionInput;

    // ✅ année scolaire active (année de début)
    const annee_scolaire = await getAnneeScolaireActive();

    const classeSnap = await db.collection("classes").doc(id_classe).get();
    if (!classeSnap.exists) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    const classe = { id: classeSnap.id, ...(classeSnap.data() as Omit<Classe, "id">) } as Classe;

    const classeLibelle = classe.libelle_classe ?? "";

    const nbMatieres = getNbMatieres(classe);
    if (!nbMatieres) return NextResponse.json({ error: "Nombre matières introuvable" }, { status: 400 });

    const matiereInfoById = await loadMatieresInfoById(classe);

   // ⬇️ 1. On récupère bien la liste des élèves “officiellement inscrits ET actifs” à la classe et année
      const inscSnap = await db
        .collection("inscriptions")
        .where("id_classe", "==", id_classe)
        .where("annee_scolaire", "==", annee_scolaire)
        .where("statut", "==", "actif")
        .get();

      const eleveIds = inscSnap.docs.map((d) => d.data().eleve_id).filter(Boolean);

      // ⬇️ 2. On récupère leurs profils Eleve
      const eleveDocs = await Promise.all(
        eleveIds.map((id) => db.collection("eleves").doc(id).get())
      );
      const eleves = eleveDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Eleve, "id">),
        })) as Eleve[];

      if (eleves.length === 0) return NextResponse.json({ error: "Aucun élève actif trouvé pour cette année/classe" }, { status: 404 });

    // ✅ stats filtrées par année
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
      if (!isFiniteNumber(s.moyenne_matiere)) continue;
      const arr = byEleve.get(s.id_eleve) ?? [];
      arr.push(s);
      byEleve.set(s.id_eleve, arr);
    }

    const notReady: { id_eleve: string; nom: string; prenom: string; count: number; nbMatieres: number }[] = [];
    const alreadyExists: { id_eleve: string; bulletinId: string }[] = [];
    const created: { id_eleve: string; bulletinId: string; overwritten: boolean }[] = [];

    for (const e of eleves) {
      const statsReady = byEleve.get(e.id) ?? [];
      if (statsReady.length !== nbMatieres) {
        notReady.push({
          id_eleve: e.id,
          nom: e.identite?.nom_individu ?? "",
          prenom: e.identite?.prenom_individu ?? "",
          count: statsReady.length,
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

    if (alreadyExists.length > 0 && !force) {
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
        message: "Des bulletins existent déjà. Confirme (force=true) pour recréer.",
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
      moyenneGeneraleClasse: mg.ok ? mg.moyenneGenerale : null,
      message: "Création terminée + rangs recalculés + moyenne générale classe recalculée.",
    });
  } catch (error) {
    console.error("❌ Erreur POST /api/Bulletin/create-for-class:", error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}` },
      { status: 500 }
    );
  }
}