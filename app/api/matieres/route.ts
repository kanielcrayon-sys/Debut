import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { CreateMatiereInput } from '@/app/src/interface/data';

// 🔵 GET: Récupérer toutes les matières (ACTIVES ET CORBEILLE)
export async function GET(req: NextRequest) {
  try {
    console.log('📖 Récupération de toutes les matières...');
    
    const snapshot = await db.collection('matieres').get();
    const matieres = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log(`✅ ${matieres.length} matière(s) trouvée(s)`);
    return NextResponse.json(matieres);
    
  } catch (error) {
    console.error('❌ Erreur GET matieres:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des matières' },
      { status: 500 }
    );
  }
}

// 🟢 POST: Créer une matière (avec vérification de doublon)
export async function POST(req: NextRequest) {
  try {
    const data: CreateMatiereInput = await req.json();
    console.log('📝 Création matière:', JSON.stringify(data, null, 2));
    
    // ✅ VÉRIFIER SI LA MATIÈRE EXISTE DÉJÀ (ACTIF OU CORBEILLE)
    const existingSnapshot = await db.collection('matieres')
      .where('libelle_matiere', '==', data.libelle_matiere)
      .get();
    
    if (!existingSnapshot.empty) {
      console.log('❌ Matière existe déjà');
      return NextResponse.json(
        { error: `Une matière avec le libellé "${data.libelle_matiere}" existe déjà. Veuillez changer le libellé.` },
        { status: 409 } // Conflict
      );
    }
    
    const docRef = await db.collection('matieres').add({
      ...data,
      statut_matiere: 'actif', // ✅ AJOUTE STATUT
      qualificatif: data.qualificatif || 'Fondamentale', // ✅ DÉFAUT
      createdAt: new Date(),
    });
    
    const newMatiere = {
      id: docRef.id,
      ...data,
      statut_matiere: 'actif',
       qualificatif: data.qualificatif || 'Fondamentale', //
    };
    
    console.log('✅ Matière créée');
    return NextResponse.json(newMatiere, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erreur POST matiere:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la matière', details: String(error) },
      { status: 500 }
    );
  }
}