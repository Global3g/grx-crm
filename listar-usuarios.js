const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD4SnDE04w3KrQ6BfN5V13geRqpYX3vwYU",
  authDomain: "crm-grx.firebaseapp.com",
  projectId: "crm-grx",
  storageBucket: "crm-grx.firebasestorage.app",
  messagingSenderId: "811740510101",
  appId: "1:811740510101:web:6b8eb0666de13f0892689c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listarUsuarios() {
  try {
    const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));

    if (usuariosSnapshot.empty) {
      console.log('❌ No hay usuarios registrados en Firestore');
      console.log('\n💡 Puedes crear uno desde la app haciendo clic en "Crear Usuarios de Prueba"');
    } else {
      console.log(`✅ Usuarios encontrados (${usuariosSnapshot.size}):\n`);
      usuariosSnapshot.forEach(doc => {
        const usuario = doc.data();
        console.log(`📧 Email: ${usuario.email}`);
        console.log(`👤 Nombre: ${usuario.nombre}`);
        console.log(`🔑 Password: ${usuario.password || 'admin123'}`);
        console.log(`✅ Activo: ${usuario.activo ? 'Sí' : 'No'}`);
        console.log('---');
      });
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error consultando usuarios:', error);
    process.exit(1);
  }
}

listarUsuarios();
