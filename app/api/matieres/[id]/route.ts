import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { UpdateMatiereInput, Matiere, Professeur } from '@/app/src/interface/data';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📖 GET matière: ${id}`);
    
    const doc = await db.collection('matieres').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Matière non trouvée' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: doc.id,
      ...doc.data(),
    });
    
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json() as UpdateMatiereInput;
    console.log(`📝 PUT matière: ${id}`);
    
    const doc = await db.collection('matieres').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Matière non trouvée' }, { status: 404 });
    }
    
    const existingData = doc.data() as Matiere;
    const oldLibelle = existingData.libelle_matiere;
    const newLibelle = data.libelle_matiere;
    
    // ✅ VÉRIFIER DOUBLON LIBELLÉ
    if (data.libelle_matiere && data.libelle_matiere !== existingData.libelle_matiere) {
      const duplicate = await db.collection('matieres')
        .where('libelle_matiere', '==', data.libelle_matiere)
        .get();
      
      if (!duplicate.empty) {
        return NextResponse.json(
          { error: `Matière "${data.libelle_matiere}" existe déjà` },
          { status: 409 }
        );
      }
    }
    
    // ✅ SI ABANDON: DÉSAFFECTER LE PROF
    const profId = existingData.id_enseignant;
    
    if (data.statut_matiere === "abandonné" && profId) {
      console.log(`🗑️ Désaffectation prof ${profId}`);
      
      data.id_enseignant = null;
      data.enseignant = null;
      
      const profRef = db.collection('professeurs').doc(profId);
      const profSnap = await profRef.get();
      
      if (profSnap.exists) {
        const profData = profSnap.data() as Professeur;
        const newIdMatiere = (profData.id_matiere || []).filter(m => m !== id);
        const newMatieres = (profData.matieres || []).filter(m => m !== oldLibelle);
        
        await profRef.update({
          id_matiere: newIdMatiere,
          matieres: newMatieres,
        });
        
        console.log(`✅ Prof ${profId} mis à jour`);
      }
    }
    
    // ✅ FUSIONNER ET SAUVEGARDER
    const updatedData = {
      ...existingData,
      ...data,
      updatedAt: new Date(),
    };
    
    await db.collection('matieres').doc(id).update(updatedData);
    console.log(`✅ Matière ${id} sauvegardée dans la DB`);
    
    // ✅ SI LE LIBELLÉ A CHANGÉ: METTRE À JOUR TOUS LES PROFS QUI L'ONT
    if (oldLibelle !== newLibelle && newLibelle) {
      console.log(`🔄 Libellé changé: "${oldLibelle}" → "${newLibelle}"`);
      console.log(`🔄 Cherchant tous les profs avec cette matière...`);
      
      // ✅ CHERCHER TOUS LES PROFS
      const professersSnapshot = await db.collection('professeurs').get();
      
      let count = 0;
      const batch = db.batch();
      
      for (const profDoc of professersSnapshot.docs) {
        const profData = profDoc.data() as Professeur;
        
        // ✅ VÉRIFIER SI CE PROF A CETTE MATIÈRE
        if (profData.matieres && profData.matieres.includes(oldLibelle)) {
          count++;
          const updatedMatieres = profData.matieres.map((m) =>
            m === oldLibelle ? newLibelle : m
          );
          
          console.log(`✅ Prof ${profDoc.id} trouvé - Mise à jour`);
          
          batch.update(profDoc.ref, {
            matieres: updatedMatieres,
          });
        }
      }
      
      // ✅ COMMIT TOUS LES UPDATES EN UNE SEULE TRANSACTION
      if (count > 0) {
        await batch.commit();
        console.log(`✅ Total profs mis à jour: ${count}`);
      }
    }
    
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
    console.log(`🗑️ DELETE matière: ${id}`);
    
    const doc = await db.collection('matieres').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Matière non trouvée' }, { status: 404 });
    }
    
    const matiereData = doc.data() as Matiere;
    
    // ✅ DÉSAFFECTER LE PROF SI ASSIGNÉE
    if (matiereData.id_enseignant) {
      console.log(`🗑️ Désaffectation prof ${matiereData.id_enseignant}`);
      
      const profRef = db.collection('professeurs').doc(matiereData.id_enseignant);
      const profSnap = await profRef.get();
      
      if (profSnap.exists) {
        const profData = profSnap.data() as Professeur;
        const newIdMatiere = (profData.id_matiere || []).filter(m => m !== id);
        const newMatieres = (profData.matieres || []).filter(m => m !== matiereData.libelle_matiere);
        
        await profRef.update({
          id_matiere: newIdMatiere,
          matieres: newMatieres,
        });
        
        console.log(`✅ Prof ${matiereData.id_enseignant} mis à jour`);
      }
    }
    
    await db.collection('matieres').doc(id).delete();
    
    return NextResponse.json(matiereData);
    
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}