import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { Eleve } from '@/app/src/interface/data';

// 🔵 GET: Récupérer les élèves d'une classe avec pagination (pour Notes)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classeId: string }> }
) {
  try {
    const { classeId } = await params;
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log(`📚 Récupération élèves classe ${classeId} (Notes) - Page ${page}, Limite ${limit}`);
    
    // ✅ RÉCUPÉRER TOUS LES ÉLÈVES ACTIFS DE LA CLASSE
    const snapshot = await db
      .collection('eleves')
      .where('id_classe', '==', classeId)
      .where('statut_eleve', '==', 'actif')
      .get();
    
    const allEleves: Eleve[] = [];
    snapshot.forEach((doc) => {
      allEleves.push({
        id: doc.id,
        ...doc.data(),
      } as Eleve);
    });
    
    // ✅ TRIER PAR NOM PUIS PRÉNOM
    allEleves.sort((a, b) => {
      const nameA = `${a.identite.nom_individu} ${a.identite.prenom_individu}`.toLowerCase();
      const nameB = `${b.identite.nom_individu} ${b.identite.prenom_individu}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // ✅ CALCULER LA PAGINATION
    const totalCount = allEleves.length;
    const totalPages = Math.ceil(totalCount / limit) || 1; // ← Min 1 page
    const startIdx = (page - 1) * limit;
    const endIdx = Math.min(startIdx + limit, totalCount);
    
    // ✅ VÉRIFIER QUE LA PAGE EST VALIDE
    if (page < 1 || (totalCount > 0 && page > totalPages)) {
      return NextResponse.json(
        { error: `Page ${page} invalide. Total: ${totalPages} pages` },
        { status: 400 }
      );
    }
    
    const pageEleves = allEleves.slice(startIdx, endIdx);
    
    // ✅ CALCULER LES STATS
    const boys = pageEleves.filter((e) => e.identite.sexe === "M").length;
    const girls = pageEleves.filter((e) => e.identite.sexe === "F").length;
    
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
        boys: boys,
        girls: girls,
        total: totalCount,
      },
    });
    
  } catch (error) {
    console.error('❌ Erreur GET notes/classe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des élèves' },
      { status: 500 }
    );
  }
}