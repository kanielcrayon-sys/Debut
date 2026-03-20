import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { CreateProfesseurInput } from '@/app/src/interface/data';

// 🔵 GET: Récupérer toutes les matières (ACTIVES ET CORBEILLE)
export async function GET(req: NextRequest) {
  try {
    console.log('📖 Récupération de tous les professeurs...');
    
    const snapshot = await db.collection('professeurs').get();
    const professeurs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log(`✅ ${professeurs.length} professeur(s) trouvé(s)`);
    return NextResponse.json(professeurs);
    
  } catch (error) {
    console.error('❌ Erreur GET professeurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des professeurs' },
      { status: 500 }
    );
  }
}

// 🟢 POST: Créer un professeur (avec vérification nom/prenom)
export async function POST(req: NextRequest) {
  try {
    const data: CreateProfesseurInput = await req.json();
    console.log('📝 Création professeur:', JSON.stringify(data, null, 2));
    
    // ✅ VALIDATION: Contact obligatoire
    if (!data.identite.contact) {
      console.log('❌ Contact manquant');
      return NextResponse.json(
        { error: 'Le contact est obligatoire (*)' },
        { status: 400 }
      );
    }

    // ✅ VÉRIFIER SI UN PROF AVEC MÊME NOM/PRENOM EXISTE (AVERTISSEMENT, PAS BLOCAGE)
    const existingSnapshot = await db.collection('professeurs')
      .where('identite.nom_individu', '==', data.identite.nom_individu)
      .where('identite.prenom_individu', '==', data.identite.prenom_individu)
      .get();
    
    if (!existingSnapshot.empty) {
      console.warn(
        `⚠️ WARNING: Un professeur avec le nom "${data.identite.nom_individu}" et le prénom "${data.identite.prenom_individu}" existe déjà`
      );
      // ✅ NE PAS BLOQUER - Continuer la création (peut avoir même nom/prenom)
    }
    
    const docRef = await db.collection('professeurs').add({
      ...data,
      poste: data.poste || 'Enseignant', // ✅ Default: Enseignant
      is_titulaire: data.is_titulaire || false,
      statut_enseignant: 'actif', // ✅ SOFT DELETE
      createdAt: new Date(),
    });
    
    const newProfesseur = {
      id: docRef.id,
      ...data,
      poste: data.poste || 'Enseignant',
      is_titulaire: data.is_titulaire || false,
      statut_enseignant: 'actif',
    };
    
    console.log('✅ Professeur créé');
    return NextResponse.json(newProfesseur, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erreur POST professeur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du professeur', details: String(error) },
      { status: 500 }
    );
  }
}