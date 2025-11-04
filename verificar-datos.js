const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD4SnDE04w3KrQ6BfN5V13geRqpYX3vwYU",
  authDomain: "crm-grx.firebaseapp.com",
  projectId: "crm-grx",
  storageBucket: "crm-grx.firebasestorage.app",
  messagingSenderId: "811740510101",
  appId: "1:811740510101:web:4d34dc31058ffcf792689c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verificarDatos() {
  try {
    const colecciones = [
      'usuarios',
      'empresas',
      'clientes',
      'proyectos',
      'oportunidades',
      'interacciones',
      'tareas',
      'productos',
      'notificaciones'
    ];

    console.log('📊 Estado de la base de datos:\n');

    for (const nombreColeccion of colecciones) {
      const snapshot = await getDocs(collection(db, nombreColeccion));
      const count = snapshot.size;
      const emoji = count > 0 ? '✅' : '❌';
      console.log(`${emoji} ${nombreColeccion}: ${count} documentos`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarDatos();
