import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { UpdateEleveInput, Stat } from '@/app/src/interface/data';

import { DocumentSnapshot } from 'firebase-admin/firestore';


// 🔵 GET: Récupérer un élève par ID
// 🔵 GET: Récupérer un élève par ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📖 Récupération de l'élève ${id}...`);
    
    const doc = await db.collection('eleves').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Élève non trouvé' },
        { status: 404 }
      );
    }
    
    const eleveData = doc.data();
    let stats: Stat[] = [];
    console.log('✅ Élève trouvé');
    
    // ✅ CHARGER LES STATS SI L'ÉLÈVE EN A
if (eleveData?.stat && Array.isArray(eleveData.stat)) {
  try {
   const statPromises: Promise<FirebaseFirestore.DocumentSnapshot>[] = [];
    
    for (const stat of eleveData.stat) {
      const statId = typeof stat === 'string' ? stat : stat.id;
      if (statId) {
        statPromises.push(db.collection('statistique').doc(statId).get());
      }
    }
    
    const statDocs = await Promise.all(statPromises);
    stats = statDocs
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Stat[];
    
    console.log(`✅ ${stats.length} Stats chargés`);
  } catch (statError) {
    console.error('❌ Erreur chargement stats:', statError);
    stats = [];
  }
}
    
    return NextResponse.json({
      id: doc.id,
      ...eleveData,
      stat: stats,
    });
    
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

// 🟡 PUT: Mettre à jour un élève
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📝 Mise à jour de l'élève ${id}...`);
    
    const data = await req.json();
    console.log('📥 Données reçues:', data);
    
    // Vérifier que l'élève existe
    const doc = await db.collection('eleves').doc(id).get();
    if (!doc.exists) {
      console.log('❌ Élève non trouvé');
      return NextResponse.json(
        { error: 'Élève non trouvé' },
        { status: 404 }
      );
    }
    
    const eleveAncienneClasse = doc.data()?.id_classe;
    const eleveNouvelleClasse = data.id_classe;
    const ancienStatut = doc.data()?.statut_eleve;
    const nouveauStatut = data.statut_eleve;
    
    // ✅ METTRE À JOUR L'ÉLÈVE
    await db.collection('eleves').doc(id).update({
      ...data,
      updatedAt: new Date(),
      
    });
    // ✅ METTRE À JOUR L’INSCRIPTION SI CHANGEMENT DE CLASSE
if (eleveAncienneClasse !== eleveNouvelleClasse && data.annee_scolaire) {
  console.log(`🔄 Mise à jour id_classe pour l'inscription de ${id} année ${data.annee_scolaire}`);
  
  // On cherche la bonne inscription sur eleve + année scolaire
  const inscQuery = await db.collection('inscriptions')
    .where('eleve_id', '==', id)
    .where('annee_scolaire', '==', data.annee_scolaire)
    .get();

  if (!inscQuery.empty) {
    const inscRef = inscQuery.docs[0].ref;
    await inscRef.update({ id_classe: eleveNouvelleClasse });
    console.log(`✅ Inscription mise à jour pour l'élève ${id} (id_classe=${eleveNouvelleClasse})`);
  } else {
    console.log(`❌ Aucune inscription trouvée pour l'élève ${id} en année ${data.annee_scolaire}`);
  }
}
    
    console.log('✅ Élève mis à jour');
    
    // ✅ METTRE À JOUR LA CLASSE SI CHANGEMENT DE CLASSE
    if (eleveAncienneClasse !== eleveNouvelleClasse) {
      console.log(`🔄 Classe changée: ${eleveAncienneClasse} → ${eleveNouvelleClasse}`);
      
      // Diminuer nombre_eleve de l'ancienne classe
      if (eleveAncienneClasse) {
        const ancienneClasseDoc = await db.collection('classes').doc(eleveAncienneClasse).get();
        if (ancienneClasseDoc.exists) {
          const currentCount = ancienneClasseDoc.data()?.nombre_eleve || 1;
          await db.collection('classes').doc(eleveAncienneClasse).update({
            nombre_eleve: Math.max(0, currentCount - 1),
          });
          console.log(`📉 Nombre d'élèves réduit dans ${eleveAncienneClasse}`);
        }
      }
      
      // Augmenter nombre_eleve de la nouvelle classe
      if (eleveNouvelleClasse) {
        const nouvelleClasseDoc = await db.collection('classes').doc(eleveNouvelleClasse).get();
        if (nouvelleClasseDoc.exists) {
          const currentCount = nouvelleClasseDoc.data()?.nombre_eleve || 0;
          await db.collection('classes').doc(eleveNouvelleClasse).update({
            nombre_eleve: currentCount + 1,
          });
          console.log(`📈 Nombre d'élèves augmenté dans ${eleveNouvelleClasse}`);
        }
      }
    }
    
    // ✅ METTRE À JOUR nombre_abandons SI CHANGEMENT DE STATUT
    if (ancienStatut !== nouveauStatut && eleveNouvelleClasse) {
      console.log(`🔄 Statut changé: ${ancienStatut} → ${nouveauStatut}`);
      
      const classeDoc = await db.collection('classes').doc(eleveNouvelleClasse).get();
      if (classeDoc.exists) {
        let nombreAbandons = classeDoc.data()?.nombre_abandons || 0;
        
        // Si ancien statut = abandonné et nouveau ≠ abandonné → augmenter
        if (ancienStatut === 'abandonné' && nouveauStatut !== 'abandonné') {
          nombreAbandons = Math.max(0, nombreAbandons - 1);
          console.log(`📉 Nombre d'abandons réduit`);
        }
        // Si ancien statut ≠ abandonné et nouveau = abandonné → diminuer
        else if (ancienStatut !== 'abandonné' && nouveauStatut === 'abandonné') {
          nombreAbandons += 1;
          console.log(`📈 Nombre d'abandons augmenté`);
        }
        
        await db.collection('classes').doc(eleveNouvelleClasse).update({
          nombre_abandons: nombreAbandons,
        });
      }
    }
    
    return NextResponse.json({
      id: id,
      ...data,
      updatedAt: new Date(),
    });
    
  } catch (error) {
    console.error('❌ Erreur PUT:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'élève' },
      { status: 500 }
    );
  }
}

// 🔴 DELETE: Supprimer un élève
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🗑️ Suppression de l'élève ${id}...`);
    
    // ✅ RÉCUPÈRE LES DONNÉES AVANT DE SUPPRIMER
    const doc = await db.collection('eleves').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Élève non trouvé' },
        { status: 404 }
      );
    }
    
    const eleveData = doc.data();
    const idClasse = eleveData?.id_classe;
    const statutEleve = eleveData?.statut_eleve;
    
    // Supprimer le document
    await db.collection('eleves').doc(id).delete();
    
    console.log('✅ Élève supprimé');
    
    // ✅ METTRE À JOUR LA CLASSE
    if (idClasse) {
      const classeDoc = await db.collection('classes').doc(idClasse).get();
      if (classeDoc.exists) {
        const currentCount = classeDoc.data()?.nombre_eleve || 1;
        let nombreAbandons = classeDoc.data()?.nombre_abandons || 0;
        
        // Diminuer nombre_eleve
        const newCount = Math.max(0, currentCount - 1);
        
        // Si c'était un élève abandonné, diminuer aussi nombre_abandons
        if (statutEleve === 'abandonné') {
          nombreAbandons = Math.max(0, nombreAbandons - 1);
        }
        
        await db.collection('classes').doc(idClasse).update({
          nombre_eleve: newCount,
          nombre_abandons: nombreAbandons,
        });
        
        console.log(`📉 Classe mise à jour: nombre_eleve=${newCount}, nombre_abandons=${nombreAbandons}`);
      }
    }
    
    return NextResponse.json({
      id: id,
      ...eleveData,
    });
    
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'élève' },
      { status: 500 }
    );
  }
}