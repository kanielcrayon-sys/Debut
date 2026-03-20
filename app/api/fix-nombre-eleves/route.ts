import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { Eleve, Classe } from '@/app/src/interface/data';

export async function GET(req: NextRequest) {
  try {
    console.log('🔧 Réparation de nombre_eleve...');
    
    // 1️⃣ Récupérer toutes les classes
    const classesSnapshot = await db.collection('classes').get();
    const classes = classesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as (Classe & { id: string })[];
    
    console.log(`📋 ${classes.length} classes trouvées`);
    
    // 2️⃣ Récupérer TOUS les élèves une seule fois
    const elevesSnapshot = await db.collection('eleves').get();
    const eleves = elevesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as (Eleve & { id: string })[];
    
    console.log(`👥 ${eleves.length} élèves trouvés`);
    
    // 3️⃣ Pour chaque classe, compter les élèves
    for (const classe of classes) {
      // Compter les élèves actifs de cette classe
      const elevesActifs = eleves.filter(e => 
        e.id_classe === classe.id && e.statut_eleve !== 'abandonné'
      );
      
      // Compter les abandons de cette classe
      const elevesAbandonnes = eleves.filter(e => 
        e.id_classe === classe.id && e.statut_eleve === 'abandonné'
      );
      
      const nombreActifs = elevesActifs.length;
      const nombreAbandons = elevesAbandonnes.length;
      
      console.log(`📊 Classe ${classe.id}: ${nombreActifs} actifs + ${nombreAbandons} abandons`);
      
      // 4️⃣ Mettre à jour la classe
      await db.collection('classes').doc(classe.id).update({
        nombre_eleve: nombreActifs,
        nombre_abandons: nombreAbandons,
      });
      
      console.log(`✅ Classe ${classe.id} mise à jour`);
    }
    
    return NextResponse.json({
      message: 'Correction effectuée',
      classesTraitees: classes.length,
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}