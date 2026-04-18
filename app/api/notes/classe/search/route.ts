import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { Eleve } from '@/app/src/interface/data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const classeId = searchParams.get('classeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    console.log(`🔍 Recherche élèves classe ${classeId} - Recherche: "${search}"`);
    
    // ✅ REQUÊTE DE BASE
    const query = db
      .collection('eleves')
      .where('id_classe', '==', classeId)
      .where('statut_eleve', '==', 'actif');
    
    // ✅ RÉCUPÉRER TOUS LES RÉSULTATS
    const snapshot = await query.get();
    
    const allEleves: Eleve[] = [];
    snapshot.forEach((doc) => {
      allEleves.push({
        id: doc.id,
        ...doc.data(),
      } as Eleve);
    });
    
    // ✅ FILTRER PAR RECHERCHE (Local pour le moment, Firebase full-text search coûte cher)
    let filteredEleves = allEleves;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEleves = allEleves.filter((e) => {
        const fullName = `${e.identite.nom_individu} ${e.identite.prenom_individu}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    }
    
    // ✅ TRIER PAR NOM PUIS PRÉNOM
    filteredEleves.sort((a, b) => {
      const nameA = `${a.identite.nom_individu} ${a.identite.prenom_individu}`.toLowerCase();
      const nameB = `${b.identite.nom_individu} ${b.identite.prenom_individu}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // ✅ CALCULER LA PAGINATION
    const totalCount = filteredEleves.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIdx = (page - 1) * limit;
    const endIdx = Math.min(startIdx + limit, totalCount);
    
    // ✅ VÉRIFIER QUE LA PAGE EST VALIDE
    if (page < 1 || (totalCount > 0 && page > totalPages)) {
      return NextResponse.json(
        { error: `Page ${page} invalide. Total: ${totalPages} pages` },
        { status: 400 }
      );
    }
    
    const pageEleves = filteredEleves.slice(startIdx, endIdx);
    
    console.log(`✅ ${pageEleves.length} élève(s) retourné(s)`);
    
    return NextResponse.json({
      data: pageEleves,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        totalCount: totalCount,
      },
      stats: {
        boys: pageEleves.filter((e) => e.identite.sexe === "M").length,
        girls: pageEleves.filter((e) => e.identite.sexe === "F").length,
        total: totalCount,
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