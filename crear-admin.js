const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

async function crearAdmin() {
  try {
    const usuario = {
      nombre: "Admin GRX",
      email: "admin@grx.com",
      telefono: "+52-555-0001",
      rol: "administrador",
      empresaId: "",
      equipoId: "",
      password: "admin123",
      activo: true,
      fechaCreacion: new Date().toISOString(),
      permisos: {
        empresas: { ver: true, crear: true, editar: true, eliminar: true },
        usuarios: { ver: true, crear: true, editar: true, eliminar: true },
        clientes: { ver: true, crear: true, editar: true, eliminar: true },
        proyectos: { ver: true, crear: true, editar: true, eliminar: true },
        reportes: { ver: true }
      }
    };

    await addDoc(collection(db, 'usuarios'), usuario);
    console.log('✅ Usuario admin creado exitosamente!');
    console.log('\nPuedes iniciar sesión con:');
    console.log('Email: admin@grx.com');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    process.exit(1);
  }
}

crearAdmin();
