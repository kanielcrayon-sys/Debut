import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { Eleve, CreateEleveInput } from '@/app/src/interface/data';

// 🔵 GET: Récupérer tous les élèves
export async function GET() {
  try {
    console.log('📖 Récupération des élèves...');
    
    const snapshot = await db.collection('eleves').get();
    
    const eleves: Eleve[] = [];
    snapshot.forEach((doc) => {
      eleves.push({
        id: doc.id,
        ...doc.data(),
      } as Eleve);
    });
    
    console.log(`✅ ${eleves.length} élève(s) trouvé(s)`);
    return NextResponse.json(eleves);
    
  } catch (error) {
    console.error('❌ Erreur GET:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des élèves' },
      { status: 500 }
    );
  }
}

// 🟢 POST: Créer un nouvel élève
export async function POST(req: NextRequest) {
  try {
    console.log('📝 Création d\'un nouvel élève...');
    
    const data: CreateEleveInput = await req.json();
    console.log('📥 Données reçues:', JSON.stringify(data, null, 2));
    
    // ✅ VALIDATION COMPLÈTE - TOUS LES CHAMPS OBLIGATOIRES
    if (!data.identite?.nom_individu) {
      console.error('❌ Nom manquant');
      return NextResponse.json(
        { error: 'Nom obligatoire' },
        { status: 400 }
      );
    }

    if (!data.identite?.prenom_individu) {
      console.error('❌ Prénom manquant');
      return NextResponse.json(
        { error: 'Prénom obligatoire' },
        { status: 400 }
      );
    }

    if (!data.identite?.date_naissance) {
      console.error('❌ Date de naissance manquante');
      return NextResponse.json(
        { error: 'Date de naissance obligatoire' },
        { status: 400 }
      );
    }

    if (!data.identite?.sexe) {
      console.error('❌ Sexe manquant');
      return NextResponse.json(
        { error: 'Sexe obligatoire' },
        { status: 400 }
      );
    }

    if (!data.id_classe) {
      console.error('❌ Classe manquante');
      return NextResponse.json(
        { error: 'Classe obligatoire' },
        { status: 400 }
      );
    }

    if (!data.nom_tuteur) {
      console.error('❌ Nom tuteur manquant');
      return NextResponse.json(
        { error: 'Nom du tuteur obligatoire' },
        { status: 400 }
      );
    }

    if (!data.contact_tuteur) {
      console.error('❌ Contact tuteur manquant');
      return NextResponse.json(
        { error: 'Contact du tuteur obligatoire' },
        { status: 400 }
      );
    }
    
    // ✅ CRÉER LE DOCUMENT AVEC TOUS LES CHAMPS
    const docRef = await db.collection('eleves').add({
      identite: {
        nom_individu: data.identite.nom_individu,
        prenom_individu: data.identite.prenom_individu,
        date_naissance: data.identite.date_naissance,
        sexe: data.identite.sexe,
        ville: data.identite.ville || "",
        nationalite: data.identite.nationalite || "",
        email: data.identite.email || "",
        contact: data.identite.contact || "",
        vehicule: data.identite.vehicule || "",
      },
      id_classe: data.id_classe,
      date_premier_inscription: data.date_premier_inscription || new Date().toISOString().split("T")[0],
      en_regle: data.en_regle || false,
      gbevou: data.gbevou || false,
      statut_eleve: data.statut_eleve || "actif",
      nom_tuteur: data.nom_tuteur,
      profession_tuteur: data.profession_tuteur || "",
      contact_tuteur: data.contact_tuteur,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('✅ Élève créé avec ID:', docRef.id);
    
    // ✅ METTRE À JOUR LA CLASSE (AUGMENTER nombre_eleve)
    console.log(`🔄 Tentative de mise à jour de la classe ${data.id_classe}...`);
    if (data.id_classe) {
      try {
        const classeDoc = await db.collection('classes').doc(data.id_classe).get();
        console.log(`📋 Classe existe? ${classeDoc.exists}`);
        console.log(`📋 Classe ID recherché: "${data.id_classe}"`);
        
        if (classeDoc.exists) {
          const currentCount = classeDoc.data()?.nombre_eleve || 0;
          console.log(`📊 Nombre actuel d'élèves: ${currentCount}`);
          
          await db.collection('classes').doc(data.id_classe).update({
            nombre_eleve: currentCount + 1,
          });
          console.log(`✅ Classe ${data.id_classe} mise à jour: nombre_eleve=${currentCount + 1}`);
        } else {
          console.log(`❌ Classe ${data.id_classe} NOT FOUND dans Firestore!`);
          console.log(`❌ Vérifiez que l'ID de classe est correct`);
        }
      } catch (err) {
        console.error(`❌ Erreur mise à jour classe:`, err);
      }
    }
    
    const newEleve = {
      id: docRef.id,
      identite: {
        nom_individu: data.identite.nom_individu,
        prenom_individu: data.identite.prenom_individu,
        date_naissance: data.identite.date_naissance,
        sexe: data.identite.sexe,
        ville: data.identite.ville || "",
        nationalite: data.identite.nationalite || "",
        email: data.identite.email || "",
        contact: data.identite.contact || "",
        vehicule: data.identite.vehicule || "",
      },
      id_classe: data.id_classe,
      date_premier_inscription: data.date_premier_inscription || new Date().toISOString().split("T")[0],
      en_regle: data.en_regle || false,
      gbevou: data.gbevou || false,
      statut_eleve: data.statut_eleve || "actif",
      nom_tuteur: data.nom_tuteur,
      profession_tuteur: data.profession_tuteur || "",
      contact_tuteur: data.contact_tuteur,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return NextResponse.json(newEleve, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erreur POST:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'élève', details: String(error) },
      { status: 500 }
    );
  }
}