import React, { useState, useEffect } from 'react';
import { Building2, Users, LogIn, Settings, UserCircle, Phone, ClipboardList, Briefcase, TrendingUp, BarChart3, Bell, Plug, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'empresas', name: 'Empresas', icon: Building2 },
    { id: 'usuarios', name: 'Usuarios', icon: Users },
    { id: 'clientes', name: 'Clientes', icon: UserCircle },
    { id: 'interacciones', name: 'Interacciones', icon: Phone },
    { id: 'tareas', name: 'Tareas', icon: ClipboardList },
    { id: 'proyectos', name: 'Proyectos', icon: Briefcase },
    { id: 'oportunidades', name: 'Oportunidades', icon: TrendingUp },
    { id: 'reportes', name: 'Reportes', icon: BarChart3 },
    { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
    { id: 'integraciones', name: 'Integraciones', icon: Plug },
    { id: 'config', name: 'Configuración', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-2xl text-gray-600">Cargando datos desde Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100">
      <div className="w-80 flex-shrink-0 bg-white shadow-lg border-r-4 border-orange-500">
        <div className="py-6 px-4 border-b-2 border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black text-black">GRX</span>
            <div className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-5xl">
              CRM
            </div>
          </div>
        </div>
        <nav className="p-6">
          {modules.map(module => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setCurrentModule(module.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg mb-3 transition-all ${
                  currentModule === module.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'text-gray-900 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Icon size={56} />
                <span className="text-2xl font-medium">{module.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-gray-100 pl-5">
        <div className="max-w-[1600px] pr-10 py-10 box-border">
          {currentModule === 'dashboard' && (
            <DashboardModule />
          )}
          {currentModule === 'empresas' && (
            <EmpresasModule />
          )}
          {currentModule === 'usuarios' && (
            <UsuariosModule />
          )}
          {currentModule === 'clientes' && (
            <ClientesModule />
          )}
          {currentModule === 'interacciones' && (
            <InteraccionesModule />
          )}
          {currentModule === 'tareas' && (
            <TareasModule />
          )}
          {currentModule === 'proyectos' && (
            <ProyectosModule />
          )}
          {currentModule === 'oportunidades' && (
            <OportunidadesModule />
          )}
          {currentModule === 'reportes' && (
            <ReportesModule />
          )}
          {currentModule === 'notificaciones' && (
            <NotificacionesModule />
          )}
          {currentModule === 'integraciones' && (
            <IntegracionesModule />
          )}
          {currentModule === 'config' && (
            <ConfigModule />
          )}
        </div>
      </div>
    </div>
  );
}

// Módulo Dashboard
function DashboardModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Dashboard</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Bienvenido a GRX-CRM</h3>
        <p className="text-gray-700 text-lg mb-4">Sistema CRM multi-empresa, multi-usuario y multi-proyectos</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2 text-xl">✅ FASE 1 - MVP</h4>
            <p className="text-blue-700">Empresas + Usuarios/Roles + Auth</p>
          </div>
          <div className="p-6 bg-slate-100 rounded-lg border-2 border-slate-300">
            <h4 className="font-semibold text-slate-700 mb-2 text-xl">📞 FASE 2</h4>
            <p className="text-slate-600">Clientes + Interacciones</p>
          </div>
          <div className="p-6 bg-slate-100 rounded-lg border-2 border-slate-300">
            <h4 className="font-semibold text-slate-700 mb-2 text-xl">📌 FASE 3</h4>
            <p className="text-slate-600">Tareas + Proyectos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Módulo Empresas
function EmpresasModule() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    rfc: '',
    direccion: '',
    telefono: '',
    email: '',
    sitioWeb: '',
    activa: true
  });

  // Cargar empresas desde Firestore
  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'empresas'));
      const empresasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Error cargando empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar empresa existente
        const empresaRef = doc(db, 'empresas', editingId);
        await updateDoc(empresaRef, formData);
      } else {
        // Crear nueva empresa
        await addDoc(collection(db, 'empresas'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadEmpresas();
    } catch (error) {
      console.error('Error guardando empresa:', error);
    }
  };

  const handleEdit = (empresa) => {
    setFormData({
      nombre: empresa.nombre,
      rfc: empresa.rfc,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      email: empresa.email,
      sitioWeb: empresa.sitioWeb,
      activa: empresa.activa
    });
    setEditingId(empresa.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta empresa?')) {
      try {
        await deleteDoc(doc(db, 'empresas', id));
        loadEmpresas();
      } catch (error) {
        console.error('Error eliminando empresa:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      rfc: '',
      direccion: '',
      telefono: '',
      email: '',
      sitioWeb: '',
      activa: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Empresas</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nueva Empresa'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Empresa' : 'Nueva Empresa'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">RFC</label>
                <input
                  type="text"
                  value={formData.rfc}
                  onChange={(e) => setFormData({...formData, rfc: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Sitio Web</label>
                <input
                  type="url"
                  value={formData.sitioWeb}
                  onChange={(e) => setFormData({...formData, sitioWeb: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({...formData, activa: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-lg font-medium text-gray-700">Empresa Activa</label>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                <Save size={24} />
                <span className="text-xl">{editingId ? 'Actualizar' : 'Guardar'}</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 bg-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-all"
              >
                <X size={24} />
                <span className="text-xl">Cancelar</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Empresas */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Lista de Empresas</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando empresas...</p>
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay empresas registradas</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primera empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">RFC</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Teléfono</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(empresa => (
                  <tr key={empresa.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-lg text-gray-900 font-medium">{empresa.nombre}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{empresa.rfc || '-'}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{empresa.telefono || '-'}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{empresa.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        empresa.activa
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {empresa.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(empresa)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(empresa.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Módulo Usuarios
function UsuariosModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Usuarios y Roles</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Gestión de Usuarios</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 1</p>
      </div>
    </div>
  );
}

// Módulo Clientes
function ClientesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Clientes</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Gestión de Clientes</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 2</p>
      </div>
    </div>
  );
}

// Módulo Interacciones
function InteraccionesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Interacciones</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Historial de Interacciones</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 2</p>
      </div>
    </div>
  );
}

// Módulo Tareas
function TareasModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Tareas</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Gestión de Tareas</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 3</p>
      </div>
    </div>
  );
}

// Módulo Proyectos
function ProyectosModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Proyectos</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Gestión de Proyectos</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 3</p>
      </div>
    </div>
  );
}

// Módulo Oportunidades
function OportunidadesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Oportunidades de Venta</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Pipeline de Ventas</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 4</p>
      </div>
    </div>
  );
}

// Módulo Reportes
function ReportesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Reportes y Analítica</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Dashboard de Reportes</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 5</p>
      </div>
    </div>
  );
}

// Módulo Notificaciones
function NotificacionesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Notificaciones</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Centro de Notificaciones</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 6</p>
      </div>
    </div>
  );
}

// Módulo Integraciones
function IntegracionesModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Integraciones</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Integraciones y API</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 7</p>
      </div>
    </div>
  );
}

// Módulo Configuración
function ConfigModule() {
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Configuración</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Configuración del Sistema</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 1</p>
      </div>
    </div>
  );
}
