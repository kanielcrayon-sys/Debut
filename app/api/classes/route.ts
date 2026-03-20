import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { CreateClasseInput, Professeur } from '@/app/src/interface/data';

// 🔵 GET: Récupérer toutes les classes
export async function GET(req: NextRequest) {
  try {
    console.log('📖 Récupération de toutes les classes...');
    
    const snapshot = await db.collection('classes').get();
    const classes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log(`✅ ${classes.length} classe(s) trouvée(s)`);
    return NextResponse.json(classes);
    
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des classes' },
      { status: 500 }
    );
  }
}

// 🟢 POST: Créer une nouvelle classe
export async function POST(req: NextRequest) {
  try {
    console.log('📝 Création d\'une nouvelle classe...');
    
    const data: CreateClasseInput = await req.json();
    console.log('📥 Données reçues:', JSON.stringify(data, null, 2));
    
    if (!data.libelle_classe || data.scolarite === undefined) {
      return NextResponse.json(
        { error: 'Données manquantes ou invalides' },
        { status: 400 }
      );
    }

    // ✅ RÉCUPÉRER LE NOM DU TITULAIRE SI ID FOURNI
    let titulaire_classe = "";
    if (data.id_titulaire) {
      try {
        const profRef = db.collection('professeurs').doc(data.id_titulaire);
        const profSnap = await profRef.get();
        
        if (profSnap.exists) {
          const profData = profSnap.data() as Professeur;
          titulaire_classe = `${profData.identite.prenom_individu} ${profData.identite.nom_individu}`;
          console.log(`✅ Titulaire trouvé: ${titulaire_classe}`);
        }
      } catch (err) {
        console.warn('⚠️ Erreur récupération titulaire:', err);
      }
    }
    
    const docRef = await db.collection('classes').add({
      libelle_classe: data.libelle_classe,
      id_titulaire: data.id_titulaire || "",
      titulaire_classe: titulaire_classe,
      scolarite: data.scolarite,
      id_matieres: [],
      matieres: [],
      nombre_eleve: 0,
      nombre_enseignant: 0,
      nombre_matiere: 0,
      statut_classe: "actif",
      createdAt: new Date().toISOString(),
    });
    
    const newDoc = await docRef.get();
    
    console.log('✅ Classe créée');
    return NextResponse.json({
      id: newDoc.id,
      ...newDoc.data(),
    });
    
  } catch (error) {
    console.error('❌ Erreur POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la classe' },
      { status: 500 }
    );
  }
}