import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';

interface Note {
  id: string;
  type_evaluation: string;
  valeur: number;
  observation: string;
  rang: number;
  createdAt: string;
  isSpecial?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eleveId = searchParams.get('eleveId');
    const matiereId = searchParams.get('matiereId');
    const anneeScolaire = searchParams.get('annee_scolaire'); // <-- obligatoire

    if (!eleveId || !matiereId || !anneeScolaire) {
      return NextResponse.json(
        { error: 'Paramètres invalides (eleveId, matiereId, annee_scolaire requis)' },
        { status: 400 }
      );
    }

    console.log(`🔍 GET /api/stats/get - eleveId=${eleveId}, matiereId=${matiereId}, annee_scolaire=${anneeScolaire}`);

    const snapshot = await db
      .collection('statistique')
      .where('id_eleve', '==', eleveId)
      .where('id_matiere', '==', matiereId)
      .where('annee_scolaire', '==', Number(anneeScolaire))
      .limit(1)
      .get();

    console.log(`📊 Snapshot docs count:`, snapshot.docs.length);

    if (snapshot.empty) {
      console.log(`❌ Aucun stat trouvé`);
      return NextResponse.json(
        { error: 'Stat non trouvé' },
        { status: 404 }
      );
    }

    const statDoc = snapshot.docs[0];
    const statData = statDoc.data();

    // ✅ LES NOTES SONT DÉJÀ DANS LE STAT
    const notes: Note[] = Array.isArray(statData.notes) ? statData.notes : [];

    const stat = {
      id: statDoc.id,
      ...statData,
      notes,
    };

    console.log('✅ Stat complet avec', notes.length, 'notes');
    return NextResponse.json({ data: stat });
  } catch (error) {
    console.error('❌ Erreur GET stats/get:', error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}