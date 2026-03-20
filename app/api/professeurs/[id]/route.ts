import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';
import { UpdateProfesseurInput, Professeur } from '@/app/src/interface/data';

// 🔵 GET: Récupérer un professeur par ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`📖 Récupération du professeur: ${id}`);
    
    const doc = await db.collection('professeurs').doc(id).get();
    
    if (!doc.exists) {
      console.log('❌ Professeur non trouvé');
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      );
    }
    
    const professeur = {
      id: doc.id,
      ...doc.data(),
    };
    
    console.log('✅ Professeur récupéré');
    return NextResponse.json(professeur);
    
  } catch (error) {
    console.error('❌ Erreur GET professeur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du professeur', details: String(error) },
      { status: 500 }
    );
  }
}

// 🟡 PUT: Mettre à jour un professeur
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data: UpdateProfesseurInput = await req.json();
    console.log(`📝 Mise à jour du professeur: ${id}`);
    console.log(`📝 ID_MATIERE reçu:`, data.id_matiere);
    console.log(`📝 MATIERES reçu:`, data.matieres);
    console.log(`📝 STATUT reçu:`, data.statut_enseignant);
    
    // ✅ VALIDATION: Si contact fourni, doit pas être vide
    if (data.identite && data.identite.contact === '') {
      console.log('❌ Contact vide');
      return NextResponse.json(
        { error: 'Le contact est obligatoire (*)' },
        { status: 400 }
      );
    }
    
    // ✅ VÉRIFIER SI LE PROF EXISTE
    const docRef = db.collection('professeurs').doc(id);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      console.log('❌ Professeur non trouvé');
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      );
    }

    const oldProfData = docSnapshot.data() as Professeur | undefined;
    
    // ✅ CONSTRUIRE LES DONNÉES À UPDATER
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // ✅ SI IDENTITE EST FOURNIE, NE PAS L'IMBRIQER - SPREAD LES CHAMPS
    if (data.identite) {
      updateData.identite = {
        ...oldProfData?.identite,
        ...data.identite,
      };
    }

    // ✅ AJOUTER LES AUTRES CHAMPS
    if (data.id_matiere !== undefined) {
      console.log(`✅ Mise à jour id_matiere:`, data.id_matiere);
      updateData.id_matiere = data.id_matiere;
    }
    
    // ✅ IMPORTANT: SAUVEGARDER LES NOMS DES MATIÈRES!
    if (data.matieres !== undefined) {
      console.log(`✅ Mise à jour matieres:`, data.matieres);
      updateData.matieres = data.matieres;
    }
    
    if (data.id_classe !== undefined) updateData.id_classe = data.id_classe;
    if (data.date_embauche !== undefined) updateData.date_embauche = data.date_embauche;
    if (data.diplome_enseignant !== undefined) updateData.diplome_enseignant = data.diplome_enseignant;
    if (data.personnage_a_contacter !== undefined) updateData.personnage_a_contacter = data.personnage_a_contacter;
    if (data.contact_personne_a_contacter !== undefined) updateData.contact_personne_a_contacter = data.contact_personne_a_contacter;
    if (data.salaire !== undefined) updateData.salaire = data.salaire;
    if (data.poste !== undefined) updateData.poste = data.poste;
    if (data.is_titulaire !== undefined) updateData.is_titulaire = data.is_titulaire;
    
    // ✅ STATUT ENSEIGNANT
    const oldStatut = oldProfData?.statut_enseignant;
    if (data.statut_enseignant !== undefined) {
      console.log(`🔄 Changement statut: ${oldStatut} → ${data.statut_enseignant}`);
      updateData.statut_enseignant = data.statut_enseignant;
    }
    
    // ✅ DATE SUPPRESSION (vider ou remplir)
    if (data.date_suppression !== undefined) {
      if (data.date_suppression === '' || data.date_suppression === null) {
        console.log('🗑️ Suppression de la date de suppression');
        updateData.date_suppression = null;
      } else {
        console.log(`📅 Date suppression: ${data.date_suppression}`);
        updateData.date_suppression = data.date_suppression;
      }
    }

    console.log('📦 Data à updater dans la DB:', JSON.stringify(updateData, null, 2));

    // ✅ METTRE À JOUR LE PROFESSEUR
    await docRef.update(updateData);
    console.log('✅ Professeur document updaté');

    // ✅ SI LE STATUT PASSE À "ABANDONNÉ" → DÉSAFFECTER DES CLASSES
    if (data.statut_enseignant === "abandonné" && oldStatut !== "abandonné") {
      console.log(`🔴 Professeur ${id} abandonnée - Désaffectation des classes...`);
      
      const classesSnapshot = await db.collection('classes')
        .where('id_titulaire', '==', id)
        .get();
      
      const batch = db.batch();
      classesSnapshot.docs.forEach(doc => {
        console.log(`🗑️ Désaffectation prof de classe: ${doc.id}`);
        batch.update(doc.ref, {
          id_titulaire: "",
          titulaire_classe: "",
        });
      });
      
      if (classesSnapshot.docs.length > 0) {
        await batch.commit();
        console.log(`✅ ${classesSnapshot.docs.length} classe(s) désaffectée(s)`);
      }
    }

    // ✅ SI LE STATUT PASSE À "ACTIF" → NE PAS RÉAFFECTER (l'admin doit le faire manuellement)
    if (data.statut_enseignant === "actif" && oldStatut === "abandonné") {
      console.log(`🟢 Professeur ${id} restaurée - L'admin doit réassigner manuellement`);
    }

    // ✅ SI LES MATIÈRES ONT CHANGÉ, UPDATER LES MATIERES AUSSI
    if (data.id_matiere !== undefined && Array.isArray(data.id_matiere)) {
      console.log(`📚 Affectation matières au prof ${id}...`);
      
      // ✅ RÉCUPÉRER TOUTES LES MATIÈRES
      const matieresSnapshot = await db.collection('matieres').get();
      const batch = db.batch();

      matieresSnapshot.docs.forEach(doc => {
        const matiere = doc.data();
        const matiereRef = doc.ref;

        if (data.id_matiere!.includes(doc.id)) {
          // ✅ ASSIGNER CETTE MATIÈRE AU PROF
          console.log(`✅ Assignation matière ${doc.id} au prof ${id}`);
          batch.update(matiereRef, {
            id_enseignant: id,
            enseignant: `${oldProfData?.identite.prenom_individu} ${oldProfData?.identite.nom_individu}`,
          });
        } else if (matiere.id_enseignant === id) {
          // ✅ DÉSASSIGNER CETTE MATIÈRE (elle était assignée mais ne l'est plus)
          console.log(`🗑️ Désassignation matière ${doc.id} du prof ${id}`);
          batch.update(matiereRef, {
            id_enseignant: null,
            enseignant: null,
          });
        }
      });

      await batch.commit();
      console.log('✅ Matières affectées');
    }
    
    const updatedDoc = await docRef.get();
    const updatedProfesseur = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Professeur;
    
    console.log('✅ Professeur mis à jour - Matieres finales:', updatedProfesseur.matieres);
    return NextResponse.json(updatedProfesseur);
    
  } catch (error) {
    console.error('❌ Erreur PUT professeur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du professeur', details: String(error) },
      { status: 500 }
    );
  }
}

// 🔴 DELETE: Supprimer définitivement un professeur (suppression physique)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🗑️ Suppression définitive du professeur: ${id}`);
    
    // ✅ VÉRIFIER SI LE PROF EXISTE
    const docRef = db.collection('professeurs').doc(id);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      console.log('❌ Professeur non trouvé');
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      );
    }

    const profData = docSnapshot.data() as Professeur | undefined;
    
    // ✅ ÉTAPE 1: DÉSAFFECTER DE TOUTES LES CLASSES OÙ C'EST LE TITULAIRE
    console.log(`📚 D��saffectation des classes du prof ${id}...`);
    const classesSnapshot = await db.collection('classes')
      .where('id_titulaire', '==', id)
      .get();
    
    const batch1 = db.batch();
    classesSnapshot.docs.forEach(doc => {
      console.log(`🗑️ Désaffectation prof de classe: ${doc.id}`);
      batch1.update(doc.ref, {
        id_titulaire: "",
        titulaire_classe: "",
      });
    });
    
    if (classesSnapshot.docs.length > 0) {
      await batch1.commit();
      console.log(`✅ ${classesSnapshot.docs.length} classe(s) désaffectée(s)`);
    }

    // ✅ ÉTAPE 2: DÉSASSIGNER TOUTES LES MATIÈRES
    console.log(`📚 Désassignation des matières du prof ${id}...`);
    const matieresSnapshot = await db.collection('matieres')
      .where('id_enseignant', '==', id)
      .get();
    
    const batch2 = db.batch();
    matieresSnapshot.docs.forEach(doc => {
      console.log(`🗑️ Désassignation matière: ${doc.id}`);
      batch2.update(doc.ref, {
        id_enseignant: null,
        enseignant: null,
      });
    });
    
    if (matieresSnapshot.docs.length > 0) {
      await batch2.commit();
      console.log('✅ Matières désassignées');
    }
    
    // ✅ ÉTAPE 3: SUPPRIMER DÉFINITIVEMENT LE PROF
    await docRef.delete();
    console.log('✅ Professeur document supprimé');
    
    console.log('✅ Professeur supprimé définitivement avec synchronisation');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erreur DELETE professeur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du professeur', details: String(error) },
      { status: 500 }
    );
  }
}