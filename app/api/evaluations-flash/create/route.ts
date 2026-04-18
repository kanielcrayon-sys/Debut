import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/src/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { classeId, matiereId, eleves } = await req.json();

    console.log(`📊 Création Éval Flash - Classe: ${classeId}, Matière: ${matiereId}`);

    // ✅ FETCH INFOS
    const [classeDoc, matiereDoc] = await Promise.all([
      db.collection('classes').doc(classeId).get(),
      db.collection('matieres').doc(matiereId).get(),
    ]);

    const classeData = classeDoc.data();
    const matiereData = matiereDoc.data();

    const now = new Date();
    const baseEvalData = {
      id_classe: classeId,
      id_matiere: matiereId,
      id_enseignant: matiereData?.id_enseignant || null,
      classe: classeData?.libelle_classe,
      matiere: matiereData?.libelle_matiere,
      enseignant: matiereData?.enseignant || "Non assigné",
      coef: matiereData?.coef || 1,
      jour: now.getDate(),
      mois: now.getMonth() + 1,
      annee: now.getFullYear(),
      date: now.toISOString().split('T')[0],
      note: null,
      stat_lie: null,
      type_note: null,
      cloture: false,
      createdAt: now.toISOString(),
    };

    const evalIdsByEleve: { [key: string]: string } = {};
    const batch = db.batch();

    // ✅ CRÉER LES ÉVAL FLASH EN BATCH
    for (const eleveId of eleves) {
      const evalRef = db.collection('evaluation_flash').doc();
      const evalData = {
        ...baseEvalData,
        id_eleve: eleveId,
      };

      batch.set(evalRef, evalData);
      evalIdsByEleve[eleveId] = evalRef.id; // ✅ MAP chaque élève à son ID
    }

    await batch.commit();
    console.log(`✅ ${Object.keys(evalIdsByEleve).length} éval flash créées en batch`);

    // ✅ METTRE À JOUR LES ÉLÈVES AVEC SON PROPRE ID
    const updatePromises = eleves.map(async (eleveId: string) => {
      const eleveRef = db.collection('eleves').doc(eleveId);
      const eleveDoc = await eleveRef.get();
      const eleveData = eleveDoc.data();

      return eleveRef.update({
        evaluation_flash: [...(eleveData?.evaluation_flash || []), evalIdsByEleve[eleveId]], // ✅ SON ID UNIQUEMENT
      });
    });

    await Promise.all(updatePromises);
    console.log(`✅ ${eleves.length} élèves mis à jour`);

    return NextResponse.json({
      success: true,
      message: `${Object.keys(evalIdsByEleve).length} éval flash créée(s)`,
      evalCreated: Object.values(evalIdsByEleve),
    });
  } catch (error) {
    console.error('❌ Erreur POST evaluation-flash/create:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création des éval flash', details: String(error) },
      { status: 500 }
    );
  }
}