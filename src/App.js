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
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'ejecutivo',
    empresaId: '',
    activo: true
  });

  const roles = [
    { value: 'administrador', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
    { value: 'gerente', label: 'Gerente', color: 'bg-blue-100 text-blue-800' },
    { value: 'ejecutivo', label: 'Ejecutivo', color: 'bg-green-100 text-green-800' },
    { value: 'invitado', label: 'Invitado', color: 'bg-gray-100 text-gray-800' }
  ];

  // Cargar usuarios y empresas desde Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar usuarios
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData = usuariosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);

      // Cargar empresas para el dropdown
      const empresasSnapshot = await getDocs(collection(db, 'empresas'));
      const empresasData = empresasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar usuario existente
        const usuarioRef = doc(db, 'usuarios', editingId);
        await updateDoc(usuarioRef, formData);
      } else {
        // Crear nuevo usuario
        await addDoc(collection(db, 'usuarios'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando usuario:', error);
    }
  };

  const handleEdit = (usuario) => {
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      empresaId: usuario.empresaId || '',
      activo: usuario.activo
    });
    setEditingId(usuario.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'usuarios', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando usuario:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      rol: 'ejecutivo',
      empresaId: '',
      activo: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getEmpresaNombre = (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.nombre : 'Sin asignar';
  };

  const getRolData = (rolValue) => {
    return roles.find(r => r.value === rolValue) || roles[2];
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Usuarios y Roles</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                <label className="block text-lg font-medium text-gray-700 mb-2">Rol *</label>
                <select
                  required
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  {roles.map(rol => (
                    <option key={rol.value} value={rol.value}>{rol.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Empresa Asignada</label>
                <select
                  value={formData.empresaId}
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin asignar</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-lg font-medium text-gray-700">Usuario Activo</label>
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

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Lista de Usuarios</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay usuarios registrados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primer usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Teléfono</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Rol</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Empresa</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => {
                  const rolData = getRolData(usuario.rol);
                  return (
                    <tr key={usuario.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-lg text-gray-900 font-medium">{usuario.nombre}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{usuario.email}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{usuario.telefono || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${rolData.color}`}>
                          {rolData.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getEmpresaNombre(usuario.empresaId)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          usuario.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Módulo Clientes
function ClientesModule() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    empresaId: '',
    email: '',
    telefono: '',
    cargo: '',
    industria: '',
    ubicacion: '',
    etiquetas: '',
    notas: '',
    activo: true
  });

  const industrias = ['Tecnología', 'Retail', 'Manufactura', 'Servicios', 'Construcción', 'Educación', 'Salud', 'Otro'];

  // Cargar clientes y empresas desde Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar clientes
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const clientesData = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(clientesData);

      // Cargar empresas para el dropdown
      const empresasSnapshot = await getDocs(collection(db, 'empresas'));
      const empresasData = empresasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        etiquetas: formData.etiquetas ? formData.etiquetas.split(',').map(t => t.trim()) : []
      };

      if (editingId) {
        // Actualizar cliente existente
        const clienteRef = doc(db, 'clientes', editingId);
        await updateDoc(clienteRef, dataToSave);
      } else {
        // Crear nuevo cliente
        await addDoc(collection(db, 'clientes'), {
          ...dataToSave,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando cliente:', error);
    }
  };

  const handleEdit = (cliente) => {
    setFormData({
      nombre: cliente.nombre,
      empresaId: cliente.empresaId || '',
      email: cliente.email,
      telefono: cliente.telefono,
      cargo: cliente.cargo,
      industria: cliente.industria,
      ubicacion: cliente.ubicacion,
      etiquetas: Array.isArray(cliente.etiquetas) ? cliente.etiquetas.join(', ') : '',
      notas: cliente.notas,
      activo: cliente.activo
    });
    setEditingId(cliente.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await deleteDoc(doc(db, 'clientes', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      empresaId: '',
      email: '',
      telefono: '',
      cargo: '',
      industria: '',
      ubicacion: '',
      etiquetas: '',
      notas: '',
      activo: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getEmpresaNombre = (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.nombre : 'Sin empresa';
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Clientes</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Cliente'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Empresa Asignada</label>
                <select
                  value={formData.empresaId}
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                <label className="block text-lg font-medium text-gray-700 mb-2">Cargo</label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Industria</label>
                <select
                  value={formData.industria}
                  onChange={(e) => setFormData({...formData, industria: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Seleccionar industria</option>
                  {industrias.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Ubicación</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  placeholder="Ciudad, País"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={formData.etiquetas}
                  onChange={(e) => setFormData({...formData, etiquetas: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  placeholder="VIP, Prospecto, Frecuente"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  rows="3"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-lg font-medium text-gray-700">Cliente Activo</label>
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

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Lista de Clientes</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay clientes registrados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primer cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Cargo</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Industria</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Empresa</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Etiquetas</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => (
                  <tr key={cliente.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-lg text-gray-900 font-medium">{cliente.nombre}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.email}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.cargo || '-'}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.industria || '-'}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{getEmpresaNombre(cliente.empresaId)}</td>
                    <td className="px-6 py-4">
                      {Array.isArray(cliente.etiquetas) && cliente.etiquetas.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {cliente.etiquetas.map((etiqueta, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {etiqueta}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        cliente.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
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

// Módulo Interacciones
function InteraccionesModule() {
  const [interacciones, setInteracciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'llamada',
    clienteId: '',
    usuarioId: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    duracion: '',
    notas: '',
    seguimiento: '',
    completado: false
  });

  const tiposInteraccion = [
    { value: 'llamada', label: 'Llamada', icon: '📞', color: 'bg-blue-100 text-blue-800' },
    { value: 'email', label: 'Email', icon: '📧', color: 'bg-purple-100 text-purple-800' },
    { value: 'reunion', label: 'Reunión', icon: '🤝', color: 'bg-green-100 text-green-800' },
    { value: 'mensaje', label: 'Mensaje', icon: '💬', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'otro', label: 'Otro', icon: '📝', color: 'bg-gray-100 text-gray-800' }
  ];

  // Cargar datos desde Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar interacciones
      const interaccionesSnapshot = await getDocs(collection(db, 'interacciones'));
      const interaccionesData = interaccionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInteracciones(interaccionesData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

      // Cargar clientes
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const clientesData = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(clientesData);

      // Cargar usuarios
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData = usuariosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar interacción existente
        const interaccionRef = doc(db, 'interacciones', editingId);
        await updateDoc(interaccionRef, formData);
      } else {
        // Crear nueva interacción
        await addDoc(collection(db, 'interacciones'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando interacción:', error);
    }
  };

  const handleEdit = (interaccion) => {
    setFormData({
      tipo: interaccion.tipo,
      clienteId: interaccion.clienteId || '',
      usuarioId: interaccion.usuarioId || '',
      fecha: interaccion.fecha,
      hora: interaccion.hora || '',
      duracion: interaccion.duracion || '',
      notas: interaccion.notas,
      seguimiento: interaccion.seguimiento || '',
      completado: interaccion.completado
    });
    setEditingId(interaccion.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta interacción?')) {
      try {
        await deleteDoc(doc(db, 'interacciones', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando interacción:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'llamada',
      clienteId: '',
      usuarioId: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '',
      duracion: '',
      notas: '',
      seguimiento: '',
      completado: false
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Sin cliente';
  };

  const getUsuarioNombre = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nombre : 'Sin usuario';
  };

  const getTipoData = (tipoValue) => {
    return tiposInteraccion.find(t => t.value === tipoValue) || tiposInteraccion[0];
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Interacciones</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nueva Interacción'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Interacción' : 'Nueva Interacción'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Tipo de Interacción *</label>
                <select
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  {tiposInteraccion.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.icon} {tipo.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Cliente *</label>
                <select
                  required
                  value={formData.clienteId}
                  onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Usuario Responsable</label>
                <select
                  value={formData.usuarioId}
                  onChange={(e) => setFormData({...formData, usuarioId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Fecha *</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Hora</label>
                <input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({...formData, hora: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Duración (minutos)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.duracion}
                  onChange={(e) => setFormData({...formData, duracion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Notas / Descripción</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  rows="4"
                  placeholder="Detalles de la interacción..."
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Fecha de Seguimiento</label>
                <input
                  type="date"
                  value={formData.seguimiento}
                  onChange={(e) => setFormData({...formData, seguimiento: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.completado}
                  onChange={(e) => setFormData({...formData, completado: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-lg font-medium text-gray-700">Interacción Completada</label>
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

      {/* Lista de Interacciones */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Historial de Interacciones</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando interacciones...</p>
          </div>
        ) : interacciones.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay interacciones registradas</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primera interacción
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Tipo</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Usuario</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Duración</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Notas</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {interacciones.map(interaccion => {
                  const tipoData = getTipoData(interaccion.tipo);
                  return (
                    <tr key={interaccion.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tipoData.color}`}>
                          {tipoData.icon} {tipoData.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-900 font-medium">{getClienteNombre(interaccion.clienteId)}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getUsuarioNombre(interaccion.usuarioId)}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {new Date(interaccion.fecha).toLocaleDateString('es-MX')}
                        {interaccion.hora && ` ${interaccion.hora}`}
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {interaccion.duracion ? `${interaccion.duracion} min` : '-'}
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {interaccion.notas ? (
                          <div className="max-w-xs truncate">{interaccion.notas}</div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          interaccion.completado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {interaccion.completado ? 'Completada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(interaccion)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(interaccion.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Módulo Tareas
function TareasModule() {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    estado: 'pendiente',
    usuarioId: '',
    clienteId: '',
    proyectoId: '',
    fechaVencimiento: '',
  });

  const prioridades = [
    { value: 'alta', label: 'Alta', color: 'bg-red-100 text-red-800' },
    { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'baja', label: 'Baja', color: 'bg-green-100 text-green-800' }
  ];

  const estados = [
    { value: 'pendiente', label: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_progreso', label: 'En Progreso', color: 'bg-blue-100 text-blue-800' },
    { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-800' }
  ];

  // Cargar datos desde Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar tareas
      const tareasSnapshot = await getDocs(collection(db, 'tareas'));
      const tareasData = tareasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTareas(tareasData.sort((a, b) => new Date(a.fechaVencimiento || '9999-12-31') - new Date(b.fechaVencimiento || '9999-12-31')));

      // Cargar usuarios
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData = usuariosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);

      // Cargar clientes
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const clientesData = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(clientesData);

      // Cargar proyectos
      const proyectosSnapshot = await getDocs(collection(db, 'proyectos'));
      const proyectosData = proyectosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProyectos(proyectosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar tarea existente
        const tareaRef = doc(db, 'tareas', editingId);
        await updateDoc(tareaRef, formData);
      } else {
        // Crear nueva tarea
        await addDoc(collection(db, 'tareas'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando tarea:', error);
    }
  };

  const handleEdit = (tarea) => {
    setFormData({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      prioridad: tarea.prioridad,
      estado: tarea.estado,
      usuarioId: tarea.usuarioId || '',
      clienteId: tarea.clienteId || '',
      proyectoId: tarea.proyectoId || '',
      fechaVencimiento: tarea.fechaVencimiento || '',
    });
    setEditingId(tarea.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      try {
        await deleteDoc(doc(db, 'tareas', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando tarea:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      estado: 'pendiente',
      usuarioId: '',
      clienteId: '',
      proyectoId: '',
      fechaVencimiento: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getUsuarioNombre = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nombre : 'Sin asignar';
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : '-';
  };

  const getProyectoNombre = (proyectoId) => {
    const proyecto = proyectos.find(p => p.id === proyectoId);
    return proyecto ? proyecto.nombre : '-';
  };

  const getPrioridadData = (prioridadValue) => {
    return prioridades.find(p => p.value === prioridadValue) || prioridades[1];
  };

  const getEstadoData = (estadoValue) => {
    return estados.find(e => e.value === estadoValue) || estados[0];
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Tareas</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nueva Tarea'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Tarea' : 'Nueva Tarea'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  rows="4"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Prioridad *</label>
                <select
                  required
                  value={formData.prioridad}
                  onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  {prioridades.map(prioridad => (
                    <option key={prioridad.value} value={prioridad.value}>{prioridad.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Estado *</label>
                <select
                  required
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  {estados.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Usuario Asignado</label>
                <select
                  value={formData.usuarioId}
                  onChange={(e) => setFormData({...formData, usuarioId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) => setFormData({...formData, fechaVencimiento: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Cliente Relacionado</label>
                <select
                  value={formData.clienteId}
                  onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Proyecto Relacionado</label>
                <select
                  value={formData.proyectoId}
                  onChange={(e) => setFormData({...formData, proyectoId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin proyecto</option>
                  {proyectos.map(proyecto => (
                    <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>
                  ))}
                </select>
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

      {/* Lista de Tareas */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Lista de Tareas</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando tareas...</p>
          </div>
        ) : tareas.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay tareas registradas</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primera tarea
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Título</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Usuario</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Prioridad</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Vencimiento</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Proyecto</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tareas.map(tarea => {
                  const prioridadData = getPrioridadData(tarea.prioridad);
                  const estadoData = getEstadoData(tarea.estado);
                  return (
                    <tr key={tarea.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-lg text-gray-900 font-medium">{tarea.titulo}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getUsuarioNombre(tarea.usuarioId)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${prioridadData.color}`}>
                          {prioridadData.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estadoData.color}`}>
                          {estadoData.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento).toLocaleDateString('es-MX') : '-'}
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getClienteNombre(tarea.clienteId)}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getProyectoNombre(tarea.proyectoId)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(tarea)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(tarea.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Módulo Proyectos
function ProyectosModule() {
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    clienteId: '',
    empresaId: '',
    fechaInicio: '',
    fechaFin: '',
    presupuesto: '',
    estado: 'planificacion',
    progreso: 0
  });

  const estados = [
    { value: 'planificacion', label: 'Planificación', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_curso', label: 'En Curso', color: 'bg-blue-100 text-blue-800' },
    { value: 'pausado', label: 'Pausado', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-800' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
  ];

  // Cargar datos desde Firestore
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar proyectos
      const proyectosSnapshot = await getDocs(collection(db, 'proyectos'));
      const proyectosData = proyectosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProyectos(proyectosData.sort((a, b) => new Date(b.fechaInicio || '1970-01-01') - new Date(a.fechaInicio || '1970-01-01')));

      // Cargar clientes
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const clientesData = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(clientesData);

      // Cargar empresas
      const empresasSnapshot = await getDocs(collection(db, 'empresas'));
      const empresasData = empresasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar proyecto existente
        const proyectoRef = doc(db, 'proyectos', editingId);
        await updateDoc(proyectoRef, formData);
      } else {
        // Crear nuevo proyecto
        await addDoc(collection(db, 'proyectos'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando proyecto:', error);
    }
  };

  const handleEdit = (proyecto) => {
    setFormData({
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      clienteId: proyecto.clienteId || '',
      empresaId: proyecto.empresaId || '',
      fechaInicio: proyecto.fechaInicio || '',
      fechaFin: proyecto.fechaFin || '',
      presupuesto: proyecto.presupuesto || '',
      estado: proyecto.estado,
      progreso: proyecto.progreso || 0
    });
    setEditingId(proyecto.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este proyecto?')) {
      try {
        await deleteDoc(doc(db, 'proyectos', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando proyecto:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      clienteId: '',
      empresaId: '',
      fechaInicio: '',
      fechaFin: '',
      presupuesto: '',
      estado: 'planificacion',
      progreso: 0
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Sin cliente';
  };

  const getEmpresaNombre = (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.nombre : 'Sin empresa';
  };

  const getEstadoData = (estadoValue) => {
    return estados.find(e => e.value === estadoValue) || estados[0];
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Proyectos</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Proyecto'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre del Proyecto *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  rows="4"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Cliente</label>
                <select
                  value={formData.clienteId}
                  onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Empresa</label>
                <select
                  value={formData.empresaId}
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Fecha de Inicio</label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Fecha de Fin</label>
                <input
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({...formData, fechaFin: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Presupuesto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.presupuesto}
                  onChange={(e) => setFormData({...formData, presupuesto: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Estado *</label>
                <select
                  required
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  {estados.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Progreso (%): {formData.progreso}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progreso}
                  onChange={(e) => setFormData({...formData, progreso: parseInt(e.target.value)})}
                  className="w-full"
                />
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

      {/* Lista de Proyectos */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Lista de Proyectos</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            <p className="text-gray-600 mt-4">Cargando proyectos...</p>
          </div>
        ) : proyectos.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay proyectos registrados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
            >
              Crear primer proyecto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Empresa</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Inicio</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Fin</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Progreso</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map(proyecto => {
                  const estadoData = getEstadoData(proyecto.estado);
                  return (
                    <tr key={proyecto.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-lg text-gray-900 font-medium">{proyecto.nombre}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getClienteNombre(proyecto.clienteId)}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">{getEmpresaNombre(proyecto.empresaId)}</td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString('es-MX') : '-'}
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        {proyecto.fechaFin ? new Date(proyecto.fechaFin).toLocaleDateString('es-MX') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estadoData.color}`}>
                          {estadoData.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${proyecto.progreso || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{proyecto.progreso || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(proyecto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(proyecto.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
