import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eleveId: string }> }
) {
  try {
    const { eleveId } = await params;
    const matiereId = req.nextUrl.searchParams.get('matiereId');

    console.log('🔍 eleveId:', eleveId);
    console.log('🔍 matiereId:', matiereId);

    if (!matiereId) {
      return NextResponse.json(
        { error: 'matiereId manquant' },
        { status: 400 }
      );
    }

    const snapshot = await db
      .collection('evaluation_flash')
      .where('id_eleve', '==', eleveId)
      .where('id_matiere', '==', matiereId)
      .get();

    const evals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ ${evals.length} évaluations chargées`);

    return NextResponse.json({ evals });
  } catch (error) {
    console.error('❌ Erreur GET evaluation_flash:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des evals' },
      { status: 500 }
    );
  }
}