import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { UpdateClasseInput, Professeur } from '@/app/src/interface/data';

// 🔵 GET: Récupérer une classe par ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📖 Récupération de la classe ${id}...`);
    
    const doc = await db.collection('classes').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Classe non trouvée' },
        { status: 404 }
      );
    }
    
    console.log('✅ Classe trouvée');
    return NextResponse.json({
      id: doc.id,
      ...doc.data(),
    });
    
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la classe' },
      { status: 500 }
    );
  }
}

// 🟡 PUT: Mettre à jour une classe
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📝 Mise à jour de la classe ${id}...`);
    
    const data: UpdateClasseInput = await req.json();
    console.log('📥 Données reçues:', JSON.stringify(data, null, 2));
    
    // ✅ RÉCUPÈRE D'ABORD LE DOCUMENT EXISTANT
    const doc = await db.collection('classes').doc(id).get();
    if (!doc.exists) {
      console.log('❌ Classe non trouvée');
      return NextResponse.json(
        { error: 'Classe non trouvée' },
        { status: 404 }
      );
    }
    
    const existingData = doc.data();
    
    // ✅ SI LE TITULAIRE CHANGE: METTRE À JOUR LE NOM
    let titulaire_classe = existingData?.titulaire_classe || "";
    if (data.id_titulaire && data.id_titulaire !== existingData?.id_titulaire) {
      console.log(`🔄 Titulaire changé: ${existingData?.id_titulaire} → ${data.id_titulaire}`);
      
      try {
        const profRef = db.collection('professeurs').doc(data.id_titulaire);
        const profSnap = await profRef.get();
        
        if (profSnap.exists) {
          const profData = profSnap.data() as Professeur;
          titulaire_classe = `${profData.identite.prenom_individu} ${profData.identite.nom_individu}`;
          console.log(`✅ Titulaire mis à jour: ${titulaire_classe}`);
        }
      } catch (err) {
        console.warn('⚠️ Erreur récupération titulaire:', err);
      }
    }
    
    // ✅ FUSIONNE AVEC LES DONNÉES EXISTANTES
    const updatedData = {
      ...existingData,
      ...data,
      titulaire_classe: titulaire_classe,
      updatedAt: new Date().toISOString(),
    };

    console.log('📤 Données à enregistrer:', JSON.stringify(updatedData, null, 2));
    
    await db.collection('classes').doc(id).update(updatedData);
    
    console.log('✅ Classe mise à jour');
    return NextResponse.json({
      id: id,
      ...updatedData,
    });
    
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la classe', details: String(error) },
      { status: 500 }
    );
  }
}

// 🔴 DELETE: Supprimer une classe définitivement
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🗑️ Suppression définitive de la classe ${id}...`);
    
    const doc = await db.collection('classes').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Classe non trouvée' },
        { status: 404 }
      );
    }
    
    // Récupère les données complètes
    const classeData = doc.data();
    
    // ✅ SUPPRIMER DÉFINITIVEMENT LE DOCUMENT
    await db.collection('classes').doc(id).delete();
    
    console.log('✅ Classe supprimée définitivement');
    return NextResponse.json({
      id: id,
      ...classeData,
    });
    
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la classe', details: String(error) },
      { status: 500 }
    );
  }
}