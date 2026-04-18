import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { EvaluationFlash } from '@/app/src/interface/data';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    console.log(`📝 PUT évaluation: ${id}`);
    
    const doc = await db.collection('evaluation_flash').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Évaluation non trouvée' }, { status: 404 });
    }
    
    const existingData = doc.data() as EvaluationFlash;
    
    // Recalculer moyenne_evaluation si note change
    let moyenne_evaluation = existingData.moyenne_evaluation;
    if (data.note !== undefined) {
      const coef = data.coef || existingData.coef;
      moyenne_evaluation = (data.note * coef) / 20;
    }
    
    const updatedData = {
      ...existingData,
      ...data,
      moyenne_evaluation,
      updatedAt: new Date(),
    };
    
    await db.collection('evaluation_flash').doc(id).update(updatedData);
    console.log(`✅ Évaluation ${id} mise à jour`);
    
    return NextResponse.json(updatedData);
    
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🗑️ DELETE évaluation: ${id}`);
    
    const doc = await db.collection('evaluation_flash').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Évaluation non trouvée' }, { status: 404 });
    }
    
    const evaluationData = doc.data() as EvaluationFlash;
    
    await db.collection('evaluation_flash').doc(id).delete();
    console.log(`✅ Évaluation supprimée`);
    
    return NextResponse.json(evaluationData);
    
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}