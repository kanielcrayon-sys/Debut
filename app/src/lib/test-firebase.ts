import { db } from './firebase-admin';

export async function testFirebase() {
  try {
    // Ajouter un document de test
    const docRef = await db.collection('test').add({
      message: 'Hello Firebase!',
      timestamp: new Date(),
    });
    
    console.log('✅ Document créé avec ID:', docRef.id);
    
    // Récupérer le document
    const doc = await docRef.get();
    console.log('✅ Document récupéré:', doc.data());
    
    // Supprimer le document de test
    await docRef.delete();
    console.log('✅ Document supprimé');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}