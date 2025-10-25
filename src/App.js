import React, { useState, useEffect } from 'react';
import { Building2, Users, LogIn, Settings, UserCircle, Phone, ClipboardList, Briefcase, TrendingUp, BarChart3, Bell, Plug, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      <div className="w-64 flex-shrink-0 bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg border-r-4 border-orange-500">
        <div className="py-8 px-6 border-b-2 border-gray-700">
          <div className="flex flex-col items-center justify-center">
            {/* Logo GRX Holdings */}
            <img
              src="/grx-logo.png"
              alt="GRX Holdings"
              className="h-auto mb-1"
              style={{width: '240px'}}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback si no hay imagen */}
            <div style={{display: 'none'}}>
              <div className="text-5xl font-black tracking-tight text-white mb-2">
                GRX HOLDINGS
              </div>
            </div>
            {/* Badge CRM */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-lg font-bold text-sm tracking-widest shadow-lg">
              CRM SYSTEM
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
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
    pais: 'MX',
    identificadorFiscal: '',
    direccion: '',
    telefono: '',
    email: '',
    sitioWeb: '',
    logo: '',
    activa: true
  });

  const paises = [
    { code: 'MX', name: 'México', flag: '🇲🇽', taxLabel: 'RFC', taxPlaceholder: 'Ej: ABC123456XYZ' },
    { code: 'ES', name: 'España', flag: '🇪🇸', taxLabel: 'CIF/NIF/NIE', taxPlaceholder: 'Ej: B12345678' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', taxLabel: 'EIN', taxPlaceholder: 'Ej: 12-3456789' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', taxLabel: 'NIT', taxPlaceholder: 'Ej: 123456789-0' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', taxLabel: 'CUIT', taxPlaceholder: 'Ej: 20-12345678-9' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', taxLabel: 'RUT', taxPlaceholder: 'Ej: 12.345.678-9' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪', taxLabel: 'RUC', taxPlaceholder: 'Ej: 12345678901' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷', taxLabel: 'CNPJ', taxPlaceholder: 'Ej: 12.345.678/0001-90' },
  ];

  const getPaisInfo = () => {
    return paises.find(p => p.code === formData.pais) || paises[0];
  };

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
    console.log('Guardando empresa...', formData);
    try {
      if (editingId) {
        // Actualizar empresa existente
        const empresaRef = doc(db, 'empresas', editingId);
        await updateDoc(empresaRef, formData);
        console.log('Empresa actualizada');
      } else {
        // Crear nueva empresa
        const docRef = await addDoc(collection(db, 'empresas'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Empresa creada con ID:', docRef.id);
      }
      resetForm();
      loadEmpresas();
      alert('Empresa guardada exitosamente!');
    } catch (error) {
      console.error('Error guardando empresa:', error);
      alert('Error guardando empresa: ' + error.message);
    }
  };

  const handleEdit = (empresa) => {
    setFormData({
      nombre: empresa.nombre,
      pais: empresa.pais || 'MX',
      identificadorFiscal: empresa.identificadorFiscal || empresa.rfc || '',
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      email: empresa.email,
      sitioWeb: empresa.sitioWeb,
      logo: empresa.logo || '',
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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({...formData, logo: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      pais: 'MX',
      identificadorFiscal: '',
      direccion: '',
      telefono: '',
      email: '',
      sitioWeb: '',
      logo: '',
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
              {/* Selector de País */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">País * {getPaisInfo().flag}</label>
                <select
                  required
                  value={formData.pais}
                  onChange={(e) => setFormData({...formData, pais: e.target.value, identificadorFiscal: ''})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                >
                  {paises.map(pais => (
                    <option key={pais.code} value={pais.code}>
                      {pais.flag} {pais.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Acme Corporation"
                />
              </div>

              {/* Identificador Fiscal dinámico */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  {getPaisInfo().taxLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.identificadorFiscal}
                  onChange={(e) => setFormData({...formData, identificadorFiscal: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder={getPaisInfo().taxPlaceholder}
                />
              </div>

              {/* Logo de la Empresa */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Logo de la Empresa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                />
                {formData.logo && (
                  <div className="mt-2">
                    <img src={formData.logo} alt="Logo preview" className="h-16 w-auto object-contain border border-gray-200 rounded p-2" />
                  </div>
                )}
              </div>

              {/* Dirección */}
              <div className="col-span-2">
                <label className="block text-lg font-medium text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="Calle, número, colonia, ciudad"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="+52 123 456 7890"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="contacto@empresa.com"
                />
              </div>

              {/* Sitio Web */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Sitio Web</label>
                <input
                  type="url"
                  value={formData.sitioWeb}
                  onChange={(e) => setFormData({...formData, sitioWeb: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="https://www.empresa.com"
                />
              </div>

              {/* Estado Activa */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({...formData, activa: e.target.checked})}
                  className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                />
                <label className="text-lg font-medium text-gray-700">Empresa Activa</label>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md"
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
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Logo</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Empresa</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">País</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">ID Fiscal</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Contacto</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map(empresa => {
                  const paisInfo = paises.find(p => p.code === (empresa.pais || 'MX')) || paises[0];
                  return (
                    <tr key={empresa.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {empresa.logo ? (
                          <img src={empresa.logo} alt={empresa.nombre} className="h-12 w-12 object-contain" />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-900 font-medium">{empresa.nombre}</td>
                      <td className="px-6 py-4 text-lg">
                        <span className="text-2xl mr-2">{paisInfo.flag}</span>
                        <span className="text-gray-600">{paisInfo.name}</span>
                      </td>
                      <td className="px-6 py-4 text-lg text-gray-600">
                        <div className="text-xs text-gray-500">{paisInfo.taxLabel}</div>
                        <div className="font-mono">{empresa.identificadorFiscal || empresa.rfc || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{empresa.telefono || '-'}</div>
                        <div className="text-xs">{empresa.email || '-'}</div>
                      </td>
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
    console.log('Guardando usuario...', formData);
    try {
      if (editingId) {
        // Actualizar usuario existente
        const usuarioRef = doc(db, 'usuarios', editingId);
        await updateDoc(usuarioRef, formData);
        console.log('Usuario actualizado');
      } else {
        // Crear nuevo usuario
        const docRef = await addDoc(collection(db, 'usuarios'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Usuario creado con ID:', docRef.id);
      }
      resetForm();
      loadData();
      alert('Usuario guardado exitosamente!');
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error guardando usuario: ' + error.message);
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
    console.log('Guardando cliente...', formData);
    try {
      const dataToSave = {
        ...formData,
        etiquetas: formData.etiquetas ? formData.etiquetas.split(',').map(t => t.trim()) : []
      };

      if (editingId) {
        // Actualizar cliente existente
        const clienteRef = doc(db, 'clientes', editingId);
        await updateDoc(clienteRef, dataToSave);
        console.log('Cliente actualizado');
      } else {
        // Crear nuevo cliente
        const docRef = await addDoc(collection(db, 'clientes'), {
          ...dataToSave,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Cliente creado con ID:', docRef.id);
      }
      resetForm();
      loadData();
      alert('Cliente guardado exitosamente!');
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert('Error guardando cliente: ' + error.message);
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
    console.log('Guardando interacción...', formData);
    try {
      if (editingId) {
        // Actualizar interacción existente
        const interaccionRef = doc(db, 'interacciones', editingId);
        await updateDoc(interaccionRef, formData);
        console.log('Interacción actualizada');
      } else {
        // Crear nueva interacción
        const docRef = await addDoc(collection(db, 'interacciones'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Interacción creada con ID:', docRef.id);
      }
      resetForm();
      loadData();
      alert('Interacción guardada exitosamente!');
    } catch (error) {
      console.error('Error guardando interacción:', error);
      alert('Error guardando interacción: ' + error.message);
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
    console.log('Guardando tarea...', formData);
    try {
      if (editingId) {
        // Actualizar tarea existente
        const tareaRef = doc(db, 'tareas', editingId);
        await updateDoc(tareaRef, formData);
        console.log('Tarea actualizada');
      } else {
        // Crear nueva tarea
        const docRef = await addDoc(collection(db, 'tareas'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Tarea creada con ID:', docRef.id);
      }
      resetForm();
      loadData();
      alert('Tarea guardada exitosamente!');
    } catch (error) {
      console.error('Error guardando tarea:', error);
      alert('Error guardando tarea: ' + error.message);
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
    console.log('Guardando proyecto...', formData);
    try {
      if (editingId) {
        // Actualizar proyecto existente
        const proyectoRef = doc(db, 'proyectos', editingId);
        await updateDoc(proyectoRef, formData);
        console.log('Proyecto actualizado');
      } else {
        // Crear nuevo proyecto
        const docRef = await addDoc(collection(db, 'proyectos'), {
          ...formData,
          fechaCreacion: new Date().toISOString()
        });
        console.log('Proyecto creado con ID:', docRef.id);
      }
      resetForm();
      loadData();
      alert('Proyecto guardado exitosamente!');
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      alert('Error guardando proyecto: ' + error.message);
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
  const [oportunidades, setOportunidades] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    clienteId: '',
    empresaId: '',
    usuarioResponsableId: '',
    valor: '',
    probabilidad: 50,
    etapa: 'Contacto Inicial',
    fechaEstimadaCierre: '',
    notas: ''
  });

  const etapas = [
    { value: 'Contacto Inicial', label: 'Contacto Inicial', color: 'bg-blue-100 text-blue-800' },
    { value: 'Propuesta Enviada', label: 'Propuesta Enviada', color: 'bg-purple-100 text-purple-800' },
    { value: 'Negociación', label: 'Negociación', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Cerrado Ganado', label: 'Cerrado Ganado', color: 'bg-green-100 text-green-800' },
    { value: 'Cerrado Perdido', label: 'Cerrado Perdido', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oportunidadesSnap, clientesSnap, empresasSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'empresas')),
        getDocs(collection(db, 'usuarios'))
      ]);

      const oportunidadesList = oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      oportunidadesList.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));

      setOportunidades(oportunidadesList);
      setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setEmpresas(empresasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsuarios(usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Guardando oportunidad...', formData);
    try {
      const dataToSave = {
        ...formData,
        valor: parseFloat(formData.valor) || 0,
        probabilidad: parseInt(formData.probabilidad) || 0,
        fechaCreacion: editingId ? formData.fechaCreacion : new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'oportunidades', editingId), dataToSave);
        console.log('Oportunidad actualizada');
      } else {
        const docRef = await addDoc(collection(db, 'oportunidades'), dataToSave);
        console.log('Oportunidad creada con ID:', docRef.id);
      }

      resetForm();
      loadData();
      alert('Oportunidad guardada exitosamente!');
    } catch (error) {
      console.error("Error saving oportunidad:", error);
      alert('Error guardando oportunidad: ' + error.message);
    }
  };

  const handleEdit = (oportunidad) => {
    setFormData(oportunidad);
    setEditingId(oportunidad.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta oportunidad?')) {
      try {
        await deleteDoc(doc(db, 'oportunidades', id));
        loadData();
      } catch (error) {
        console.error("Error deleting oportunidad:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      clienteId: '',
      empresaId: '',
      usuarioResponsableId: '',
      valor: '',
      probabilidad: 50,
      etapa: 'Contacto Inicial',
      fechaEstimadaCierre: '',
      notas: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getEtapaColor = (etapa) => {
    const found = etapas.find(e => e.value === etapa);
    return found ? found.color : 'bg-gray-100 text-gray-800';
  };

  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'N/A';
  };

  const getEmpresaNombre = (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.nombre : 'N/A';
  };

  const getUsuarioNombre = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nombre : 'N/A';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Oportunidades de Venta</h2>
        <p className="text-blue-100 mt-2">Pipeline de ventas y gestión de oportunidades</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-blue-900">
            {showForm ? (editingId ? 'Editar Oportunidad' : 'Nueva Oportunidad') : 'Pipeline de Ventas'}
          </h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Nueva Oportunidad
            </button>
          )}
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ej: Venta de software ERP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
                <select
                  required
                  value={formData.clienteId}
                  onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                <select
                  value={formData.empresaId}
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsable *</label>
                <select
                  required
                  value={formData.usuarioResponsableId}
                  onChange={(e) => setFormData({...formData, usuarioResponsableId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Estimado (MXN) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Probabilidad de Cierre: {formData.probabilidad}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.probabilidad}
                  onChange={(e) => setFormData({...formData, probabilidad: e.target.value})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Etapa del Pipeline *</label>
                <select
                  required
                  value={formData.etapa}
                  onChange={(e) => setFormData({...formData, etapa: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {etapas.map(etapa => (
                    <option key={etapa.value} value={etapa.value}>{etapa.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Estimada de Cierre</label>
                <input
                  type="date"
                  value={formData.fechaEstimadaCierre}
                  onChange={(e) => setFormData({...formData, fechaEstimadaCierre: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Detalles adicionales sobre la oportunidad..."
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
              >
                {editingId ? 'Actualizar' : 'Guardar'} Oportunidad
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-gray-600">Cargando oportunidades...</p>
          </div>
        ) : oportunidades.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay oportunidades registradas</p>
            <p className="text-gray-500 mt-2">Crea tu primera oportunidad de venta</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oportunidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probabilidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cierre Est.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {oportunidades.map((oportunidad) => (
                  <tr key={oportunidad.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{oportunidad.nombre}</div>
                      {oportunidad.empresaId && (
                        <div className="text-xs text-gray-500">{getEmpresaNombre(oportunidad.empresaId)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{getClienteNombre(oportunidad.clienteId)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{getUsuarioNombre(oportunidad.usuarioResponsableId)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(oportunidad.valor)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${oportunidad.probabilidad || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{oportunidad.probabilidad}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEtapaColor(oportunidad.etapa)}`}>
                        {oportunidad.etapa}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(oportunidad.fechaEstimadaCierre)}</td>
                    <td className="px-6 py-4 text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleEdit(oportunidad)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(oportunidad.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
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

// Módulo Reportes
function ReportesModule() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalOportunidades: 0,
    totalProyectos: 0,
    tareasPendientes: 0,
    valorTotalOportunidades: 0,
    oportunidadesPorEtapa: [],
    proyectosPorEstado: [],
    interaccionesPorTipo: [],
    topOportunidades: []
  });

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [clientesSnap, oportunidadesSnap, proyectosSnap, tareasSnap, interaccionesSnap] = await Promise.all([
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'proyectos')),
        getDocs(collection(db, 'tareas')),
        getDocs(collection(db, 'interacciones'))
      ]);

      const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const oportunidades = oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const proyectos = proyectosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tareas = tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const interacciones = interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calcular métricas
      const totalClientes = clientes.length;
      const totalOportunidades = oportunidades.length;
      const totalProyectos = proyectos.length;
      const tareasPendientes = tareas.filter(t => t.estado !== 'Completada').length;
      const valorTotalOportunidades = oportunidades.reduce((sum, op) => sum + (parseFloat(op.valor) || 0), 0);

      // Oportunidades por etapa
      const etapas = ['Contacto Inicial', 'Propuesta Enviada', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
      const oportunidadesPorEtapa = etapas.map(etapa => ({
        etapa,
        cantidad: oportunidades.filter(op => op.etapa === etapa).length
      }));

      // Proyectos por estado
      const estados = ['Planificación', 'En Curso', 'Pausado', 'Completado', 'Cancelado'];
      const proyectosPorEstado = estados.map(estado => ({
        name: estado,
        value: proyectos.filter(p => p.estado === estado).length
      })).filter(item => item.value > 0);

      // Interacciones por tipo
      const tipos = ['Llamada', 'Email', 'Reunión', 'Mensaje', 'Otro'];
      const interaccionesPorTipo = tipos.map(tipo => ({
        tipo,
        cantidad: interacciones.filter(i => i.tipo === tipo).length
      }));

      // Top 5 oportunidades por valor
      const topOportunidades = [...oportunidades]
        .filter(op => op.etapa !== 'Cerrado Perdido')
        .sort((a, b) => (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0))
        .slice(0, 5);

      setStats({
        totalClientes,
        totalOportunidades,
        totalProyectos,
        tareasPendientes,
        valorTotalOportunidades,
        oportunidadesPorEtapa,
        proyectosPorEstado,
        interaccionesPorTipo,
        topOportunidades
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    }
    setLoading(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#22c55e', '#ef4444'];

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Reportes y Analítica</h2>
        <p className="text-blue-100 mt-2">Dashboard ejecutivo con métricas clave del CRM</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Generando reportes...</p>
        </div>
      ) : (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalClientes}</p>
                </div>
                <UserCircle className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Oportunidades</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalOportunidades}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Proyectos Activos</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalProyectos}</p>
                </div>
                <Briefcase className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tareas Pendientes</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{stats.tareasPendientes}</p>
                </div>
                <ClipboardList className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
            </div>
          </div>

          {/* Valor total de oportunidades */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-8 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-lg font-medium">Valor Total en Pipeline</p>
                <p className="text-5xl font-bold mt-2">{formatCurrency(stats.valorTotalOportunidades)}</p>
                <p className="text-green-100 mt-2">Oportunidades activas en el pipeline de ventas</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-6">
                <TrendingUp className="w-16 h-16" />
              </div>
            </div>
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Oportunidades por etapa */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <h3 className="text-xl font-semibold text-blue-900 mb-6">Oportunidades por Etapa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.oportunidadesPorEtapa}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Proyectos por estado */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <h3 className="text-xl font-semibold text-blue-900 mb-6">Proyectos por Estado</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.proyectosPorEstado}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.proyectosPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Interacciones por tipo */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <h3 className="text-xl font-semibold text-blue-900 mb-6">Interacciones por Tipo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.interaccionesPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Oportunidades */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <h3 className="text-xl font-semibold text-blue-900 mb-6">Top 5 Oportunidades</h3>
              {stats.topOportunidades.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No hay oportunidades activas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.topOportunidades.map((op, index) => (
                    <div key={op.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{op.nombre}</p>
                          <p className="text-sm text-gray-500">{op.etapa}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(op.valor)}</p>
                        <p className="text-sm text-gray-500">{op.probabilidad}% prob.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resumen adicional */}
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
            <h3 className="text-2xl font-semibold text-blue-900 mb-4">Resumen Ejecutivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Tasa de Conversión</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalOportunidades > 0
                    ? Math.round((stats.oportunidadesPorEtapa.find(e => e.etapa === 'Cerrado Ganado')?.cantidad || 0) / stats.totalOportunidades * 100)
                    : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Oportunidades Ganadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.oportunidadesPorEtapa.find(e => e.etapa === 'Cerrado Ganado')?.cantidad || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Promedio por Oportunidad</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalOportunidades > 0
                    ? formatCurrency(stats.valorTotalOportunidades / stats.totalOportunidades)
                    : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Módulo Notificaciones
function NotificacionesModule() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [tareasSnap, interaccionesSnap, oportunidadesSnap, clientesSnap, proyectosSnap] = await Promise.all([
        getDocs(collection(db, 'tareas')),
        getDocs(collection(db, 'interacciones')),
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'proyectos'))
      ]);

      const tareas = tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const interacciones = interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const oportunidades = oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const proyectos = proyectosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const generatedNotifications = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Notificaciones de tareas vencidas
      tareas.forEach(tarea => {
        if (tarea.estado !== 'Completada' && tarea.fechaLimite) {
          const dueDate = new Date(tarea.fechaLimite);
          dueDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            generatedNotifications.push({
              id: `tarea-vencida-${tarea.id}`,
              type: 'error',
              category: 'tareas',
              title: '⚠️ Tarea Vencida',
              message: `"${tarea.titulo}" venció hace ${Math.abs(diffDays)} día(s)`,
              priority: tarea.prioridad,
              timestamp: new Date(),
              read: false
            });
          } else if (diffDays <= 3) {
            generatedNotifications.push({
              id: `tarea-proxima-${tarea.id}`,
              type: 'warning',
              category: 'tareas',
              title: '⏰ Tarea Próxima a Vencer',
              message: `"${tarea.titulo}" vence en ${diffDays} día(s)`,
              priority: tarea.prioridad,
              timestamp: new Date(),
              read: false
            });
          }
        }
      });

      // Notificaciones de interacciones de seguimiento pendientes
      interacciones.forEach(interaccion => {
        if (interaccion.seguimiento && !interaccion.completado) {
          const cliente = clientes.find(c => c.id === interaccion.clienteId);
          generatedNotifications.push({
            id: `seguimiento-${interaccion.id}`,
            type: 'info',
            category: 'interacciones',
            title: '📋 Seguimiento Pendiente',
            message: `Seguimiento pendiente con ${cliente?.nombre || 'Cliente'} - ${interaccion.tipo}`,
            timestamp: new Date(interaccion.fecha || Date.now()),
            read: false
          });
        }
      });

      // Notificaciones de oportunidades sin actividad reciente
      oportunidades.forEach(oportunidad => {
        if (oportunidad.etapa !== 'Cerrado Ganado' && oportunidad.etapa !== 'Cerrado Perdido') {
          const createdDate = new Date(oportunidad.fechaCreacion);
          const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

          if (daysSinceCreation > 30) {
            generatedNotifications.push({
              id: `oportunidad-inactiva-${oportunidad.id}`,
              type: 'warning',
              category: 'oportunidades',
              title: '💼 Oportunidad Requiere Atención',
              message: `"${oportunidad.nombre}" sin actividad por ${daysSinceCreation} días`,
              timestamp: new Date(),
              read: false
            });
          }
        }
      });

      // Notificaciones de proyectos con bajo progreso
      proyectos.forEach(proyecto => {
        if (proyecto.estado === 'En Curso' && proyecto.fechaFin) {
          const endDate = new Date(proyecto.fechaFin);
          const totalDuration = endDate - new Date(proyecto.fechaInicio);
          const elapsed = today - new Date(proyecto.fechaInicio);
          const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
          const actualProgress = proyecto.progreso || 0;

          if (actualProgress < expectedProgress - 20) {
            generatedNotifications.push({
              id: `proyecto-atrasado-${proyecto.id}`,
              type: 'warning',
              category: 'proyectos',
              title: '🚧 Proyecto Atrasado',
              message: `"${proyecto.nombre}" - Progreso: ${actualProgress}%, Esperado: ${Math.round(expectedProgress)}%`,
              timestamp: new Date(),
              read: false
            });
          }
        }
      });

      // Ordenar por timestamp (más recientes primero)
      generatedNotifications.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(generatedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setLoading(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      case 'success': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.category === filter);

  const categoryCounts = {
    all: notifications.length,
    tareas: notifications.filter(n => n.category === 'tareas').length,
    interacciones: notifications.filter(n => n.category === 'interacciones').length,
    oportunidades: notifications.filter(n => n.category === 'oportunidades').length,
    proyectos: notifications.filter(n => n.category === 'proyectos').length
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold">Centro de Notificaciones</h2>
            <p className="text-blue-100 mt-2">Alertas y recordatorios automáticos del sistema</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-4">
            <Bell className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-orange-500">
        <h3 className="text-xl font-semibold text-blue-900 mb-4">Filtrar Notificaciones</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({categoryCounts.all})
          </button>
          <button
            onClick={() => setFilter('tareas')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'tareas'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tareas ({categoryCounts.tareas})
          </button>
          <button
            onClick={() => setFilter('interacciones')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'interacciones'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Interacciones ({categoryCounts.interacciones})
          </button>
          <button
            onClick={() => setFilter('oportunidades')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'oportunidades'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Oportunidades ({categoryCounts.oportunidades})
          </button>
          <button
            onClick={() => setFilter('proyectos')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'proyectos'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Proyectos ({categoryCounts.proyectos})
          </button>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-blue-900">
            {filter === 'all' ? 'Todas las Notificaciones' : `Notificaciones de ${filter.charAt(0).toUpperCase() + filter.slice(1)}`}
          </h3>
          <button
            onClick={loadNotifications}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            🔄 Actualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-gray-600">Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No hay notificaciones</p>
            <p className="text-gray-500 mt-2">¡Todo está bajo control!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 p-5 rounded-lg transition-all hover:shadow-md ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <h4 className="font-semibold text-gray-900 text-lg">{notification.title}</h4>
                      {notification.priority && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          notification.priority === 'Alta' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 ml-11">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-2 ml-11">
                      {notification.timestamp.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      {!loading && notifications.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">🔴 Críticas</h4>
            <p className="text-3xl font-bold text-red-600">
              {notifications.filter(n => n.type === 'error').length}
            </p>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Advertencias</h4>
            <p className="text-3xl font-bold text-yellow-600">
              {notifications.filter(n => n.type === 'warning').length}
            </p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Informativas</h4>
            <p className="text-3xl font-bold text-blue-600">
              {notifications.filter(n => n.type === 'info').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Integraciones
function IntegracionesModule() {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    url: '',
    eventos: []
  });

  const eventosDisponibles = [
    'cliente.creado', 'cliente.actualizado', 'cliente.eliminado',
    'oportunidad.creada', 'oportunidad.actualizada', 'oportunidad.cerrada',
    'tarea.creada', 'tarea.completada', 'tarea.vencida',
    'proyecto.creado', 'proyecto.actualizado', 'proyecto.completado'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysSnap, webhooksSnap] = await Promise.all([
        getDocs(collection(db, 'api_keys')),
        getDocs(collection(db, 'webhooks'))
      ]);

      setApiKeys(keysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setWebhooks(webhooksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Generar logs simulados
      const simulatedLogs = [
        { id: '1', timestamp: new Date(), method: 'GET', endpoint: '/api/clientes', status: 200, duration: '45ms' },
        { id: '2', timestamp: new Date(Date.now() - 300000), method: 'POST', endpoint: '/api/oportunidades', status: 201, duration: '89ms' },
        { id: '3', timestamp: new Date(Date.now() - 600000), method: 'PUT', endpoint: '/api/tareas/123', status: 200, duration: '67ms' },
        { id: '4', timestamp: new Date(Date.now() - 900000), method: 'DELETE', endpoint: '/api/proyectos/456', status: 204, duration: '34ms' },
        { id: '5', timestamp: new Date(Date.now() - 1200000), method: 'GET', endpoint: '/api/reportes', status: 200, duration: '156ms' }
      ];
      setLogs(simulatedLogs);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    try {
      const newKey = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        key: generateApiKey(),
        createdAt: new Date().toISOString(),
        activa: true,
        ultimoUso: null
      };

      await addDoc(collection(db, 'api_keys'), newKey);
      setFormData({ nombre: '', descripcion: '', url: '', eventos: [] });
      setShowKeyForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating API key:", error);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      const newWebhook = {
        nombre: formData.nombre,
        url: formData.url,
        eventos: formData.eventos,
        activo: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'webhooks'), newWebhook);
      setFormData({ nombre: '', descripcion: '', url: '', eventos: [] });
      setShowWebhookForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating webhook:", error);
    }
  };

  const handleDeleteApiKey = async (id) => {
    if (window.confirm('¿Eliminar esta API key? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'api_keys', id));
        loadData();
      } catch (error) {
        console.error("Error deleting API key:", error);
      }
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (window.confirm('¿Eliminar este webhook?')) {
      try {
        await deleteDoc(doc(db, 'webhooks', id));
        loadData();
      } catch (error) {
        console.error("Error deleting webhook:", error);
      }
    }
  };

  const handleToggleApiKey = async (key) => {
    try {
      await updateDoc(doc(db, 'api_keys', key.id), { activa: !key.activa });
      loadData();
    } catch (error) {
      console.error("Error toggling API key:", error);
    }
  };

  const handleToggleWebhook = async (webhook) => {
    try {
      await updateDoc(doc(db, 'webhooks', webhook.id), { activo: !webhook.activo });
      loadData();
    } catch (error) {
      console.error("Error toggling webhook:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
    if (status >= 400) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800';
      case 'POST': return 'bg-green-100 text-green-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold">Integraciones y API</h2>
            <p className="text-blue-100 mt-2">Gestión de API Keys, Webhooks y monitoreo de actividad</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-4">
            <Plug className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md mb-8 border-l-4 border-orange-500">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('apikeys')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'apikeys'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔑 API Keys
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'webhooks'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            🔗 Webhooks
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📊 Logs de API
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📚 Documentación
          </button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-gray-600">Cargando...</p>
            </div>
          ) : (
            <>
              {/* API Keys Tab */}
              {activeTab === 'apikeys' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-blue-900">API Keys</h3>
                    <button
                      onClick={() => setShowKeyForm(!showKeyForm)}
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-all shadow-md"
                    >
                      + Nueva API Key
                    </button>
                  </div>

                  {showKeyForm && (
                    <form onSubmit={handleCreateApiKey} className="bg-gray-50 p-6 rounded-lg mb-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                          <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Ej: Integración con sistema externo"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                          <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            rows="3"
                            placeholder="Descripción del uso de esta API key..."
                          />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Generar API Key
                          </button>
                          <button type="button" onClick={() => setShowKeyForm(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {apiKeys.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No hay API keys registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {apiKeys.map(key => (
                        <div key={key.id} className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg text-gray-900">{key.nombre}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${key.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {key.activa ? '✓ Activa' : '○ Inactiva'}
                                </span>
                              </div>
                              {key.descripcion && <p className="text-gray-600 mb-3">{key.descripcion}</p>}
                              <div className="bg-gray-100 p-3 rounded font-mono text-sm flex items-center justify-between">
                                <code className="text-gray-800">{key.key}</code>
                                <button onClick={() => copyToClipboard(key.key)} className="ml-3 text-blue-600 hover:text-blue-800">
                                  📋 Copiar
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                Creada: {new Date(key.createdAt).toLocaleString('es-MX')}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button onClick={() => handleToggleApiKey(key)} className="text-blue-600 hover:text-blue-800 px-3 py-1">
                                {key.activa ? 'Desactivar' : 'Activar'}
                              </button>
                              <button onClick={() => handleDeleteApiKey(key.id)} className="text-red-600 hover:text-red-800 px-3 py-1">
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-blue-900">Webhooks</h3>
                    <button
                      onClick={() => setShowWebhookForm(!showWebhookForm)}
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-all shadow-md"
                    >
                      + Nuevo Webhook
                    </button>
                  </div>

                  {showWebhookForm && (
                    <form onSubmit={handleCreateWebhook} className="bg-gray-50 p-6 rounded-lg mb-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                          <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">URL del Webhook *</label>
                          <input
                            type="url"
                            required
                            value={formData.url}
                            onChange={(e) => setFormData({...formData, url: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="https://ejemplo.com/webhook"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Eventos *</label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                            {eventosDisponibles.map(evento => (
                              <label key={evento} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={formData.eventos.includes(evento)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({...formData, eventos: [...formData.eventos, evento]});
                                    } else {
                                      setFormData({...formData, eventos: formData.eventos.filter(ev => ev !== evento)});
                                    }
                                  }}
                                  className="rounded text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-sm text-gray-700">{evento}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            Crear Webhook
                          </button>
                          <button type="button" onClick={() => setShowWebhookForm(false)} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {webhooks.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No hay webhooks registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {webhooks.map(webhook => (
                        <div key={webhook.id} className="border border-gray-200 rounded-lg p-5 bg-white hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg text-gray-900">{webhook.nombre}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${webhook.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {webhook.activo ? '✓ Activo' : '○ Inactivo'}
                                </span>
                              </div>
                              <p className="text-blue-600 mb-3 font-mono text-sm">{webhook.url}</p>
                              <div className="flex flex-wrap gap-2">
                                {webhook.eventos.map(evento => (
                                  <span key={evento} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                    {evento}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-3">
                                Creado: {new Date(webhook.createdAt).toLocaleString('es-MX')}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button onClick={() => handleToggleWebhook(webhook)} className="text-blue-600 hover:text-blue-800 px-3 py-1">
                                {webhook.activo ? 'Desactivar' : 'Activar'}
                              </button>
                              <button onClick={() => handleDeleteWebhook(webhook.id)} className="text-red-600 hover:text-red-800 px-3 py-1">
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div>
                  <h3 className="text-2xl font-semibold text-blue-900 mb-6">Logs de Actividad API</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{log.timestamp.toLocaleString('es-MX')}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(log.method)}`}>
                                {log.method}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">{log.endpoint}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{log.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Docs Tab */}
              {activeTab === 'docs' && (
                <div>
                  <h3 className="text-2xl font-semibold text-blue-900 mb-6">Documentación de API</h3>
                  <div className="space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Base URL</h4>
                      <code className="bg-white px-3 py-2 rounded text-sm">https://api.grx-crm.com/v1</code>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Endpoints Disponibles</h4>
                      <div className="space-y-3">
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-green-600 font-bold">GET</span> /clientes</p>
                          <p className="text-gray-600 text-sm">Obtener lista de clientes</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-blue-600 font-bold">POST</span> /clientes</p>
                          <p className="text-gray-600 text-sm">Crear nuevo cliente</p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-green-600 font-bold">GET</span> /oportunidades</p>
                          <p className="text-gray-600 text-sm">Obtener lista de oportunidades</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-blue-600 font-bold">POST</span> /oportunidades</p>
                          <p className="text-gray-600 text-sm">Crear nueva oportunidad</p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-green-600 font-bold">GET</span> /tareas</p>
                          <p className="text-gray-600 text-sm">Obtener lista de tareas</p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-mono text-sm"><span className="text-green-600 font-bold">GET</span> /proyectos</p>
                          <p className="text-gray-600 text-sm">Obtener lista de proyectos</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-2">Autenticación</h4>
                      <p className="text-yellow-800 mb-3">Todas las peticiones requieren un API Key en el header:</p>
                      <code className="bg-white px-3 py-2 rounded text-sm block">Authorization: Bearer YOUR_API_KEY</code>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
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
