import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { Eleve } from '@/app/src/interface/data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const classeId = searchParams.get('classeId');
    const anneeScolaire = parseInt(searchParams.get('annee_scolaire') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    if (!classeId || !anneeScolaire) {
      return NextResponse.json(
        { error: "classeId et annee_scolaire sont requis" },
        { status: 400 }
      );
    }

    const query = db.collection('inscriptions')
      .where('id_classe', '==', classeId)
      .where('annee_scolaire', '==', anneeScolaire)
      .where('statut', '==', 'actif');

    const inscSnap = await query.get();
    const inscriptions = inscSnap.docs;

    const searchMode = !!search;
    const eleveIdList: string[] = inscriptions.map(d => d.data().eleve_id).filter(Boolean);

    let allEleves: Eleve[] = [];

    if (searchMode) {
      for (let i = 0; i < eleveIdList.length; i += 10) {
        const chunk = eleveIdList.slice(i, i + 10);
        const snap = await db.collection('eleves').where('__name__', 'in', chunk).get();
        snap.forEach((doc) => {
          allEleves.push({ id: doc.id, ...doc.data() } as Eleve);
        });
      }

      const searchLower = search.toLowerCase();
      allEleves = allEleves.filter((e) => {
        const fullName = `${e.identite?.nom_individu ?? ""} ${e.identite?.prenom_individu ?? ""}`.toLowerCase();
        return fullName.includes(searchLower);
      });

      allEleves.sort((a, b) => {
        const nameA = `${a.identite?.nom_individu || ""} ${a.identite?.prenom_individu || ""}`.toLowerCase();
        const nameB = `${b.identite?.nom_individu || ""} ${b.identite?.prenom_individu || ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });

      const totalCount = allEleves.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      const startIdx = (page - 1) * limit;
      const endIdx = Math.min(startIdx + limit, totalCount);
      const pageEleves = allEleves.slice(startIdx, endIdx);

      return NextResponse.json({
        data: pageEleves,
        pagination: {
          currentPage: page,
          totalPages,
          limit,
          totalCount
        },
        stats: {
          boys: pageEleves.filter((e) => e.identite?.sexe === "M").length,
          girls: pageEleves.filter((e) => e.identite?.sexe === "F").length,
          total: totalCount
        },
      });
    }

    const totalCount = eleveIdList.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIdx = (page - 1) * limit;
    const endIdx = Math.min(startIdx + limit, totalCount);
    const pageInscriptionList = eleveIdList.slice(startIdx, endIdx);

    allEleves = [];
    for (let i = 0; i < pageInscriptionList.length; i += 10) {
      const chunk = pageInscriptionList.slice(i, i + 10);
      const snap = await db.collection('eleves').where('__name__', 'in', chunk).get();
      snap.forEach((doc) => {
        allEleves.push({ id: doc.id, ...doc.data() } as Eleve);
      });
    }

    allEleves.sort((a, b) => {
      const nameA = `${a.identite?.nom_individu || ""} ${a.identite?.prenom_individu || ""}`.toLowerCase();
      const nameB = `${b.identite?.nom_individu || ""} ${b.identite?.prenom_individu || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({
      data: allEleves,
      pagination: {
        currentPage: page,
        totalPages,
        limit,
        totalCount
      },
      stats: {
        boys: allEleves.filter((e) => e.identite?.sexe === "M").length,
        girls: allEleves.filter((e) => e.identite?.sexe === "F").length,
        total: totalCount
      },
    });

  } catch (error) {
    console.error('❌ Erreur GET search:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    );
  }
}