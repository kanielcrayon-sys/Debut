import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { CreateEvaluationFlashInput } from '@/app/src/interface/data';

// 🔵 GET: Récupérer toutes les évaluations
export async function GET(req: NextRequest) {
  try {
    console.log('📖 Récupération de toutes les évaluations flash...');
    
    const snapshot = await db.collection('evaluation_flash').get();
    const evaluations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log(`✅ ${evaluations.length} évaluation(s) trouvée(s)`);
    return NextResponse.json(evaluations);
    
  } catch (error) {
    console.error('❌ Erreur GET evaluations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des évaluations' },
      { status: 500 }
    );
  }
}

// 🟢 POST: Créer une évaluation
// 🟢 POST: Créer une évaluation
export async function POST(req: NextRequest) {
  try {
    const data: CreateEvaluationFlashInput = await req.json();
    console.log('📝 Création évaluation flash:', JSON.stringify(data, null, 2));
    
    // ✅ RÉCUPÉRER LE COEF DE LA MATIÈRE
    const matiereDoc = await db.collection('matieres').doc(data.id_matiere).get();
    const matiereData = matiereDoc.data();
    const coef = matiereData?.coef || 1;
    
    // ✅ CALCULER MOYENNE UNIQUEMENT SI NOTE EXISTE
    const moyenne_evaluation = data.note ? (data.note * coef) / 20 : null;
    
    const docRef = await db.collection('evaluation_flash').add({
      ...data,
      coef,
      moyenne_evaluation,
      cloture: false,
      createdAt: new Date(),
    });
    
    const newEvaluation = {
      id: docRef.id,
      ...data,
      coef,
      moyenne_evaluation,
      cloture: false,
    };
    
    console.log('✅ Évaluation créée');
    return NextResponse.json(newEvaluation, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erreur POST evaluation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'évaluation', details: String(error) },
      { status: 500 }
    );
  }
}