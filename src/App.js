import React, { useState, useEffect } from 'react';
import { Building2, Users, LogIn, Settings, UserCircle, Phone, ClipboardList, Briefcase, TrendingUp, BarChart3, Bell, Plug, Plus, Trash2, Edit2, Save, X, Download, Calendar, ChevronLeft, ChevronRight, Mail, Send, Menu, UserPlus, ArrowRight, DollarSign, Target, Clock, Award, Info, MessageCircle, Bot, Minimize2, GitBranch, FileText, Paperclip, ExternalLink, HelpCircle } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, storage, auth } from './firebase';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

// Utilidad para exportar a Excel
const exportToExcel = (data, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// ============= INTELIGENCIA ARTIFICIAL PREDICTIVA =============

// 1. LEAD SCORING - Calcula puntuación de calidad del lead (0-100)
const calcularLeadScore = (lead, interacciones = []) => {
  let score = 0;

  // Factor 1: Fuente del lead (0-25 puntos)
  const puntajeFuente = {
    'web': 25,
    'referido': 20,
    'evento': 18,
    'redes-sociales': 15,
    'email-marketing': 12,
    'llamada-fria': 8,
    'otro': 5
  };
  score += puntajeFuente[lead.fuente] || 10;

  // Factor 2: Tamaño de empresa (0-20 puntos)
  const empresaSize = lead.empresa?.toLowerCase() || '';
  if (empresaSize.includes('corp') || empresaSize.includes('group') || empresaSize.includes('holdings')) {
    score += 20;
  } else if (lead.telefono && lead.email) {
    score += 15;
  } else {
    score += 10;
  }

  // Factor 3: Calidad de datos (0-20 puntos)
  let datosCompletos = 0;
  if (lead.nombre) datosCompletos += 5;
  if (lead.email) datosCompletos += 5;
  if (lead.telefono) datosCompletos += 5;
  if (lead.empresa) datosCompletos += 5;
  score += datosCompletos;

  // Factor 4: Frecuencia de interacciones (0-20 puntos)
  const interaccionesLead = interacciones.filter(i =>
    i.clienteId === lead.id || i.leadId === lead.id
  );
  const numInteracciones = interaccionesLead.length;
  if (numInteracciones >= 5) score += 20;
  else if (numInteracciones >= 3) score += 15;
  else if (numInteracciones >= 1) score += 10;
  else score += 0;

  // Factor 5: Tiempo de respuesta (0-15 puntos)
  if (lead.fechaCreacion) {
    const diasDesdeCreacion = Math.floor(
      (new Date() - new Date(lead.fechaCreacion)) / (1000 * 60 * 60 * 24)
    );
    if (diasDesdeCreacion <= 7) score += 15; // Lead reciente
    else if (diasDesdeCreacion <= 30) score += 10;
    else if (diasDesdeCreacion <= 90) score += 5;
    else score += 0; // Lead muy viejo
  }

  return Math.min(100, Math.max(0, score));
};

// 2. PROBABILIDAD DE CIERRE - Calcula % de probabilidad de cerrar una oportunidad
const calcularProbabilidadCierre = (oportunidad, interacciones = []) => {
  let probabilidad = 0;

  // Factor 1: Etapa actual (base según pipeline)
  const probabilidadPorEtapa = {
    'Contacto Inicial': 10,
    'Calificación': 20,
    'Análisis de Necesidades': 35,
    'Presentación/Demo': 50,
    'Propuesta Enviada': 60,
    'Negociación': 75,
    'Cerrado Ganado': 95,
    'Cerrado Perdido': 0
  };
  probabilidad = probabilidadPorEtapa[oportunidad.etapa] || 20;

  // Factor 2: Valor del deal vs promedio (ajuste -10 a +10)
  const valorDeal = parseFloat(oportunidad.valor) || 0;
  if (valorDeal > 100000) probabilidad += 10;
  else if (valorDeal > 50000) probabilidad += 5;
  else if (valorDeal < 5000) probabilidad -= 10;

  // Factor 3: Interacciones recientes (+15 si hay actividad)
  const interaccionesOpp = interacciones.filter(i =>
    i.oportunidadId === oportunidad.id
  );
  const ultimaInteraccion = interaccionesOpp.sort((a, b) =>
    new Date(b.fecha) - new Date(a.fecha)
  )[0];

  if (ultimaInteraccion) {
    const diasDesdeUltimaInteraccion = Math.floor(
      (new Date() - new Date(ultimaInteraccion.fecha)) / (1000 * 60 * 60 * 24)
    );
    if (diasDesdeUltimaInteraccion <= 7) probabilidad += 15;
    else if (diasDesdeUltimaInteraccion <= 14) probabilidad += 10;
    else if (diasDesdeUltimaInteraccion > 30) probabilidad -= 15; // Oportunidad fría
  }

  // Factor 4: Tiempo en etapa actual (deals estancados = menor probabilidad)
  if (oportunidad.fechaCreacion) {
    const diasEnEtapa = Math.floor(
      (new Date() - new Date(oportunidad.fechaCreacion)) / (1000 * 60 * 60 * 24)
    );
    if (diasEnEtapa > 90) probabilidad -= 20; // Estancado
    else if (diasEnEtapa > 60) probabilidad -= 10;
  }

  return Math.min(100, Math.max(0, probabilidad));
};

// 3. RIESGO DE CHURN - Identifica clientes en riesgo (0-100, mayor = más riesgo)
const calcularRiesgoChurn = (cliente, interacciones = []) => {
  let riesgo = 0;

  // Factor 1: Tiempo desde última interacción (0-40 puntos)
  const interaccionesCliente = interacciones.filter(i => i.clienteId === cliente.id);
  const ultimaInteraccion = interaccionesCliente.sort((a, b) =>
    new Date(b.fecha) - new Date(a.fecha)
  )[0];

  if (ultimaInteraccion) {
    const diasSinContacto = Math.floor(
      (new Date() - new Date(ultimaInteraccion.fecha)) / (1000 * 60 * 60 * 24)
    );
    if (diasSinContacto > 90) riesgo += 40;
    else if (diasSinContacto > 60) riesgo += 30;
    else if (diasSinContacto > 30) riesgo += 15;
  } else {
    riesgo += 35; // Sin interacciones registradas = alto riesgo
  }

  // Factor 2: Tendencia de interacciones (comparar últimos 30 vs 60 días)
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  const hace60dias = new Date();
  hace60dias.setDate(hace60dias.getDate() - 60);

  const interaccionesRecientes = interaccionesCliente.filter(i =>
    new Date(i.fecha) >= hace30dias
  ).length;
  const interaccionesAnteriores = interaccionesCliente.filter(i =>
    new Date(i.fecha) >= hace60dias && new Date(i.fecha) < hace30dias
  ).length;

  if (interaccionesRecientes < interaccionesAnteriores) {
    riesgo += 25; // Tendencia descendente en engagement
  }

  // Factor 3: Estado del cliente
  if (cliente.estado === 'inactivo') riesgo += 20;
  else if (cliente.estado === 'activo') riesgo -= 10;

  // Factor 4: Tipo de interacciones negativas
  const interaccionesNegativas = interaccionesCliente.filter(i =>
    i.tipo === 'queja' || i.notas?.toLowerCase().includes('problema') ||
    i.notas?.toLowerCase().includes('cancelar') || i.notas?.toLowerCase().includes('insatisfecho')
  );
  if (interaccionesNegativas.length > 0) {
    riesgo += 15 * Math.min(interaccionesNegativas.length, 3);
  }

  return Math.min(100, Math.max(0, riesgo));
};

// 4. SIGUIENTE MEJOR ACCIÓN - Recomienda qué hacer con un lead/oportunidad
const recomendarSiguienteAccion = (item, tipo, interacciones = []) => {
  const interaccionesItem = interacciones.filter(i =>
    i.leadId === item.id || i.oportunidadId === item.id || i.clienteId === item.id
  );

  const ultimaInteraccion = interaccionesItem.sort((a, b) =>
    new Date(b.fecha) - new Date(a.fecha)
  )[0];

  const diasSinContacto = ultimaInteraccion ? Math.floor(
    (new Date() - new Date(ultimaInteraccion.fecha)) / (1000 * 60 * 60 * 24)
  ) : 999;

  // Leads
  if (tipo === 'lead') {
    const score = calcularLeadScore(item, interacciones);

    if (score >= 70) {
      return {
        accion: 'Llamar urgente',
        icono: '📞',
        prioridad: 'alta',
        razon: 'Lead de alta calidad - Contactar dentro de 24 horas'
      };
    } else if (score >= 40) {
      if (diasSinContacto > 7) {
        return {
          accion: 'Enviar email de seguimiento',
          icono: '✉️',
          prioridad: 'media',
          razon: 'Lead caliente sin contacto reciente'
        };
      } else {
        return {
          accion: 'Agendar llamada',
          icono: '📅',
          prioridad: 'media',
          razon: 'Continuar proceso de calificación'
        };
      }
    } else {
      return {
        accion: 'Agregar a campaña de nurturing',
        icono: '📧',
        prioridad: 'baja',
        razon: 'Lead frío - Mantener comunicación automatizada'
      };
    }
  }

  // Oportunidades
  if (tipo === 'oportunidad') {
    const probabilidad = calcularProbabilidadCierre(item, interacciones);

    if (item.etapa === 'negociacion' && probabilidad >= 70) {
      return {
        accion: 'Enviar propuesta final',
        icono: '📄',
        prioridad: 'alta',
        razon: 'Alta probabilidad de cierre - Push final'
      };
    } else if (diasSinContacto > 14) {
      return {
        accion: 'Reactivar oportunidad',
        icono: '🔥',
        prioridad: 'alta',
        razon: 'Oportunidad estancada - Urgente reactivar'
      };
    } else if (item.etapa === 'propuesta') {
      return {
        accion: 'Reunión de seguimiento',
        icono: '👥',
        prioridad: 'media',
        razon: 'Avanzar propuesta a negociación'
      };
    } else {
      return {
        accion: 'Enviar contenido educativo',
        icono: '📚',
        prioridad: 'baja',
        razon: 'Nutrir oportunidad en etapa temprana'
      };
    }
  }

  // Clientes
  if (tipo === 'cliente') {
    const riesgo = calcularRiesgoChurn(item, interacciones);

    if (riesgo >= 70) {
      return {
        accion: 'Llamada de retención URGENTE',
        icono: '🚨',
        prioridad: 'alta',
        razon: 'Cliente en alto riesgo de pérdida'
      };
    } else if (riesgo >= 40) {
      return {
        accion: 'Check-in proactivo',
        icono: '💬',
        prioridad: 'media',
        razon: 'Prevenir churn - Verificar satisfacción'
      };
    } else if (diasSinContacto > 45) {
      return {
        accion: 'Email de valor agregado',
        icono: '💎',
        prioridad: 'media',
        razon: 'Mantener engagement con contenido útil'
      };
    } else {
      return {
        accion: 'Oportunidad de upsell',
        icono: '⬆️',
        prioridad: 'baja',
        razon: 'Cliente saludable - Explorar venta cruzada'
      };
    }
  }

  return {
    accion: 'Revisar manualmente',
    icono: '🔍',
    prioridad: 'baja',
    razon: 'Sin suficiente información para recomendación'
  };
};

export default function App() {
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Usuario autenticado
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'leads', name: 'Leads', icon: UserPlus },
    { id: 'oportunidades', name: 'Pipeline', icon: TrendingUp },
    { id: 'clientes', name: 'Clientes', icon: UserCircle },
    { id: 'productos', name: 'Productos', icon: DollarSign },
    { id: 'cotizaciones', name: 'Cotizaciones', icon: Target },
    { id: 'interacciones', name: 'Interacciones', icon: Phone },
    { id: 'tareas', name: 'Tareas', icon: ClipboardList },
    { id: 'calendario', name: 'Calendario', icon: Calendar },
    { id: 'proyectos', name: 'Proyectos', icon: Briefcase },
    { id: 'empresas', name: 'Empresas', icon: Building2 },
    { id: 'usuarios', name: 'Usuarios', icon: Users },
    { id: 'reportes', name: 'Reportes', icon: BarChart3 },
    { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
    { id: 'integraciones', name: 'Integraciones', icon: Plug },
    { id: 'workflows', name: 'Workflows', icon: GitBranch },
    { id: 'config', name: 'Configuración', icon: Settings },
  ];

  // Manejo de autenticación
  const handleLogin = (usuario) => {
    setCurrentUser(usuario);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(usuario));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('currentUser');
      setCurrentModule('dashboard');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Verificar sesión al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

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

  // Mostrar Login si no está autenticado
  if (!isAuthenticated) {
    return <LoginModule onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-orange-500 text-white p-3 rounded-lg shadow-lg hover:bg-orange-600 transition-colors"
      >
        <Menu size={24} />
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        w-64 flex-shrink-0 bg-gradient-to-b from-gray-900 to-gray-800 shadow-lg border-r-4 border-orange-500
        fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col overflow-hidden
      `}>
        <div className="py-4 lg:py-8 px-4 lg:px-6 border-b-2 border-gray-700">
          <div className="flex flex-col items-center justify-center">
            {/* Logo GRX Holdings */}
            <img
              src="/grx-logo.png"
              alt="GRX Holdings"
              className="h-auto mb-1 w-40 lg:w-60"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* Fallback si no hay imagen */}
            <div style={{display: 'none'}}>
              <div className="text-3xl lg:text-5xl font-black tracking-tight text-white mb-2">
                GRX HOLDINGS
              </div>
            </div>
            {/* Badge CRM */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 lg:px-5 py-1 lg:py-2 rounded-lg font-bold text-xs lg:text-sm tracking-widest shadow-lg">
              CRM SYSTEM
            </div>
          </div>
        </div>
        <nav className="p-3 lg:p-6 flex-1 overflow-y-auto">
          {modules.map(module => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => {
                  setCurrentModule(module.id);
                  setSidebarOpen(false); // Close sidebar on mobile after selection
                }}
                className={`w-full flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-4 rounded-lg mb-2 lg:mb-3 transition-all ${
                  currentModule === module.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="lg:hidden" />
                <Icon size={56} className="hidden lg:block" />
                <span className="text-base lg:text-2xl font-medium">{module.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info y Logout */}
        <div className="p-4 border-t-2 border-gray-700 bg-gray-900 flex-shrink-0">
          <div className="bg-gray-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                {currentUser?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{currentUser?.nombre || 'Usuario'}</p>
                <p className="text-gray-400 text-xs truncate">{currentUser?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                currentUser?.rol === 'administrador' ? 'bg-purple-100 text-purple-800' :
                currentUser?.rol === 'gerente' ? 'bg-blue-100 text-blue-800' :
                currentUser?.rol === 'ejecutivo' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentUser?.rol?.toUpperCase() || 'USUARIO'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            <LogIn size={18} className="rotate-180" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-gray-100 lg:pl-5">
        <div className="w-full px-4 lg:pr-10 py-16 lg:py-10 box-border">
          {currentModule === 'dashboard' && (
            <DashboardModule currentUser={currentUser} />
          )}
          {currentModule === 'empresas' && (
            <EmpresasModule currentUser={currentUser} />
          )}
          {currentModule === 'usuarios' && (
            <UsuariosModule currentUser={currentUser} />
          )}
          {currentModule === 'leads' && (
            <LeadsModule currentUser={currentUser} />
          )}
          {currentModule === 'clientes' && (
            <ClientesModule currentUser={currentUser} />
          )}
          {currentModule === 'interacciones' && (
            <InteraccionesModule currentUser={currentUser} />
          )}
          {currentModule === 'tareas' && (
            <TareasModule currentUser={currentUser} />
          )}
          {currentModule === 'calendario' && (
            <CalendarioModule currentUser={currentUser} />
          )}
          {currentModule === 'proyectos' && (
            <ProyectosModule currentUser={currentUser} />
          )}
          {currentModule === 'oportunidades' && (
            <OportunidadesModule currentUser={currentUser} />
          )}
          {currentModule === 'productos' && (
            <ProductosModule currentUser={currentUser} />
          )}
          {currentModule === 'cotizaciones' && (
            <CotizacionesModule currentUser={currentUser} />
          )}
          {currentModule === 'reportes' && (
            <ReportesModule currentUser={currentUser} />
          )}
          {currentModule === 'notificaciones' && (
            <NotificacionesModule currentUser={currentUser} />
          )}
          {currentModule === 'integraciones' && (
            <IntegracionesModule currentUser={currentUser} />
          )}
          {currentModule === 'workflows' && (
            <WorkflowsModule currentUser={currentUser} />
          )}
          {currentModule === 'config' && (
            <ConfigModule currentUser={currentUser} />
          )}
        </div>
      </div>

      {/* Chatbot IA Flotante */}
      <AIChatbot />
    </div>
  );
}

// Módulo Dashboard
function DashboardModule() {
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalLeads: 0,
    leadsCalificados: 0,
    leadsConvertidos: 0,
    totalClientes: 0,
    totalOportunidades: 0,
    oportunidadesGanadas: 0,
    totalTareas: 0,
    tareasPendientes: 0,
    valorPipeline: 0,
    valorCerrado: 0,
    tasaConversion: 0
  });
  const [oportunidadesPorEtapa, setOportunidadesPorEtapa] = useState([]);
  const [interaccionesRecientes, setInteraccionesRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState({
    leadsAbandonados: [],
    oportunidadesEstancadas: [],
    tareasVencidas: [],
    propuestasSinRespuesta: []
  });
  const [kpisAvanzados, setKpisAvanzados] = useState({
    conversionLeadOportunidad: 0,
    conversionOportunidadCliente: 0,
    cicloPromedioVenta: 0,
    valorPromedioOportunidad: 0,
    tasaCierreExito: 0,
    oportunidadesActivasPromedio: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [empresasSnap, leadsSnap, clientesSnap, oportunidadesSnap, tareasSnap, interaccionesSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, 'empresas')),
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'tareas')),
        getDocs(collection(db, 'interacciones')),
        getDocs(collection(db, 'usuarios'))
      ]);

      const leads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const oportunidades = oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tareas = tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const interacciones = interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usuarios = usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const leadsCalificados = leads.filter(l => l.estado === 'calificado').length;
      const leadsConvertidos = leads.filter(l => l.estado === 'convertido').length;
      const oportunidadesGanadas = oportunidades.filter(o => o.etapa === 'Cerrado Ganado').length;
      const valorCerrado = oportunidades
        .filter(o => o.etapa === 'Cerrado Ganado')
        .reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0);

      const tasaConversion = leads.length > 0 ? ((leadsConvertidos / leads.length) * 100).toFixed(1) : 0;

      // Calcular stats
      setStats({
        totalEmpresas: empresasSnap.size,
        totalLeads: leads.length,
        leadsCalificados,
        leadsConvertidos,
        totalClientes: clientesSnap.size,
        totalOportunidades: oportunidadesSnap.size,
        oportunidadesGanadas,
        totalTareas: tareasSnap.size,
        tareasPendientes: tareas.filter(t => t.estado === 'pendiente').length,
        valorPipeline: oportunidades.reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0),
        valorCerrado,
        tasaConversion
      });

      // Agrupar oportunidades por etapa
      const etapas = ['Contacto Inicial', 'Calificación', 'Análisis de Necesidades', 'Presentación/Demo', 'Propuesta Enviada', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
      const oportunidadesAgrupadas = etapas.map(etapa => {
        const ops = oportunidades.filter(o => o.etapa === etapa);
        return {
          etapa: etapa,
          cantidad: ops.length,
          valor: ops.reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0)
        };
      });
      setOportunidadesPorEtapa(oportunidadesAgrupadas);

      // SISTEMA DE ALERTAS AUTOMÁTICAS
      const ahora = new Date();

      // 1. Leads sin contactar >3 días (CRÍTICO)
      const leadsAbandonados = leads.filter(lead => {
        if (lead.estado === 'convertido' || lead.estado === 'descalificado') return false;
        const fechaCreacion = new Date(lead.fechaCreacion);
        const diasDesdeCreacion = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
        return diasDesdeCreacion > 3;
      });

      // 2. Oportunidades estancadas >30 días sin movimiento (ATENCIÓN)
      const oportunidadesEstancadas = oportunidades.filter(op => {
        if (op.etapa === 'Cerrado Ganado' || op.etapa === 'Cerrado Perdido') return false;
        const fechaCreacion = new Date(op.fechaCreacion);
        const diasDesdeCreacion = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
        return diasDesdeCreacion > 30;
      });

      // 3. Tareas vencidas (URGENTE)
      const tareasVencidas = tareas.filter(tarea => {
        if (tarea.estado === 'completada') return false;
        if (!tarea.fechaVencimiento) return false;
        const fechaVenc = new Date(tarea.fechaVencimiento);
        return ahora > fechaVenc;
      });

      // 4. Propuestas >15 días sin respuesta (SEGUIMIENTO)
      const propuestasSinRespuesta = oportunidades.filter(op => {
        if (op.etapa !== 'Propuesta Enviada') return false;
        const fechaCreacion = new Date(op.fechaCreacion);
        const diasDesdeEnvio = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
        return diasDesdeEnvio > 15;
      });

      setAlertas({
        leadsAbandonados,
        oportunidadesEstancadas,
        tareasVencidas,
        propuestasSinRespuesta
      });

      // CÁLCULO DE KPIs AVANZADOS
      // 1. Tasa de conversión Lead → Oportunidad (reutilizando leadsConvertidos ya calculado)
      const totalLeads = leads.length;
      const conversionLeadOportunidad = totalLeads > 0 ? ((leadsConvertidos / totalLeads) * 100).toFixed(1) : 0;

      // 2. Tasa de conversión Oportunidad → Cliente (reutilizando oportunidadesGanadas ya calculado)
      const totalOportunidades = oportunidades.length;
      const conversionOportunidadCliente = totalOportunidades > 0 ? ((oportunidadesGanadas / totalOportunidades) * 100).toFixed(1) : 0;

      // 3. Ciclo promedio de venta (días desde creación de oportunidad hasta cierre)
      const oportunidadesCerradas = oportunidades.filter(o => o.etapa === 'Cerrado Ganado' || o.etapa === 'Cerrado Perdido');
      let cicloPromedioVenta = 0;
      if (oportunidadesCerradas.length > 0) {
        const totalDias = oportunidadesCerradas.reduce((acc, op) => {
          const fechaCreacion = new Date(op.fechaCreacion);
          const fechaCierre = op.fechaCierre ? new Date(op.fechaCierre) : new Date();
          const dias = (fechaCierre - fechaCreacion) / (1000 * 60 * 60 * 24);
          return acc + dias;
        }, 0);
        cicloPromedioVenta = Math.round(totalDias / oportunidadesCerradas.length);
      }

      // 4. Valor promedio de oportunidad
      const valorTotalOportunidades = oportunidades.reduce((acc, op) => acc + (parseFloat(op.valor) || 0), 0);
      const valorPromedioOportunidad = totalOportunidades > 0 ? (valorTotalOportunidades / totalOportunidades) : 0;

      // 5. Tasa de cierre exitoso (Ganadas / Total Cerradas)
      const oportunidadesPerdidas = oportunidades.filter(o => o.etapa === 'Cerrado Perdido').length;
      const totalCerradas = oportunidadesGanadas + oportunidadesPerdidas;
      const tasaCierreExito = totalCerradas > 0 ? ((oportunidadesGanadas / totalCerradas) * 100).toFixed(1) : 0;

      // 6. Promedio de oportunidades activas (no cerradas)
      const oportunidadesActivas = oportunidades.filter(o => o.etapa !== 'Cerrado Ganado' && o.etapa !== 'Cerrado Perdido').length;

      setKpisAvanzados({
        conversionLeadOportunidad,
        conversionOportunidadCliente,
        cicloPromedioVenta,
        valorPromedioOportunidad,
        tasaCierreExito,
        oportunidadesActivasPromedio: oportunidadesActivas
      });

      // Últimas 5 interacciones
      const interaccionesConDatos = interacciones
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5)
        .map(i => ({
          ...i,
          clienteNombre: clientes.find(c => c.id === i.clienteId)?.nombre || 'N/A',
          usuarioNombre: usuarios.find(u => u.id === i.usuarioId)?.nombre || 'N/A'
        }));
      setInteraccionesRecientes(interaccionesConDatos);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-2xl text-gray-600">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Dashboard</h2>
        <p className="text-blue-100 mt-2">Vista general del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Empresas</p>
              <p className="text-4xl font-bold mt-2">{stats.totalEmpresas}</p>
            </div>
            <Building2 className="w-16 h-16 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Clientes</p>
              <p className="text-4xl font-bold mt-2">{stats.totalClientes}</p>
            </div>
            <UserCircle className="w-16 h-16 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Oportunidades</p>
              <p className="text-4xl font-bold mt-2">{stats.totalOportunidades}</p>
              <p className="text-green-100 text-xs mt-1">{formatCurrency(stats.valorPipeline)}</p>
            </div>
            <TrendingUp className="w-16 h-16 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Tareas Pendientes</p>
              <p className="text-4xl font-bold mt-2">{stats.tareasPendientes}</p>
              <p className="text-orange-100 text-xs mt-1">de {stats.totalTareas} totales</p>
            </div>
            <ClipboardList className="w-16 h-16 text-orange-200" />
          </div>
        </div>
      </div>

      {/* EMBUDO DE VENTAS INTEGRADO */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-8 mb-8 border-2 border-orange-500">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <TrendingUp size={32} className="text-orange-600" />
          Embudo de Ventas Integrado - Flujo Completo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* LEADS */}
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <UserPlus className="text-blue-600" size={32} />
              <ArrowRight className="text-gray-300" size={24} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">1. LEADS</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-blue-600">{stats.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Calificados:</span>
                <span className="text-sm font-semibold text-green-600">{stats.leadsCalificados}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Convertidos:</span>
                <span className="text-sm font-semibold text-purple-600">{stats.leadsConvertidos}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Tasa de conversión</p>
              <p className="text-lg font-bold text-blue-600">{stats.tasaConversion}%</p>
            </div>
          </div>

          {/* OPORTUNIDADES */}
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="text-green-600" size={32} />
              <ArrowRight className="text-gray-300" size={24} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">2. OPORTUNIDADES</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-green-600">{stats.totalOportunidades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Ganadas:</span>
                <span className="text-sm font-semibold text-green-600">{stats.oportunidadesGanadas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Pipeline:</span>
                <span className="text-sm font-semibold text-blue-600">{stats.totalOportunidades - stats.oportunidadesGanadas}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Valor pipeline</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(stats.valorPipeline)}</p>
            </div>
          </div>

          {/* CLIENTES */}
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <UserCircle className="text-purple-600" size={32} />
              <ArrowRight className="text-gray-300" size={24} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">3. CLIENTES</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-2xl font-bold text-purple-600">{stats.totalClientes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Desde oportunidades:</span>
                <span className="text-sm font-semibold text-green-600">{stats.oportunidadesGanadas}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">Valor cerrado</p>
              <p className="text-sm font-bold text-purple-600">{formatCurrency(stats.valorCerrado)}</p>
            </div>
          </div>

          {/* RESUMEN */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 shadow-md text-white hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center mb-4">
              <Target className="text-white" size={32} />
            </div>
            <h4 className="text-lg font-bold mb-4 text-center">RESUMEN</h4>
            <div className="space-y-3">
              <div className="bg-white bg-opacity-20 rounded p-2">
                <p className="text-xs text-orange-100">Tareas pendientes</p>
                <p className="text-2xl font-bold">{stats.tareasPendientes}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-2">
                <p className="text-xs text-orange-100">Total empresas</p>
                <p className="text-xl font-bold">{stats.totalEmpresas}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-2">
                <p className="text-xs text-orange-100">Conversión leads</p>
                <p className="text-xl font-bold">{stats.tasaConversion}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flujo visual */}
        <div className="bg-white rounded-lg p-6 shadow-inner">
          <h4 className="text-center text-sm font-semibold text-gray-600 mb-4">Proceso de Conversión</h4>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                <UserPlus className="text-blue-600" size={32} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Lead</p>
              <p className="text-xs text-gray-500">Captura</p>
            </div>

            <ArrowRight className="text-gray-400" size={24} />

            <div className="text-center">
              <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                <Target className="text-yellow-600" size={32} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Calificación</p>
              <p className="text-xs text-gray-500">BANT Scoring</p>
            </div>

            <ArrowRight className="text-gray-400" size={24} />

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                <DollarSign className="text-green-600" size={32} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Oportunidad</p>
              <p className="text-xs text-gray-500">Pipeline</p>
            </div>

            <ArrowRight className="text-gray-400" size={24} />

            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                <TrendingUp className="text-orange-600" size={32} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Negociación</p>
              <p className="text-xs text-gray-500">Propuesta</p>
            </div>

            <ArrowRight className="text-gray-400" size={24} />

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                <UserCircle className="text-purple-600" size={32} />
              </div>
              <p className="text-xs font-semibold text-gray-700">Cliente</p>
              <p className="text-xs text-gray-500">Cerrado</p>
            </div>
          </div>
        </div>
      </div>

      {/* SISTEMA DE ALERTAS AUTOMÁTICAS */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-red-500">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Bell size={28} className="text-red-600" />
            Alertas Automáticas
            <span className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full font-semibold">
              {alertas.leadsAbandonados.length + alertas.oportunidadesEstancadas.length +
               alertas.tareasVencidas.length + alertas.propuestasSinRespuesta.length} Total
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Leads abandonados */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-red-600 rounded-full p-2">
                <UserPlus className="text-white" size={20} />
              </div>
              <span className="text-3xl font-bold text-red-600">{alertas.leadsAbandonados.length}</span>
            </div>
            <h4 className="font-bold text-red-900 mb-1">🔴 Leads Abandonados</h4>
            <p className="text-xs text-red-700">Sin contactar >3 días</p>
            {alertas.leadsAbandonados.length > 0 && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs text-red-600 font-semibold">Requiere acción URGENTE</p>
                {alertas.leadsAbandonados.slice(0, 2).map(lead => (
                  <p key={lead.id} className="text-xs text-red-700 truncate">• {lead.nombre}</p>
                ))}
              </div>
            )}
          </div>

          {/* Tareas vencidas */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-600 rounded-full p-2">
                <ClipboardList className="text-white" size={20} />
              </div>
              <span className="text-3xl font-bold text-orange-600">{alertas.tareasVencidas.length}</span>
            </div>
            <h4 className="font-bold text-orange-900 mb-1">🟠 Tareas Vencidas</h4>
            <p className="text-xs text-orange-700">Fecha límite superada</p>
            {alertas.tareasVencidas.length > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-xs text-orange-600 font-semibold">Requiere atención inmediata</p>
                {alertas.tareasVencidas.slice(0, 2).map(tarea => (
                  <p key={tarea.id} className="text-xs text-orange-700 truncate">• {tarea.titulo}</p>
                ))}
              </div>
            )}
          </div>

          {/* Oportunidades estancadas */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-yellow-600 rounded-full p-2">
                <TrendingUp className="text-white" size={20} />
              </div>
              <span className="text-3xl font-bold text-yellow-600">{alertas.oportunidadesEstancadas.length}</span>
            </div>
            <h4 className="font-bold text-yellow-900 mb-1">🟡 Oportunidades Estancadas</h4>
            <p className="text-xs text-yellow-700">Sin actividad >30 días</p>
            {alertas.oportunidadesEstancadas.length > 0 && (
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-xs text-yellow-600 font-semibold">Requiere seguimiento</p>
                {alertas.oportunidadesEstancadas.slice(0, 2).map(op => (
                  <p key={op.id} className="text-xs text-yellow-700 truncate">• {op.nombre}</p>
                ))}
              </div>
            )}
          </div>

          {/* Propuestas sin respuesta */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-600 rounded-full p-2">
                <Mail className="text-white" size={20} />
              </div>
              <span className="text-3xl font-bold text-blue-600">{alertas.propuestasSinRespuesta.length}</span>
            </div>
            <h4 className="font-bold text-blue-900 mb-1">🔵 Propuestas Pendientes</h4>
            <p className="text-xs text-blue-700">Sin respuesta >15 días</p>
            {alertas.propuestasSinRespuesta.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-semibold">Hacer seguimiento</p>
                {alertas.propuestasSinRespuesta.slice(0, 2).map(op => (
                  <p key={op.id} className="text-xs text-blue-700 truncate">• {op.nombre}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensaje cuando no hay alertas */}
        {(alertas.leadsAbandonados.length + alertas.oportunidadesEstancadas.length +
          alertas.tareasVencidas.length + alertas.propuestasSinRespuesta.length) === 0 && (
          <div className="text-center py-8 bg-green-50 rounded-lg mt-4">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-xl font-bold text-green-800">¡Todo bajo control!</p>
            <p className="text-green-600">No hay alertas pendientes en este momento</p>
          </div>
        )}
      </div>

      {/* KPIs AVANZADOS - MÉTRICAS DE RENDIMIENTO */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-8 mb-8 border-2 border-purple-500">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp size={28} className="text-purple-600" />
            KPIs de Rendimiento - Métricas Clave
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* KPI 1: Conversión Lead → Oportunidad */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-blue-100 rounded-full p-3">
                <UserPlus className="text-blue-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-blue-600">{kpisAvanzados.conversionLeadOportunidad}%</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Lead → Oportunidad</h4>
            <p className="text-sm text-gray-600">Tasa de conversión de leads calificados</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>📊 Métrica de Calificación</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Conversión Oportunidad → Cliente */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 rounded-full p-3">
                <Target className="text-green-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-green-600">{kpisAvanzados.conversionOportunidadCliente}%</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Oportunidad → Cliente</h4>
            <p className="text-sm text-gray-600">Tasa de cierre de oportunidades</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>🎯 Métrica de Efectividad</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Ciclo Promedio de Venta */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-100 rounded-full p-3">
                <Clock className="text-orange-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-orange-600">{kpisAvanzados.cicloPromedioVenta}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Ciclo de Venta</h4>
            <p className="text-sm text-gray-600">Días promedio hasta cierre</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>⏱️ Métrica de Velocidad</span>
              </div>
            </div>
          </div>

          {/* KPI 4: Valor Promedio de Oportunidad */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 rounded-full p-3">
                <DollarSign className="text-purple-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-purple-600">{formatCurrency(kpisAvanzados.valorPromedioOportunidad)}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Valor Promedio</h4>
            <p className="text-sm text-gray-600">Valor medio por oportunidad</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>💰 Métrica de Ticket</span>
              </div>
            </div>
          </div>

          {/* KPI 5: Tasa de Cierre Exitoso */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-pink-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-pink-100 rounded-full p-3">
                <Award className="text-pink-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-pink-600">{kpisAvanzados.tasaCierreExito}%</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Tasa de Éxito</h4>
            <p className="text-sm text-gray-600">% de cierres ganados vs perdidos</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>🏆 Métrica de Calidad</span>
              </div>
            </div>
          </div>

          {/* KPI 6: Oportunidades Activas */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-shadow border-t-4 border-indigo-500">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-indigo-100 rounded-full p-3">
                <Briefcase className="text-indigo-600" size={24} />
              </div>
              <span className="text-3xl font-bold text-indigo-600">{kpisAvanzados.oportunidadesActivasPromedio}</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Oportunidades Activas</h4>
            <p className="text-sm text-gray-600">En proceso (no cerradas)</p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>📈 Métrica de Pipeline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interpretación de métricas */}
        <div className="mt-6 bg-white rounded-lg p-4 border-l-4 border-purple-500">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Info size={18} className="text-purple-600" />
            Interpretación de Métricas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>• <strong>Conversión Lead→Oportunidad alta:</strong> Buena calificación inicial</div>
            <div>• <strong>Conversión Oportunidad→Cliente alta:</strong> Proceso de venta efectivo</div>
            <div>• <strong>Ciclo de venta corto:</strong> Proceso ágil y eficiente</div>
            <div>• <strong>Valor promedio alto:</strong> Clientes de mayor potencial</div>
            <div>• <strong>Tasa de éxito alta:</strong> Enfoque en oportunidades correctas</div>
            <div>• <strong>Pipeline activo equilibrado:</strong> Flujo de ventas saludable</div>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Pipeline de Ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={oportunidadesPorEtapa}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="etapa" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#3B82F6" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Valor por Etapa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={oportunidadesPorEtapa}
                dataKey="valor"
                nameKey="etapa"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.etapa}: ${formatCurrency(entry.valor)}`}
              >
                {oportunidadesPorEtapa.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
        <h3 className="text-xl font-semibold text-blue-900 mb-4">Actividad Reciente</h3>
        {interaccionesRecientes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay interacciones registradas</p>
        ) : (
          <div className="space-y-3">
            {interaccionesRecientes.map(interaccion => (
              <div key={interaccion.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl">
                  {interaccion.tipo === 'llamada' && '📞'}
                  {interaccion.tipo === 'email' && '📧'}
                  {interaccion.tipo === 'reunion' && '🤝'}
                  {interaccion.tipo === 'mensaje' && '💬'}
                  {interaccion.tipo === 'otro' && '📝'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{interaccion.clienteNombre}</p>
                  <p className="text-sm text-gray-600">{interaccion.notas || 'Sin notas'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{interaccion.usuarioNombre}</p>
                  <p className="text-xs text-gray-400">{new Date(interaccion.fecha).toLocaleDateString('es-MX')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    pais: 'MX',
    identificadorFiscal: '',
    direccion: '',
    telefono: '',
    email: '',
    sitioWeb: '',
    logo: '',
    colorPrimario: '#ff6b35',
    colorSecundario: '#004e89',
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
      colorPrimario: empresa.colorPrimario || '#ff6b35',
      colorSecundario: empresa.colorSecundario || '#004e89',
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El logo debe ser menor a 5MB');
        return;
      }

      try {
        // Subir a Firebase Storage
        const fileName = `logos/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const logoURL = await getDownloadURL(storageRef);

        setFormData({...formData, logo: logoURL});
        alert('Logo cargado exitosamente');
      } catch (error) {
        console.error('Error subiendo logo:', error);
        alert('Error al cargar el logo: ' + error.message);
      }
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
      colorPrimario: '#ff6b35',
      colorSecundario: '#004e89',
      activa: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleExport = () => {
    const dataToExport = empresas.map(empresa => ({
      Nombre: empresa.nombre,
      País: empresa.pais,
      'ID Fiscal': empresa.identificadorFiscal,
      Dirección: empresa.direccion,
      Teléfono: empresa.telefono,
      Email: empresa.email,
      'Sitio Web': empresa.sitioWeb,
      Activa: empresa.activa ? 'Sí' : 'No'
    }));
    exportToExcel(dataToExport, 'Empresas');
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Empresas</h2>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-all"
              title="Exportar a Excel"
            >
              <Download size={24} />
              <span className="text-xl">Exportar</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              {showForm ? <X size={24} /> : <Plus size={24} />}
              <span className="text-xl">{showForm ? 'Cancelar' : 'Nueva Empresa'}</span>
            </button>
          </div>
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
                <div className="flex gap-2 items-start">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                  />
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, logo: ''})}
                      className="px-4 py-3 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-lg font-semibold transition-colors"
                    >
                      ✕ Quitar
                    </button>
                  )}
                </div>
                {formData.logo && (
                  <div className="mt-2">
                    <img src={formData.logo} alt="Logo preview" className="h-16 w-auto object-contain border border-gray-200 rounded p-2" />
                  </div>
                )}
              </div>

              {/* Color Primario */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Color Primario</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({...formData, colorPrimario: e.target.value})}
                    className="h-12 w-24 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({...formData, colorPrimario: e.target.value})}
                    className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    placeholder="#ff6b35"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              {/* Color Secundario */}
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Color Secundario</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.colorSecundario}
                    onChange={(e) => setFormData({...formData, colorSecundario: e.target.value})}
                    className="h-12 w-24 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.colorSecundario}
                    onChange={(e) => setFormData({...formData, colorSecundario: e.target.value})}
                    className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    placeholder="#004e89"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
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
        ) : (
          <>
            {/* Búsqueda */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, país, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
              />
            </div>

            {empresas.filter(empresa =>
              empresa.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              empresa.pais?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              empresa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              empresa.identificadorFiscal?.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No se encontraron empresas con "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-600 font-semibold hover:text-blue-700"
                >
                  Limpiar búsqueda
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
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Tema</th>
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresas.filter(empresa =>
                      empresa.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      empresa.pais?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      empresa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      empresa.identificadorFiscal?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(empresa => {
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
                        <div className="flex gap-2 items-center">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded border-2 border-gray-300"
                                style={{backgroundColor: empresa.colorPrimario || '#ff6b35'}}
                                title="Color Primario"
                              ></div>
                              <span className="text-xs text-gray-500">{empresa.colorPrimario || '#ff6b35'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded border-2 border-gray-300"
                                style={{backgroundColor: empresa.colorSecundario || '#004e89'}}
                                title="Color Secundario"
                              ></div>
                              <span className="text-xs text-gray-500">{empresa.colorSecundario || '#004e89'}</span>
                            </div>
                          </div>
                        </div>
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
          </>
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
    equipoId: '',
    password: '',
    activo: true,
    permisos: {
      dashboard: { ver: true },
      leads: { ver: true, crear: true, editar: 'propios', eliminar: false },
      oportunidades: { ver: true, crear: true, editar: 'propios', eliminar: false },
      clientes: { ver: true, crear: true, editar: 'propios', eliminar: false },
      interacciones: { ver: true, crear: true, editar: 'propios', eliminar: false },
      tareas: { ver: true, crear: true, editar: 'propios', eliminar: false },
      calendario: { ver: true },
      proyectos: { ver: true, crear: false, editar: false, eliminar: false },
      empresas: { ver: false, crear: false, editar: false, eliminar: false },
      usuarios: { ver: false, crear: false, editar: false, eliminar: false },
      reportes: { ver: true },
      configuracion: { ver: false, editar: false }
    }
  });

  const roles = [
    { value: 'administrador', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
    { value: 'gerente', label: 'Gerente', color: 'bg-blue-100 text-blue-800' },
    { value: 'ejecutivo', label: 'Ejecutivo', color: 'bg-green-100 text-green-800' },
    { value: 'invitado', label: 'Invitado', color: 'bg-gray-100 text-gray-800' }
  ];

  // Permisos predeterminados por rol
  const getPermisosporRol = (rol) => {
    switch(rol) {
      case 'administrador':
        return {
          dashboard: { ver: true },
          leads: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          oportunidades: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          clientes: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          interacciones: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          tareas: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          calendario: { ver: true },
          proyectos: { ver: 'todos', crear: true, editar: 'todos', eliminar: true },
          empresas: { ver: true, crear: true, editar: true, eliminar: true },
          usuarios: { ver: true, crear: true, editar: true, eliminar: true },
          reportes: { ver: true },
          configuracion: { ver: true, editar: true }
        };
      case 'gerente':
        return {
          dashboard: { ver: true },
          leads: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          oportunidades: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          clientes: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          interacciones: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          tareas: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          calendario: { ver: true },
          proyectos: { ver: 'equipo', crear: true, editar: 'equipo', eliminar: false },
          empresas: { ver: true, crear: false, editar: false, eliminar: false },
          usuarios: { ver: 'equipo', crear: false, editar: false, eliminar: false },
          reportes: { ver: true },
          configuracion: { ver: false, editar: false }
        };
      case 'ejecutivo':
        return {
          dashboard: { ver: true },
          leads: { ver: 'propios', crear: true, editar: 'propios', eliminar: false },
          oportunidades: { ver: 'propios', crear: true, editar: 'propios', eliminar: false },
          clientes: { ver: 'propios', crear: true, editar: 'propios', eliminar: false },
          interacciones: { ver: 'propios', crear: true, editar: 'propios', eliminar: false },
          tareas: { ver: 'propios', crear: true, editar: 'propios', eliminar: false },
          calendario: { ver: true },
          proyectos: { ver: 'propios', crear: false, editar: 'propios', eliminar: false },
          empresas: { ver: true, crear: false, editar: false, eliminar: false },
          usuarios: { ver: false, crear: false, editar: false, eliminar: false },
          reportes: { ver: false },
          configuracion: { ver: false, editar: false }
        };
      case 'invitado':
        return {
          dashboard: { ver: true },
          leads: { ver: false, crear: false, editar: false, eliminar: false },
          oportunidades: { ver: false, crear: false, editar: false, eliminar: false },
          clientes: { ver: 'propios', crear: false, editar: false, eliminar: false },
          interacciones: { ver: 'propios', crear: false, editar: false, eliminar: false },
          tareas: { ver: 'propios', crear: false, editar: 'propios', eliminar: false },
          calendario: { ver: true },
          proyectos: { ver: false, crear: false, editar: false, eliminar: false },
          empresas: { ver: false, crear: false, editar: false, eliminar: false },
          usuarios: { ver: false, crear: false, editar: false, eliminar: false },
          reportes: { ver: false },
          configuracion: { ver: false, editar: false }
        };
      default:
        return formData.permisos;
    }
  };

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

  const crearUsuariosPrueba = async () => {
    if (!window.confirm('¿Crear 4 usuarios de prueba? (Admin, Gerente, Ejecutivo, Invitado)')) return;

    try {
      const usuariosPrueba = [
        {
          nombre: "Carlos Admin",
          email: "admin@grx.com",
          telefono: "+52-555-0001",
          rol: "administrador",
          empresaId: "",
          equipoId: "",
          activo: true,
          fechaCreacion: new Date().toISOString(),
          permisos: getPermisosporRol('administrador')
        },
        {
          nombre: "María Gerente",
          email: "gerente@grx.com",
          telefono: "+52-555-0002",
          rol: "gerente",
          empresaId: "",
          equipoId: "equipo-ventas",
          activo: true,
          fechaCreacion: new Date().toISOString(),
          permisos: getPermisosporRol('gerente')
        },
        {
          nombre: "Juan Ejecutivo",
          email: "ejecutivo@grx.com",
          telefono: "+52-555-0003",
          rol: "ejecutivo",
          empresaId: "",
          equipoId: "equipo-ventas",
          activo: true,
          fechaCreacion: new Date().toISOString(),
          permisos: getPermisosporRol('ejecutivo')
        },
        {
          nombre: "Ana Invitada",
          email: "invitado@grx.com",
          telefono: "+52-555-0004",
          rol: "invitado",
          empresaId: "",
          equipoId: "",
          activo: true,
          fechaCreacion: new Date().toISOString(),
          permisos: getPermisosporRol('invitado')
        }
      ];

      for (const usuario of usuariosPrueba) {
        await addDoc(collection(db, 'usuarios'), usuario);
      }

      alert('✅ 4 usuarios de prueba creados en Firestore!\n\nEmails:\n- admin@grx.com\n- gerente@grx.com\n- ejecutivo@grx.com\n- invitado@grx.com\n\nNOTA: Debes crear estos usuarios en Firebase Auth manualmente con sus passwords.');
      loadData();
    } catch (error) {
      console.error('Error creando usuarios:', error);
      alert('Error creando usuarios: ' + error.message);
    }
  };

  const getRolData = (rolValue) => {
    return roles.find(r => r.value === rolValue) || roles[2];
  };

  const handleExport = () => {
    const dataToExport = usuarios.map(usuario => ({
      Nombre: usuario.nombre,
      Email: usuario.email,
      Teléfono: usuario.telefono,
      Rol: usuario.rol,
      Empresa: getEmpresaNombre(usuario.empresaId),
      Activo: usuario.activo ? 'Sí' : 'No'
    }));
    exportToExcel(dataToExport, 'Usuarios');
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Usuarios y Roles</h2>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-all"
            >
              <Download size={24} />
              <span className="text-xl">Exportar</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              {showForm ? <X size={24} /> : <Plus size={24} />}
              <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Usuario'}</span>
            </button>
            <button
              onClick={crearUsuariosPrueba}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <Users size={24} />
              <span className="text-xl">Crear Usuarios de Prueba</span>
            </button>
          </div>
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

// Módulo Leads (Primer contacto - Sin calificar)
function LeadsModule({ currentUser }) {
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]); // Todos los leads sin filtrar
  const [oportunidades, setOportunidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [interacciones, setInteracciones] = useState([]); // Para IA Predictiva
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    empresaLead: '',
    email: '',
    telefono: '',
    cargo: '',
    origen: 'web',
    estado: 'nuevo',
    // Calificación BANT
    presupuesto: '',
    autoridad: 'bajo',
    necesidad: '',
    timeline: '',
    scoring: 0,
    notas: '',
    crearComoCliente: false
  });

  const origenes = [
    { value: 'web', label: 'Sitio Web', icon: '🌐' },
    { value: 'referido', label: 'Referido', icon: '👥' },
    { value: 'evento', label: 'Evento', icon: '🎪' },
    { value: 'cold_call', label: 'Cold Call', icon: '📞' },
    { value: 'email', label: 'Email Marketing', icon: '📧' },
    { value: 'redes', label: 'Redes Sociales', icon: '📱' },
    { value: 'otro', label: 'Otro', icon: '📝' }
  ];

  const estados = [
    { value: 'nuevo', label: 'Nuevo', color: 'bg-blue-100 text-blue-800' },
    { value: 'contactado', label: 'Contactado', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'calificado', label: 'Calificado', color: 'bg-green-100 text-green-800' },
    { value: 'descalificado', label: 'Descalificado', color: 'bg-red-100 text-red-800' },
    { value: 'convertido', label: 'Convertido', color: 'bg-purple-100 text-purple-800' }
  ];

  const nivelesAutoridad = [
    { value: 'bajo', label: 'Bajo - Sin poder de decisión' },
    { value: 'medio', label: 'Medio - Influenciador' },
    { value: 'alto', label: 'Alto - Tomador de decisiones' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsSnap, oportunidadesSnap, usuariosSnap, interaccionesSnap] = await Promise.all([
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'interacciones'))
      ]);

      const todosLeads = leadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLeads(todosLeads);

      // Aplicar filtros según permisos del usuario
      let leadsFiltrados = todosLeads;
      const permisoVer = currentUser?.permisos?.leads?.ver;

      if (permisoVer === 'propios') {
        // Solo ver los leads asignados a este usuario
        leadsFiltrados = todosLeads.filter(lead => lead.asignadoA === currentUser.id);
      } else if (permisoVer === 'equipo') {
        // Ver los leads de su equipo
        const usuariosEquipo = usuariosSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.equipoId === currentUser.equipoId)
          .map(u => u.id);
        leadsFiltrados = todosLeads.filter(lead => usuariosEquipo.includes(lead.asignadoA));
      } else if (permisoVer === 'todos' || permisoVer === true) {
        // Ver todos los leads
        leadsFiltrados = todosLeads;
      } else if (permisoVer === false) {
        // Sin permiso para ver leads
        leadsFiltrados = [];
      }

      setLeads(leadsFiltrados);
      setOportunidades(oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsuarios(usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setInteracciones(interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error cargando leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularScoring = (data) => {
    let score = 0;

    // Presupuesto (0-30 puntos)
    if (data.presupuesto) {
      const presupuesto = parseFloat(data.presupuesto);
      if (presupuesto > 100000) score += 30;
      else if (presupuesto > 50000) score += 20;
      else if (presupuesto > 10000) score += 10;
    }

    // Autoridad (0-30 puntos)
    if (data.autoridad === 'alto') score += 30;
    else if (data.autoridad === 'medio') score += 15;

    // Necesidad (0-20 puntos)
    if (data.necesidad && data.necesidad.length > 20) score += 20;
    else if (data.necesidad) score += 10;

    // Timeline (0-20 puntos)
    if (data.timeline) {
      if (data.timeline.includes('inmediato') || data.timeline.includes('urgente')) score += 20;
      else if (data.timeline.includes('mes')) score += 15;
      else score += 10;
    }

    return score;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const scoring = calcularScoring(formData);
      const dataToSave = { ...formData, scoring, fechaCreacion: new Date().toISOString() };

      if (editingId) {
        await updateDoc(doc(db, 'leads', editingId), dataToSave);
        alert('Lead actualizado exitosamente!');
      } else {
        // Crear nuevo lead
        const leadRef = await addDoc(collection(db, 'leads'), dataToSave);

        // Crear tarea automática: Contactar lead en 24 horas
        const fechaVencimiento = new Date();
        fechaVencimiento.setHours(fechaVencimiento.getHours() + 24);

        await addDoc(collection(db, 'tareas'), {
          titulo: `Contactar lead: ${formData.nombre}`,
          descripcion: `Hacer primer contacto con el lead ${formData.nombre} de ${formData.empresaLead || 'empresa sin especificar'}. Email: ${formData.email}, Teléfono: ${formData.telefono || 'No especificado'}`,
          prioridad: 'alta',
          estado: 'pendiente',
          fechaCreacion: new Date().toISOString(),
          fechaVencimiento: fechaVencimiento.toISOString(),
          responsable: formData.responsable || 'Sin asignar',
          relacionadoCon: 'lead',
          relacionadoId: leadRef.id,
          relacionadoNombre: formData.nombre
        });

        // Si está marcado "Crear como Cliente", crear el cliente también
        if (formData.crearComoCliente) {
          await addDoc(collection(db, 'clientes'), {
            nombre: formData.nombre,
            empresaNombre: formData.empresaLead,
            email: formData.email,
            telefono: formData.telefono || '',
            cargo: formData.cargo || '',
            industria: '',
            ubicacion: '',
            etiquetas: 'Lead',
            notas: `Cliente creado automáticamente junto con el lead.\n\nOrigen: ${formData.origen}\nNotas del lead: ${formData.notas}`,
            activo: true,
            fechaCreacion: new Date().toISOString(),
            origenLeadId: leadRef.id
          });
          alert('✅ Lead creado exitosamente!\n\n✓ Lead registrado\n✓ Cliente creado\n✓ Tarea generada: Contactar en 24 horas');
        } else {
          alert('Lead creado exitosamente! Se ha generado una tarea automática para contactarlo.');
        }
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando lead:', error);
      alert('Error guardando lead: ' + error.message);
    }
  };

  const handleConvertToOportunidad = async (lead) => {
    if (!lead.presupuesto || !lead.necesidad) {
      alert('Completa la calificación BANT antes de convertir a oportunidad');
      return;
    }

    try {
      // PASO 1: Crear el cliente primero
      const clienteRef = await addDoc(collection(db, 'clientes'), {
        nombre: lead.nombre,
        empresaNombre: lead.empresaLead,
        email: lead.email,
        telefono: lead.telefono || '',
        cargo: lead.cargo || '',
        industria: '',
        ubicacion: '',
        etiquetas: 'Prospecto Calificado',
        notas: `Cliente creado automáticamente desde Lead convertido.\n\nOrigen: ${lead.origen}\nCalificación BANT:\n- Presupuesto: $${lead.presupuesto}\n- Autoridad: ${lead.autoridad}\n- Necesidad: ${lead.necesidad}\n- Timeline: ${lead.timeline}\n\nNotas originales: ${lead.notas}`,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        origenLeadId: lead.id
      });

      // PASO 2: Crear oportunidad vinculada al cliente
      const oportunidadRef = await addDoc(collection(db, 'oportunidades'), {
        nombre: `Oportunidad - ${lead.empresaLead || lead.nombre}`,
        clienteId: clienteRef.id,
        empresaId: lead.empresaId || '',
        usuarioResponsableId: lead.asignadoA || currentUser?.id || '',
        valor: parseFloat(lead.presupuesto) || 0,
        probabilidad: lead.scoring,
        etapa: 'Contacto Inicial',
        fechaEstimadaCierre: '',
        origen: lead.origen,
        notas: `Convertido desde Lead.\n\nCalificación BANT:\n- Presupuesto: $${lead.presupuesto}\n- Autoridad: ${lead.autoridad}\n- Necesidad: ${lead.necesidad}\n- Timeline: ${lead.timeline}\n\nNotas originales: ${lead.notas}`,
        fechaCreacion: new Date().toISOString(),
        leadId: lead.id
      });

      // Actualizar lead como convertido
      await updateDoc(doc(db, 'leads', lead.id), {
        estado: 'convertido',
        fechaConversion: new Date().toISOString()
      });

      // Crear tarea automática: Enviar propuesta comercial
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 3); // 3 días

      await addDoc(collection(db, 'tareas'), {
        titulo: `Enviar propuesta comercial: ${lead.empresaLead}`,
        descripcion: `Preparar y enviar propuesta comercial a ${lead.nombre} (${lead.empresaLead}).\n\nPresupuesto estimado: $${lead.presupuesto}\nNecesidad: ${lead.necesidad}\nTimeline: ${lead.timeline}\n\nContacto: ${lead.email}`,
        prioridad: 'alta',
        estado: 'pendiente',
        fechaCreacion: new Date().toISOString(),
        fechaVencimiento: fechaVencimiento.toISOString(),
        responsable: lead.responsable || 'Sin asignar',
        relacionadoCon: 'oportunidad',
        relacionadoId: oportunidadRef.id,
        relacionadoNombre: `Oportunidad - ${lead.empresaLead}`
      });

      alert('✅ ¡Lead convertido exitosamente!\n\n✓ Cliente creado\n✓ Oportunidad creada en Pipeline\n✓ Tarea generada: Enviar propuesta comercial');
      setShowConvertModal(null);
      loadData();
    } catch (error) {
      console.error('Error convirtiendo lead:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (lead) => {
    setFormData({ ...lead });
    setEditingId(lead.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este lead?')) {
      try {
        await deleteDoc(doc(db, 'leads', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando lead:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      empresaLead: '',
      email: '',
      telefono: '',
      cargo: '',
      origen: 'web',
      estado: 'nuevo',
      presupuesto: '',
      autoridad: 'bajo',
      necesidad: '',
      timeline: '',
      scoring: 0,
      notas: '',
      crearComoCliente: false
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-lg text-gray-600">Cargando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 lg:p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold flex items-center gap-3">
              <UserPlus size={36} />
              Leads
            </h2>
            <p className="text-blue-100 mt-2">Primer contacto - Califica y convierte en oportunidades</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-700 px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all text-base lg:text-xl"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            <span>{showForm ? 'Cancelar' : 'Nuevo Lead'}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-4 lg:p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-xl lg:text-2xl font-semibold mb-6 text-blue-700">
            {editingId ? 'Editar Lead' : 'Nuevo Lead'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Nombre Contacto *</label>
                <input
                  required
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Empresa *</label>
                <input
                  required
                  type="text"
                  value={formData.empresaLead}
                  onChange={(e) => setFormData({...formData, empresaLead: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Email *</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Cargo</label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="Director de TI"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Origen *</label>
                <select
                  value={formData.origen}
                  onChange={(e) => setFormData({...formData, origen: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                >
                  {origenes.map(origen => (
                    <option key={origen.value} value={origen.value}>
                      {origen.icon} {origen.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                >
                  {estados.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </div>

              {/* Calificación BANT */}
              <div className="col-span-1 lg:col-span-2 border-t-2 border-orange-200 pt-6 mt-4">
                <h4 className="text-lg lg:text-xl font-bold text-orange-600 mb-4">📊 Calificación BANT</h4>
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">💰 Budget (Presupuesto Estimado)</label>
                <input
                  type="number"
                  value={formData.presupuesto}
                  onChange={(e) => setFormData({...formData, presupuesto: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">👤 Authority (Nivel de Autoridad)</label>
                <select
                  value={formData.autoridad}
                  onChange={(e) => setFormData({...formData, autoridad: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                >
                  {nivelesAutoridad.map(nivel => (
                    <option key={nivel.value} value={nivel.value}>{nivel.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">🎯 Need (Necesidad del Cliente)</label>
                <textarea
                  value={formData.necesidad}
                  onChange={(e) => setFormData({...formData, necesidad: e.target.value})}
                  rows={3}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="Describe la necesidad o problema del cliente..."
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">⏰ Timeline (Timeframe de Decisión)</label>
                <input
                  type="text"
                  value={formData.timeline}
                  onChange={(e) => setFormData({...formData, timeline: e.target.value})}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                  placeholder="En 2-3 meses, este trimestre, inmediato..."
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  rows={3}
                  className="w-full px-3 lg:px-4 py-2 lg:py-3 text-base lg:text-lg border border-gray-300 rounded-md"
                />
              </div>

              {!editingId && (
                <div className="col-span-1 lg:col-span-2 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.crearComoCliente}
                      onChange={(e) => setFormData({...formData, crearComoCliente: e.target.checked})}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-base lg:text-lg font-semibold text-green-900">
                      ✅ Crear también como Cliente (evita volver a teclear la información)
                    </span>
                  </label>
                  <p className="text-sm text-green-700 ml-8 mt-1">
                    Recomendado si ya es un prospecto calificado que se agregará al CRM
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all text-base lg:text-lg"
              >
                <Save size={20} />
                {editingId ? 'Actualizar' : 'Crear'} Lead
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 lg:px-6 py-2 lg:py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all text-base lg:text-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de Leads */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {leads.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-500">No hay leads registrados</p>
            <p className="text-gray-400 mt-2">Crea tu primer lead para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">Lead</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">Contacto</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">Origen</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">BANT</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-2">
                      <Award size={20} className="text-purple-600" />
                      <span>IA Score</span>
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700 bg-gradient-to-r from-pink-50 to-purple-50">Siguiente Acción</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const origenInfo = origenes.find(o => o.value === lead.origen) || origenes[0];
                  const estadoInfo = estados.find(e => e.value === lead.estado) || estados[0];

                  // IA Predictiva
                  const leadConFuente = { ...lead, fuente: lead.origen, empresa: lead.empresaLead };
                  const aiScore = calcularLeadScore(leadConFuente, interacciones);
                  const siguienteAccion = recomendarSiguienteAccion(leadConFuente, 'lead', interacciones);

                  return (
                    <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="font-semibold text-base lg:text-lg text-gray-900">{lead.nombre}</div>
                        <div className="text-sm text-gray-600">{lead.empresaLead}</div>
                        {lead.cargo && <div className="text-xs text-gray-500">{lead.cargo}</div>}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm">
                        <div className="text-gray-900">{lead.email}</div>
                        <div className="text-gray-600">{lead.telefono}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className="text-lg">{origenInfo.icon}</span>
                        <span className="ml-2 text-sm lg:text-base text-gray-700">{origenInfo.label}</span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-semibold ${estadoInfo.color}`}>
                          {estadoInfo.label}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          <Target size={16} className={lead.scoring >= 70 ? 'text-green-600' : lead.scoring >= 40 ? 'text-yellow-600' : 'text-red-600'} />
                          <span className={`font-bold text-base ${lead.scoring >= 70 ? 'text-green-600' : lead.scoring >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {lead.scoring || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-center gap-2">
                          <Award size={18} className={aiScore >= 70 ? 'text-green-600' : aiScore >= 40 ? 'text-yellow-600' : 'text-red-600'} />
                          <span className={`font-bold text-lg ${aiScore >= 70 ? 'text-green-600' : aiScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {aiScore}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {aiScore >= 70 ? '🔥 HOT' : aiScore >= 40 ? '⚡ WARM' : '❄️ COLD'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 bg-gradient-to-r from-pink-50 to-purple-50">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{siguienteAccion.icono}</span>
                            <span className="font-semibold text-sm text-gray-900">{siguienteAccion.accion}</span>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded inline-block ${
                            siguienteAccion.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                            siguienteAccion.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Prioridad: {siguienteAccion.prioridad.toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-600 italic">{siguienteAccion.razon}</div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex gap-2 flex-wrap">
                          {lead.estado !== 'convertido' && lead.estado !== 'descalificado' && (
                            <button
                              onClick={() => setShowConvertModal(lead)}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                              title="Convertir a Oportunidad"
                            >
                              <ArrowRight size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(lead)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
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

      {/* Modal de Conversión */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConvertModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRight className="text-green-600" size={28} />
                Convertir a Oportunidad
              </h3>
              <button onClick={() => setShowConvertModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={28} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="font-semibold text-blue-900">{showConvertModal.nombre}</p>
                <p className="text-blue-700">{showConvertModal.empresaLead}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Presupuesto</p>
                  <p className="text-lg font-semibold">${showConvertModal.presupuesto || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scoring</p>
                  <p className="text-lg font-semibold text-green-600">{showConvertModal.scoring || 0}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Autoridad</p>
                  <p className="text-base capitalize">{showConvertModal.autoridad}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Timeline</p>
                  <p className="text-base">{showConvertModal.timeline || 'No especificado'}</p>
                </div>
              </div>

              {showConvertModal.necesidad && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Necesidad</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900">{showConvertModal.necesidad}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleConvertToOportunidad(showConvertModal)}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={20} />
                  Convertir a Oportunidad
                </button>
                <button
                  onClick={() => setShowConvertModal(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Clientes
function ClientesModule({ currentUser }) {
  const [clientes, setClientes] = useState([]);
  const [allClientes, setAllClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [show360View, setShow360View] = useState(null);
  const [leads, setLeads] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [interacciones, setInteracciones] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    empresaCliente: '',
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

      // Cargar todos los datos para la vista 360°
      const [
        clientesSnapshot,
        empresasSnapshot,
        leadsSnapshot,
        oportunidadesSnapshot,
        interaccionesSnapshot,
        tareasSnapshot,
        proyectosSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'empresas')),
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'interacciones')),
        getDocs(collection(db, 'tareas')),
        getDocs(collection(db, 'proyectos'))
      ]);

      const todosClientes = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllClientes(todosClientes);

      // Aplicar filtros según permisos
      let clientesFiltrados = todosClientes;
      const permisoVer = currentUser?.permisos?.clientes?.ver;

      if (permisoVer === 'propios') {
        // Solo ver clientes creados por este usuario o asignados a él
        clientesFiltrados = todosClientes.filter(c =>
          c.creadoPor === currentUser.id || c.asignadoA === currentUser.id
        );
      } else if (permisoVer === 'equipo') {
        // Ver clientes del equipo (necesitamos cargar usuarios)
        const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
        const usuariosEquipo = usuariosSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.equipoId === currentUser.equipoId)
          .map(u => u.id);
        clientesFiltrados = todosClientes.filter(c =>
          usuariosEquipo.includes(c.creadoPor) || usuariosEquipo.includes(c.asignadoA)
        );
      } else if (permisoVer === 'todos' || permisoVer === true) {
        clientesFiltrados = todosClientes;
      } else if (permisoVer === false) {
        clientesFiltrados = [];
      }

      setClientes(clientesFiltrados);
      setEmpresas(empresasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLeads(leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setOportunidades(oportunidadesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setInteracciones(interaccionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTareas(tareasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setProyectos(proyectosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      empresaCliente: cliente.empresaCliente || '',
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
      empresaCliente: '',
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

  const handleExport = () => {
    const dataToExport = clientes.map(cliente => ({
      'Contacto': cliente.nombre,
      'Empresa del Cliente': cliente.empresaCliente || 'Sin empresa',
      'Empresa Interna Asignada': getEmpresaNombre(cliente.empresaId),
      'Email': cliente.email,
      'Teléfono': cliente.telefono,
      'Cargo': cliente.cargo,
      'Industria': cliente.industria,
      'Ubicación': cliente.ubicacion,
      'Etiquetas': Array.isArray(cliente.etiquetas) ? cliente.etiquetas.join(', ') : '',
      'Activo': cliente.activo ? 'Sí' : 'No'
    }));
    exportToExcel(dataToExport, 'Clientes');
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold">Clientes</h2>
            <p className="text-blue-200 text-sm mt-2">Gestiona los contactos de las empresas que te contratarán</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-all"
            >
              <Download size={24} />
              <span className="text-xl">Exportar</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              {showForm ? <X size={24} /> : <Plus size={24} />}
              <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Cliente'}</span>
            </button>
          </div>
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
                <label className="block text-lg font-medium text-gray-700 mb-2">Nombre del Contacto *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Empresa del Cliente (que contratará) *</label>
                <input
                  type="text"
                  required
                  value={formData.empresaCliente}
                  onChange={(e) => setFormData({...formData, empresaCliente: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                  placeholder="Ej: Google, Microsoft, Walmart..."
                />
                <p className="text-sm text-gray-500 mt-1">Nombre de la empresa externa a la que pertenece este contacto</p>
              </div>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Empresa Interna Asignada</label>
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
                <p className="text-sm text-gray-500 mt-1">Tu empresa interna que atenderá este cliente (opcional)</p>
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
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Contacto</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Empresa (Cliente)</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Cargo</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Industria</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Etiquetas</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700 bg-gradient-to-r from-red-50 to-orange-50">
                    <div className="flex items-center gap-2">
                      <Info size={18} className="text-red-600" />
                      <span>Riesgo Churn</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700 bg-gradient-to-r from-orange-50 to-red-50">Siguiente Acción</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => {
                  // IA Predictiva
                  const riesgoChurn = calcularRiesgoChurn(cliente, interacciones);
                  const siguienteAccion = recomendarSiguienteAccion(cliente, 'cliente', interacciones);

                  return (
                  <tr key={cliente.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-lg text-gray-900 font-medium">{cliente.nombre}</td>
                    <td className="px-6 py-4 text-lg">
                      <span className="font-semibold text-blue-900">{cliente.empresaCliente || 'Sin empresa'}</span>
                      {cliente.empresaId && (
                        <p className="text-xs text-gray-500 mt-1">Asignado: {getEmpresaNombre(cliente.empresaId)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.email}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.cargo || '-'}</td>
                    <td className="px-6 py-4 text-lg text-gray-600">{cliente.industria || '-'}</td>
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
                    <td className="px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Info size={18} className={riesgoChurn >= 70 ? 'text-red-600' : riesgoChurn >= 40 ? 'text-orange-600' : 'text-green-600'} />
                          <span className={`font-bold text-lg ${riesgoChurn >= 70 ? 'text-red-600' : riesgoChurn >= 40 ? 'text-orange-600' : 'text-green-600'}`}>
                            {riesgoChurn}
                          </span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded inline-block font-semibold ${
                          riesgoChurn >= 70 ? 'bg-red-100 text-red-800' :
                          riesgoChurn >= 40 ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {riesgoChurn >= 70 ? '🚨 ALTO RIESGO' : riesgoChurn >= 40 ? '⚠️ RIESGO MEDIO' : '✅ SALUDABLE'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{siguienteAccion.icono}</span>
                          <span className="font-semibold text-sm text-gray-900">{siguienteAccion.accion}</span>
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded inline-block ${
                          siguienteAccion.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                          siguienteAccion.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {siguienteAccion.prioridad.toUpperCase()}
                        </div>
                      </div>
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
                          onClick={() => setShow360View(cliente)}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-all font-semibold"
                          title="Ver historial completo 360°"
                        >
                          360°
                        </button>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Vista 360° */}
      {show360View && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShow360View(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-semibold uppercase tracking-wide mb-1">Contacto</p>
                  <h2 className="text-3xl font-bold mb-2">{show360View.nombre}</h2>
                  <p className="text-purple-100 text-lg">
                    <span className="font-semibold">{show360View.empresaCliente || 'Sin empresa'}</span> • {show360View.email}
                  </p>
                </div>
                <button onClick={() => setShow360View(null)} className="text-white hover:text-gray-200">
                  <X size={32} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del Contacto */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCircle size={24} className="text-purple-600" />
                  Información del Contacto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Empresa del Cliente</p>
                    <p className="text-lg font-bold text-blue-900">{show360View.empresaCliente || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cargo en la empresa</p>
                    <p className="text-lg font-semibold">{show360View.cargo || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="text-lg font-semibold">{show360View.telefono || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Empresa Interna Asignada</p>
                    <p className="text-lg font-semibold">{getEmpresaNombre(show360View.empresaId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Industria</p>
                    <p className="text-lg font-semibold">{show360View.industria || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="text-lg font-semibold">{show360View.ubicacion || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado del contacto</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${show360View.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {show360View.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historial Lead → Oportunidad → Cliente */}
              {(() => {
                const leadRelacionado = leads.find(l => l.email === show360View.email);
                const oportunidadesRelacionadas = oportunidades.filter(o =>
                  o.clienteEmail === show360View.email ||
                  o.clienteIdFinal === show360View.id ||
                  (leadRelacionado && o.leadId === leadRelacionado.id)
                );

                if (leadRelacionado || oportunidadesRelacionadas.length > 0) {
                  return (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={24} className="text-blue-600" />
                        Historial de Conversión
                      </h3>
                      <div className="flex items-center gap-4">
                        {leadRelacionado && (
                          <div className="flex-1 bg-white rounded-lg p-4 border-2 border-blue-300">
                            <div className="flex items-center gap-2 mb-2">
                              <UserPlus size={20} className="text-blue-600" />
                              <h4 className="font-bold text-blue-900">Lead</h4>
                            </div>
                            <p className="text-sm text-gray-600">Origen: {leadRelacionado.origen}</p>
                            <p className="text-sm text-gray-600">Scoring: {leadRelacionado.scoring}/100</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(leadRelacionado.fechaCreacion).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        )}
                        {leadRelacionado && oportunidadesRelacionadas.length > 0 && (
                          <ArrowRight size={24} className="text-gray-400" />
                        )}
                        {oportunidadesRelacionadas.length > 0 && (
                          <div className="flex-1 bg-white rounded-lg p-4 border-2 border-green-300">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign size={20} className="text-green-600" />
                              <h4 className="font-bold text-green-900">Oportunidades ({oportunidadesRelacionadas.length})</h4>
                            </div>
                            <p className="text-sm text-gray-600">
                              Valor total: ${oportunidadesRelacionadas.reduce((sum, o) => sum + (o.valor || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Ganadas: {oportunidadesRelacionadas.filter(o => o.etapa === 'Cerrado Ganado').length}
                            </p>
                          </div>
                        )}
                        {oportunidadesRelacionadas.some(o => o.convertidoACliente) && (
                          <>
                            <ArrowRight size={24} className="text-gray-400" />
                            <div className="flex-1 bg-white rounded-lg p-4 border-2 border-purple-300">
                              <div className="flex items-center gap-2 mb-2">
                                <UserCircle size={20} className="text-purple-600" />
                                <h4 className="font-bold text-purple-900">Cliente</h4>
                              </div>
                              <p className="text-sm text-gray-600">Estado: {show360View.activo ? 'Activo' : 'Inactivo'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {show360View.fechaCreacion ? new Date(show360View.fechaCreacion).toLocaleDateString('es-MX') : 'Fecha no disponible'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Interacciones */}
              {(() => {
                const interaccionesCliente = interacciones.filter(i =>
                  i.clienteId === show360View.id ||
                  i.clienteEmail === show360View.email
                );

                if (interaccionesCliente.length > 0) {
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Phone size={24} className="text-orange-600" />
                        Interacciones ({interaccionesCliente.length})
                      </h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {interaccionesCliente.slice(0, 10).map(interaccion => (
                          <div key={interaccion.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-orange-500">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold capitalize">{interaccion.tipo}</span>
                              <span className="text-sm text-gray-500">
                                {new Date(interaccion.fecha).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                            {interaccion.notas && (
                              <p className="text-sm text-gray-600 line-clamp-2">{interaccion.notas}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Tareas */}
              {(() => {
                const tareasCliente = tareas.filter(t =>
                  t.relacionadoId === show360View.id ||
                  t.relacionadoNombre?.includes(show360View.nombre) ||
                  (oportunidades.find(o => o.clienteEmail === show360View.email && t.relacionadoId === o.id))
                );

                if (tareasCliente.length > 0) {
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ClipboardList size={24} className="text-green-600" />
                        Tareas ({tareasCliente.length})
                      </h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {tareasCliente.slice(0, 10).map(tarea => (
                          <div key={tarea.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">{tarea.titulo}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                tarea.estado === 'completada' ? 'bg-green-100 text-green-800' :
                                tarea.estado === 'en_progreso' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {tarea.estado}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{tarea.descripcion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Proyectos */}
              {(() => {
                const proyectosCliente = proyectos.filter(p =>
                  p.clienteId === show360View.id
                );

                if (proyectosCliente.length > 0) {
                  return (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Briefcase size={24} className="text-indigo-600" />
                        Proyectos ({proyectosCliente.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {proyectosCliente.slice(0, 6).map(proyecto => (
                          <div key={proyecto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-bold text-gray-900 mb-2">{proyecto.nombre}</h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-600">Estado: <span className="font-semibold">{proyecto.estado}</span></p>
                              {proyecto.presupuesto && (
                                <p className="text-gray-600">Presupuesto: <span className="font-semibold">${proyecto.presupuesto}</span></p>
                              )}
                              {proyecto.fechaInicio && (
                                <p className="text-gray-500 text-xs">
                                  Inicio: {new Date(proyecto.fechaInicio).toLocaleDateString('es-MX')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Notas del Cliente */}
              {show360View.notas && (
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Notas</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{show360View.notas}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-100 p-4 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShow360View(null)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Interacciones
function InteraccionesModule() {
  const [interacciones, setInteracciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [interaccionDetalle, setInteraccionDetalle] = useState(null);
  const [emailData, setEmailData] = useState({
    clienteId: '',
    subject: '',
    body: '',
    saveAsInteraction: true
  });
  const [formData, setFormData] = useState({
    tipo: 'llamada',
    clienteId: '',
    usuarioId: '',
    oportunidadId: '',
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

      // Cargar oportunidades
      const oportunidadesSnapshot = await getDocs(collection(db, 'oportunidades'));
      const oportunidadesData = oportunidadesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOportunidades(oportunidadesData);
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
      // Limpiar datos para evitar undefined
      const dataToSave = {
        tipo: formData.tipo,
        clienteId: formData.clienteId || '',
        usuarioId: formData.usuarioId || '',
        oportunidadId: formData.oportunidadId || '',
        fecha: formData.fecha,
        hora: formData.hora || '',
        duracion: formData.duracion || '',
        notas: formData.notas || '',
        seguimiento: formData.seguimiento || '',
        completado: formData.completado || false
      };

      if (editingId) {
        // Actualizar interacción existente
        const interaccionRef = doc(db, 'interacciones', editingId);
        await updateDoc(interaccionRef, dataToSave);
        console.log('Interacción actualizada');
      } else {
        // Crear nueva interacción
        const docRef = await addDoc(collection(db, 'interacciones'), {
          ...dataToSave,
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
      oportunidadId: interaccion.oportunidadId || '',
      fecha: interaccion.fecha,
      hora: interaccion.hora || '',
      duracion: interaccion.duracion || '',
      notas: interaccion.notas || '',
      seguimiento: interaccion.seguimiento || '',
      completado: interaccion.completado || false
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
      oportunidadId: '',
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

  // Funciones de email
  const openEmailComposer = (clienteId = '') => {
    setEmailData({
      clienteId: clienteId,
      subject: '',
      body: '',
      saveAsInteraction: true
    });
    setShowEmailComposer(true);
  };

  const handleSendEmail = async () => {
    const cliente = clientes.find(c => c.id === emailData.clienteId);

    if (!cliente || !cliente.email) {
      alert('Por favor selecciona un cliente con email válido');
      return;
    }

    if (!emailData.subject || !emailData.body) {
      alert('Por favor completa el asunto y el mensaje del email');
      return;
    }

    // Construir mailto: link
    const mailtoLink = `mailto:${encodeURIComponent(cliente.email)}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;

    // Abrir cliente de email
    window.location.href = mailtoLink;

    // Guardar como interacción si está marcado
    if (emailData.saveAsInteraction) {
      try {
        await addDoc(collection(db, 'interacciones'), {
          tipo: 'email',
          clienteId: emailData.clienteId,
          usuarioId: '',
          oportunidadId: '',
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          duracion: '',
          notas: `Asunto: ${emailData.subject}\n\nMensaje:\n${emailData.body}`,
          seguimiento: '',
          completado: true,
          fechaCreacion: new Date().toISOString()
        });

        console.log('Email guardado como interacción');
        loadData();
      } catch (error) {
        console.error('Error guardando email como interacción:', error);
      }
    }

    // Cerrar modal
    setShowEmailComposer(false);
    resetEmailForm();
  };

  const resetEmailForm = () => {
    setEmailData({
      clienteId: '',
      subject: '',
      body: '',
      saveAsInteraction: true
    });
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Interacciones</h2>
          <div className="flex gap-3">
            <button
              onClick={() => openEmailComposer()}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all"
            >
              <Mail size={24} />
              <span className="text-xl">Enviar Email</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              {showForm ? <X size={24} /> : <Plus size={24} />}
              <span className="text-xl">{showForm ? 'Cancelar' : 'Nueva Interacción'}</span>
            </button>
          </div>
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
                <label className="block text-lg font-medium text-gray-700 mb-2">Oportunidad (opcional)</label>
                <select
                  value={formData.oportunidadId}
                  onChange={(e) => setFormData({...formData, oportunidadId: e.target.value})}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md"
                >
                  <option value="">Sin vincular a oportunidad</option>
                  {oportunidades.map(oportunidad => (
                    <option key={oportunidad.id} value={oportunidad.id}>{oportunidad.nombre}</option>
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
                    <tr
                      key={interaccion.id}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setInteraccionDetalle(interaccion)}
                    >
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
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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

      {/* Modal de Email Composer */}
      {showEmailComposer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEmailComposer(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Mail className="text-purple-600" size={32} />
                <h3 className="text-2xl font-bold text-gray-900">Enviar Email</h3>
              </div>
              <button
                onClick={() => setShowEmailComposer(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para (Cliente) *
                </label>
                <select
                  value={emailData.clienteId}
                  onChange={(e) => setEmailData({ ...emailData, clienteId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.filter(c => c.email).map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} ({cliente.email})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Solo se muestran clientes con email registrado
                </p>
              </div>

              {/* Asunto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ingresa el asunto del email"
                  required
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                  required
                />
              </div>

              {/* Guardar como interacción */}
              <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg">
                <input
                  type="checkbox"
                  id="saveAsInteraction"
                  checked={emailData.saveAsInteraction}
                  onChange={(e) => setEmailData({ ...emailData, saveAsInteraction: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="saveAsInteraction" className="text-sm text-gray-700 cursor-pointer">
                  Guardar este email como interacción en el CRM
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSendEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all"
                >
                  <Send size={20} />
                  Enviar Email
                </button>
                <button
                  onClick={() => setShowEmailComposer(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Al hacer clic en "Enviar Email", se abrirá tu cliente de correo predeterminado
                  con el email pre-rellenado. Asegúrate de enviar el correo desde tu aplicación de email.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Interacción */}
      {interaccionDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setInteraccionDetalle(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone size={32} />
                  <div>
                    <h3 className="text-2xl font-bold">Detalle de Interacción</h3>
                    <p className="text-orange-100 text-sm mt-1">
                      {(() => {
                        const tipoData = getTipoData(interaccionDetalle.tipo);
                        return `${tipoData.icon} ${tipoData.label}`;
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInteraccionDetalle(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Información Principal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Cliente</p>
                  <p className="text-lg font-semibold text-gray-900">{getClienteNombre(interaccionDetalle.clienteId)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Usuario Responsable</p>
                  <p className="text-lg font-semibold text-gray-900">{getUsuarioNombre(interaccionDetalle.usuarioId)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Fecha</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(interaccionDetalle.fecha).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Hora y Duración</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {interaccionDetalle.hora || 'No especificada'}
                    {interaccionDetalle.duracion && ` - ${interaccionDetalle.duracion} min`}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Estado</p>
                <span className={`inline-flex px-4 py-2 rounded-full text-base font-semibold ${
                  interaccionDetalle.completado
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {interaccionDetalle.completado ? '✓ Completada' : '⏱ Pendiente'}
                </span>
              </div>

              {/* Oportunidad relacionada */}
              {interaccionDetalle.oportunidadId && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1 font-semibold">Oportunidad Relacionada</p>
                  <p className="text-lg text-blue-900">
                    {oportunidades.find(o => o.id === interaccionDetalle.oportunidadId)?.nombre || 'No especificada'}
                  </p>
                </div>
              )}

              {/* Notas */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2 font-semibold">Notas</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap">
                  {interaccionDetalle.notas || 'Sin notas registradas'}
                </p>
              </div>

              {/* Seguimiento */}
              {interaccionDetalle.seguimiento && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-700 mb-2 font-semibold">Seguimiento</p>
                  <p className="text-base text-purple-900 whitespace-pre-wrap">{interaccionDetalle.seguimiento}</p>
                </div>
              )}

              {/* Fecha de creación */}
              {interaccionDetalle.fechaCreacion && (
                <div className="text-sm text-gray-400 text-center pt-4 border-t">
                  Registrado el {new Date(interaccionDetalle.fechaCreacion).toLocaleString('es-MX')}
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleEdit(interaccionDetalle);
                    setInteraccionDetalle(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  <Edit2 size={20} />
                  Editar
                </button>
                <button
                  onClick={() => setInteraccionDetalle(null)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Calendario
function CalendarioModule() {
  const [tareas, setTareas] = useState([]);
  const [interacciones, setInteracciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Cargar datos desde Firestore
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [tareasSnap, interaccionesSnap, clientesSnap, usuariosSnap] = await Promise.all([
          getDocs(collection(db, 'tareas')),
          getDocs(collection(db, 'interacciones')),
          getDocs(collection(db, 'clientes')),
          getDocs(collection(db, 'usuarios'))
        ]);

        setTareas(tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setInteracciones(interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsuarios(usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Funciones de calendario
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior (espacios vacíos)
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];

    const dateStr = date.toISOString().split('T')[0];
    const events = [];

    // Agregar tareas
    tareas.forEach(tarea => {
      if (tarea.fechaVencimiento === dateStr) {
        events.push({
          type: 'tarea',
          data: tarea,
          color: tarea.prioridad === 'alta' ? 'bg-red-100 text-red-800 border-red-300' :
                 tarea.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                 'bg-green-100 text-green-800 border-green-300'
        });
      }
    });

    // Agregar interacciones
    interacciones.forEach(interaccion => {
      if (interaccion.fecha === dateStr) {
        events.push({
          type: 'interaccion',
          data: interaccion,
          color: interaccion.tipo === 'llamada' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                 interaccion.tipo === 'email' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                 interaccion.tipo === 'reunion' ? 'bg-green-100 text-green-800 border-green-300' :
                 interaccion.tipo === 'mensaje' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                 'bg-gray-100 text-gray-800 border-gray-300'
        });
      }
    });

    return events;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      llamada: '📞',
      email: '📧',
      reunion: '🤝',
      mensaje: '💬',
      otro: '📝'
    };
    return icons[tipo] || '📝';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-lg text-gray-600">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar size={40} className="text-orange-500" />
          Calendario
        </h1>
      </div>

      {/* Navegación del mes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-3xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-2">
          {/* Nombres de los días */}
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Días del mes */}
          {getDaysInMonth(currentDate).map((date, index) => {
            const events = getEventsForDate(date);
            const today = isToday(date);

            return (
              <div
                key={index}
                className={`min-h-[120px] border rounded-lg p-2 ${
                  date ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                } ${today ? 'border-orange-500 border-2 shadow-md' : 'border-gray-200'}`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-semibold mb-1 ${
                      today ? 'text-orange-500' : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((event, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left px-2 py-1 rounded text-xs border ${event.color} hover:opacity-80 transition-opacity truncate`}
                        >
                          {event.type === 'tarea' ? (
                            <span>📋 {event.data.titulo}</span>
                          ) : (
                            <span>{getTipoIcon(event.data.tipo)} {clientes.find(c => c.id === event.data.clienteId)?.nombre || 'Cliente'}</span>
                          )}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{events.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Leyenda</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span className="text-sm text-gray-600">Tarea Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
              <span className="text-sm text-gray-600">Tarea Media</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
              <span className="text-sm text-gray-600">Tarea Baja</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
              <span className="text-sm text-gray-600">Interacciones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedEvent.type === 'tarea' ? '📋 Tarea' : `${getTipoIcon(selectedEvent.data.tipo)} Interacción`}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            {selectedEvent.type === 'tarea' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Título</p>
                  <p className="text-xl font-semibold text-gray-900">{selectedEvent.data.titulo}</p>
                </div>
                {selectedEvent.data.descripcion && (
                  <div>
                    <p className="text-sm text-gray-500">Descripción</p>
                    <p className="text-gray-900">{selectedEvent.data.descripcion}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Prioridad</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedEvent.data.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                      selectedEvent.data.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedEvent.data.prioridad.charAt(0).toUpperCase() + selectedEvent.data.prioridad.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedEvent.data.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      selectedEvent.data.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedEvent.data.estado === 'en_progreso' ? 'En Progreso' :
                       selectedEvent.data.estado === 'completada' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Vencimiento</p>
                  <p className="text-lg text-gray-900">
                    {new Date(selectedEvent.data.fechaVencimiento).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {selectedEvent.data.usuarioId && (
                  <div>
                    <p className="text-sm text-gray-500">Asignado a</p>
                    <p className="text-lg text-gray-900">
                      {usuarios.find(u => u.id === selectedEvent.data.usuarioId)?.nombre || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Cliente</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {clientes.find(c => c.id === selectedEvent.data.clienteId)?.nombre || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Usuario</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {usuarios.find(u => u.id === selectedEvent.data.usuarioId)?.nombre || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="text-lg text-gray-900">
                      {new Date(selectedEvent.data.fecha).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {selectedEvent.data.hora && (
                    <div>
                      <p className="text-sm text-gray-500">Hora</p>
                      <p className="text-lg text-gray-900">{selectedEvent.data.hora}</p>
                    </div>
                  )}
                </div>
                {selectedEvent.data.duracion && (
                  <div>
                    <p className="text-sm text-gray-500">Duración</p>
                    <p className="text-lg text-gray-900">{selectedEvent.data.duracion}</p>
                  </div>
                )}
                {selectedEvent.data.notas && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Notas / Resumen</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedEvent.data.notas}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.data.seguimiento && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Seguimiento</p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedEvent.data.seguimiento}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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
  const [proyectoDetalle, setProyectoDetalle] = useState(null);
  const [tareasProyecto, setTareasProyecto] = useState([]);
  const [avancesProyecto, setAvancesProyecto] = useState([]);
  const [showModalAvance, setShowModalAvance] = useState(false);
  const [editingAvanceId, setEditingAvanceId] = useState(null);
  const [nuevoAvance, setNuevoAvance] = useState('');
  const [documentosAvance, setDocumentosAvance] = useState([]);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
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

  const verDetallesProyecto = async (proyecto) => {
    setProyectoDetalle(proyecto);
    // Cargar tareas del proyecto
    try {
      const tareasSnapshot = await getDocs(collection(db, 'tareas'));
      const todasTareas = tareasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tareasFiltradas = todasTareas.filter(t => t.proyectoId === proyecto.id);
      setTareasProyecto(tareasFiltradas);

      // Cargar avances (si existen)
      setAvancesProyecto(proyecto.avances || []);
    } catch (error) {
      console.error('Error cargando detalles:', error);
    }
  };

  const agregarAvance = async () => {
    if (!nuevoAvance.trim() || !proyectoDetalle) return;

    try {
      const avances = proyectoDetalle.avances || [];
      let nuevosAvances;

      if (editingAvanceId) {
        // Editar avance existente
        nuevosAvances = avances.map(avance => {
          if (avance.id === editingAvanceId) {
            return {
              ...avance,
              texto: nuevoAvance,
              documentos: documentosAvance,
              fechaEdicion: new Date().toISOString()
            };
          }
          return avance;
        });
      } else {
        // Crear nuevo avance
        const nuevoAvanceObj = {
          id: Date.now().toString(),
          texto: nuevoAvance,
          fecha: new Date().toISOString(),
          usuario: 'Usuario Actual',
          documentos: documentosAvance // Incluir documentos adjuntos
        };
        nuevosAvances = [nuevoAvanceObj, ...avances];
      }

      // Actualizar en Firestore
      const proyectoRef = doc(db, 'proyectos', proyectoDetalle.id);
      await updateDoc(proyectoRef, { avances: nuevosAvances });

      setAvancesProyecto(nuevosAvances);
      setNuevoAvance('');
      setDocumentosAvance([]);
      setShowModalAvance(false);
      setEditingAvanceId(null);

      // Actualizar proyecto detalle
      setProyectoDetalle({ ...proyectoDetalle, avances: nuevosAvances });
      loadData();
      alert(editingAvanceId ? 'Avance actualizado exitosamente' : 'Avance agregado exitosamente');
    } catch (error) {
      console.error('Error guardando avance:', error);
      alert('Error al guardar avance');
    }
  };

  const editarAvance = (avance) => {
    setEditingAvanceId(avance.id);
    setNuevoAvance(avance.texto);
    setDocumentosAvance(avance.documentos || []);
    setShowModalAvance(true);
  };

  const eliminarAvance = async (avanceId) => {
    if (!window.confirm('¿Estás seguro de eliminar este avance?')) return;

    try {
      const avances = proyectoDetalle.avances || [];
      const nuevosAvances = avances.filter(a => a.id !== avanceId);

      // Actualizar en Firestore
      const proyectoRef = doc(db, 'proyectos', proyectoDetalle.id);
      await updateDoc(proyectoRef, { avances: nuevosAvances });

      setAvancesProyecto(nuevosAvances);
      setProyectoDetalle({ ...proyectoDetalle, avances: nuevosAvances });
      loadData();
      alert('Avance eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando avance:', error);
      alert('Error al eliminar avance');
    }
  };

  const subirDocumentoAvance = async (e) => {
    const file = e.target.files[0];
    if (!file || !proyectoDetalle) return;

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!tiposPermitidos.includes(file.type)) {
      alert('Solo se permiten archivos PDF, Word, Excel e imágenes');
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo debe ser menor a 10MB');
      return;
    }

    try {
      setSubiendoDocumento(true);

      // Subir a Firebase Storage
      const fileName = `proyectos/${proyectoDetalle.id}/avances/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Crear objeto de documento
      const nuevoDocumento = {
        id: Date.now().toString(),
        nombre: file.name,
        url: url,
        tipo: file.type,
        tamano: file.size,
        fecha: new Date().toISOString()
      };

      // Agregar al estado temporal
      setDocumentosAvance([...documentosAvance, nuevoDocumento]);
      alert('Documento agregado (se guardará con el avance)');
    } catch (error) {
      console.error('Error subiendo documento:', error);
      alert('Error al subir documento: ' + error.message);
    } finally {
      setSubiendoDocumento(false);
      e.target.value = ''; // Limpiar input
    }
  };

  const eliminarDocumentoTemp = (docId) => {
    setDocumentosAvance(documentosAvance.filter(d => d.id !== docId));
  };

  const formatearTamano = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const obtenerIconoDocumento = (tipo) => {
    if (tipo.includes('pdf')) return '📄';
    if (tipo.includes('word')) return '📝';
    if (tipo.includes('excel') || tipo.includes('sheet')) return '📊';
    if (tipo.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold">Proyectos</h2>
            <p className="text-blue-200 mt-2 text-lg">
              Gestiona proyectos completos para tus clientes: asigna presupuestos, fechas, y lleva el control del progreso de cada uno 📊
            </p>
          </div>
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
                            onClick={() => verDetallesProyecto(proyecto)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Ver Detalles"
                          >
                            <Info size={20} />
                          </button>
                          <button
                            onClick={() => handleEdit(proyecto)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDelete(proyecto.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
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

      {/* Modal de Detalles del Proyecto */}
      {proyectoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-3xl font-bold">{proyectoDetalle.nombre}</h3>
                <p className="text-blue-200 mt-1">{proyectoDetalle.descripcion}</p>
              </div>
              <button
                onClick={() => setProyectoDetalle(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6">
              {/* Información General */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">📋 Información General</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 font-semibold">Cliente:</p>
                    <p className="text-gray-900 text-lg">{getClienteNombre(proyectoDetalle.clienteId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Empresa:</p>
                    <p className="text-gray-900 text-lg">{getEmpresaNombre(proyectoDetalle.empresaId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Fecha Inicio:</p>
                    <p className="text-gray-900 text-lg">
                      {proyectoDetalle.fechaInicio ? new Date(proyectoDetalle.fechaInicio).toLocaleDateString('es-MX') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Fecha Fin:</p>
                    <p className="text-gray-900 text-lg">
                      {proyectoDetalle.fechaFin ? new Date(proyectoDetalle.fechaFin).toLocaleDateString('es-MX') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Presupuesto:</p>
                    <p className="text-gray-900 text-lg font-bold">
                      ${parseFloat(proyectoDetalle.presupuesto || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">Estado:</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getEstadoData(proyectoDetalle.estado).color}`}>
                      {getEstadoData(proyectoDetalle.estado).label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 font-semibold mb-2">Progreso: {proyectoDetalle.progreso || 0}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-600 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${proyectoDetalle.progreso || 0}%` }}
                      >
                        {proyectoDetalle.progreso || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Tareas del Proyecto */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">✅ Tareas del Proyecto</h4>
                  {tareasProyecto.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay tareas asignadas a este proyecto</p>
                      <p className="text-sm text-gray-400 mt-2">Crea tareas desde el módulo de Tareas y asígnalas a este proyecto</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tareasProyecto.map(tarea => (
                        <div key={tarea.id} className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{tarea.titulo}</p>
                              <p className="text-sm text-gray-600 mt-1">{tarea.descripcion}</p>
                              <div className="flex gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  tarea.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                                  tarea.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {tarea.prioridad?.toUpperCase()}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  tarea.completada ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {tarea.completada ? 'Completada' : 'Pendiente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Avances del Proyecto */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-gray-800">📝 Avances y Actualizaciones</h4>
                    <button
                      onClick={() => setShowModalAvance(true)}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
                    >
                      <Plus size={20} />
                      Nuevo Avance
                    </button>
                  </div>

                  {/* Lista de avances */}
                  {avancesProyecto.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay avances registrados</p>
                      <p className="text-sm text-gray-400 mt-2">Agrega el primer avance del proyecto</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {avancesProyecto.map(avance => (
                        <div key={avance.id} className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-800 flex-1">{avance.texto}</p>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => editarAvance(avance)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => eliminarAvance(avance.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Documentos adjuntos */}
                          {avance.documentos && avance.documentos.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold text-gray-600">📎 Documentos adjuntos:</p>
                              {avance.documentos.map(doc => (
                                <div key={doc.id} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{obtenerIconoDocumento(doc.tipo)}</span>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700">{doc.nombre}</p>
                                      <p className="text-xs text-gray-500">{formatearTamano(doc.tamano)}</p>
                                    </div>
                                  </div>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                                    title="Abrir"
                                  >
                                    <ExternalLink size={16} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                            <Clock size={14} />
                            <span>{new Date(avance.fecha).toLocaleString('es-MX')}</span>
                            <span>• {avance.usuario}</span>
                            {avance.fechaEdicion && (
                              <>
                                <span>• Editado: {new Date(avance.fechaEdicion).toLocaleString('es-MX')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Nuevo Avance */}
      {showModalAvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-2xl font-bold">📝 {editingAvanceId ? 'Editar Avance' : 'Nuevo Avance'}</h3>
              <button
                onClick={() => {
                  setShowModalAvance(false);
                  setNuevoAvance('');
                  setDocumentosAvance([]);
                  setEditingAvanceId(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Campo de texto para el avance */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-2">Descripción del Avance *</label>
                <textarea
                  value={nuevoAvance}
                  onChange={(e) => setNuevoAvance(e.target.value)}
                  placeholder="Describe el avance o actualización del proyecto..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                  rows="5"
                  required
                />
              </div>

              {/* Sección de documentos adjuntos */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-2">Documentos Adjuntos</label>

                {/* Área de carga */}
                <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-all mb-4">
                  <Paperclip size={40} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 text-center">
                    {subiendoDocumento ? 'Subiendo...' : 'Click para adjuntar documento'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Imágenes (max 10MB)</span>
                  <input
                    type="file"
                    onChange={subirDocumentoAvance}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={subiendoDocumento}
                  />
                </label>

                {/* Lista de documentos adjuntos temporales */}
                {documentosAvance.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600">Documentos a adjuntar:</p>
                    {documentosAvance.map(doc => (
                      <div key={doc.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{obtenerIconoDocumento(doc.tipo)}</span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{doc.nombre}</p>
                            <p className="text-xs text-gray-500">{formatearTamano(doc.tamano)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => eliminarDocumentoTemp(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-4">
                <button
                  onClick={agregarAvance}
                  disabled={!nuevoAvance.trim()}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                  Guardar Avance
                </button>
                <button
                  onClick={() => {
                    setShowModalAvance(false);
                    setNuevoAvance('');
                    setDocumentosAvance([]);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Módulo Oportunidades
function OportunidadesModule({ currentUser }) {
  const [oportunidades, setOportunidades] = useState([]);
  const [allOportunidades, setAllOportunidades] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [interacciones, setInteracciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [vistaKanban, setVistaKanban] = useState(true);
  const [interaccionSeleccionada, setInteraccionSeleccionada] = useState(null);
  const [showConvertirClienteModal, setShowConvertirClienteModal] = useState(null);
  const [oportunidadDetalle, setOportunidadDetalle] = useState(null);
  const [tareasRelacionadas, setTareasRelacionadas] = useState([]);
  const [showNuevaInteraccion, setShowNuevaInteraccion] = useState(false);
  const [showNuevaTarea, setShowNuevaTarea] = useState(false);
  const [editingInteraccionId, setEditingInteraccionId] = useState(null);
  const [editingTareaId, setEditingTareaId] = useState(null);
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [interaccionDetalleView, setInteraccionDetalleView] = useState(null);
  const [showChatIA, setShowChatIA] = useState(false);
  const [chatIAType, setChatIAType] = useState(null); // 'interaccion' o 'tarea'
  const [chatIAMessages, setChatIAMessages] = useState([]);
  const [enviandoMensajeIA, setEnviandoMensajeIA] = useState(false);
  const [mensajeUsuarioIA, setMensajeUsuarioIA] = useState('');
  const [showEtapaInfo, setShowEtapaInfo] = useState(null);
  const [nuevaInteraccion, setNuevaInteraccion] = useState({
    tipo: 'llamada',
    descripcion: '',
    resultado: '',
    fecha: new Date().toISOString().split('T')[0]
  });
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    fechaVencimiento: ''
  });
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
    { value: 'Calificación', label: 'Calificación', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'Análisis de Necesidades', label: 'Análisis de Necesidades', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'Presentación/Demo', label: 'Presentación/Demo', color: 'bg-pink-100 text-pink-800' },
    { value: 'Propuesta Enviada', label: 'Propuesta Enviada', color: 'bg-purple-100 text-purple-800' },
    { value: 'Negociación', label: 'Negociación', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Cerrado Ganado', label: 'Cerrado Ganado', color: 'bg-green-100 text-green-800' },
    { value: 'Cerrado Perdido', label: 'Cerrado Perdido', color: 'bg-red-100 text-red-800' }
  ];

  const etapasInfo = {
    'Contacto Inicial': {
      descripcion: 'Primera interacción con el prospecto. Se establece comunicación y se identifica el interés inicial.',
      objetivos: ['Establecer primer contacto', 'Identificar persona de contacto clave', 'Confirmar información básica'],
      probabilidad: '10%',
      duracion: '1-3 días'
    },
    'Calificación': {
      descripcion: 'Evaluación de viabilidad del prospecto usando metodología BANT (Budget, Authority, Need, Timeline).',
      objetivos: ['Confirmar presupuesto disponible', 'Identificar tomadores de decisión', 'Validar necesidad real', 'Establecer timeline'],
      probabilidad: '20%',
      duracion: '3-5 días'
    },
    'Análisis de Necesidades': {
      descripcion: 'Reunión de descubrimiento profundo para entender pain points, objetivos de negocio y requerimientos específicos.',
      objetivos: ['Mapear pain points actuales', 'Entender objetivos de negocio', 'Identificar todos los stakeholders', 'Documentar requerimientos'],
      probabilidad: '35%',
      duracion: '5-7 días'
    },
    'Presentación/Demo': {
      descripcion: 'Demostración del producto/servicio adaptada a las necesidades específicas identificadas del cliente.',
      objetivos: ['Presentar solución personalizada', 'Realizar demo interactiva', 'Responder objeciones técnicas', 'Asegurar buy-in de decision makers'],
      probabilidad: '50%',
      duracion: '3-5 días'
    },
    'Propuesta Enviada': {
      descripcion: 'Envío de propuesta comercial formal con pricing, alcance, términos y condiciones.',
      objetivos: ['Enviar propuesta detallada', 'Dar seguimiento a recepción', 'Resolver dudas sobre la propuesta', 'Agendar reunión de revisión'],
      probabilidad: '60%',
      duracion: '5-7 días'
    },
    'Negociación': {
      descripcion: 'Discusión de términos finales, ajustes de precio, alcance y condiciones contractuales.',
      objetivos: ['Negociar términos comerciales', 'Ajustar alcance si necesario', 'Resolver objeciones finales', 'Acordar condiciones de pago'],
      probabilidad: '75%',
      duracion: '3-10 días'
    },
    'Cerrado Ganado': {
      descripcion: 'Oportunidad ganada. Cliente acepta propuesta y firma contrato.',
      objetivos: ['Firma de contrato', 'Procesamiento de pago inicial', 'Iniciar proceso de onboarding', 'Celebrar el win! 🎉'],
      probabilidad: '95%',
      duracion: '1-2 días'
    },
    'Cerrado Perdido': {
      descripcion: 'Oportunidad perdida. Cliente decidió no continuar o eligió otra opción.',
      objetivos: ['Documentar razón de pérdida', 'Solicitar feedback', 'Identificar aprendizajes', 'Mantener relación para futuro'],
      probabilidad: '0%',
      duracion: '-'
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oportunidadesSnap, clientesSnap, empresasSnap, usuariosSnap, interaccionesSnap] = await Promise.all([
        getDocs(collection(db, 'oportunidades')),
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'empresas')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'interacciones'))
      ]);

      const todasOportunidades = oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      todasOportunidades.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
      setAllOportunidades(todasOportunidades);

      // Aplicar filtros según permisos
      let oportunidadesFiltradas = todasOportunidades;
      const permisoVer = currentUser?.permisos?.oportunidades?.ver;

      if (permisoVer === 'propios') {
        oportunidadesFiltradas = todasOportunidades.filter(op => op.usuarioResponsableId === currentUser.id);
      } else if (permisoVer === 'equipo') {
        const usuariosEquipo = usuariosSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.equipoId === currentUser.equipoId)
          .map(u => u.id);
        oportunidadesFiltradas = todasOportunidades.filter(op => usuariosEquipo.includes(op.usuarioResponsableId));
      } else if (permisoVer === 'todos' || permisoVer === true) {
        oportunidadesFiltradas = todasOportunidades;
      } else if (permisoVer === false) {
        oportunidadesFiltradas = [];
      }

      setOportunidades(oportunidadesFiltradas);
      setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setEmpresas(empresasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsuarios(usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setInteracciones(interaccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        // Obtener la oportunidad antes de borrarla para ver si tiene leadId
        const oportunidad = oportunidades.find(op => op.id === id) || allOportunidades.find(op => op.id === id);

        // Si la oportunidad vino de un lead, revertir el estado del lead
        if (oportunidad && oportunidad.leadId) {
          await updateDoc(doc(db, 'leads', oportunidad.leadId), {
            estado: 'calificado',
            fechaConversion: null
          });
        }

        // Borrar la oportunidad
        await deleteDoc(doc(db, 'oportunidades', id));
        loadData();
        alert('✅ Oportunidad eliminada. El lead ha regresado a estado "Calificado".');
      } catch (error) {
        console.error("Error deleting oportunidad:", error);
        alert('Error eliminando oportunidad: ' + error.message);
      }
    }
  };

  const handleConvertirACliente = async (oportunidad) => {
    try {
      // Verificar si el cliente ya existe
      const clienteExistente = clientes.find(c => c.email === oportunidad.clienteEmail);

      if (clienteExistente) {
        alert(`⚠️ Ya existe un cliente con el email ${oportunidad.clienteEmail}. La oportunidad se vinculará a ese cliente.`);

        // Actualizar oportunidad para marcar que ya se convirtió
        await updateDoc(doc(db, 'oportunidades', oportunidad.id), {
          convertidoACliente: true,
          clienteIdFinal: clienteExistente.id,
          fechaConversion: new Date().toISOString()
        });
      } else {
        // Crear nuevo cliente
        const nuevoClienteRef = await addDoc(collection(db, 'clientes'), {
          nombre: oportunidad.clienteNombre,
          empresaId: oportunidad.empresaId || '',
          email: oportunidad.clienteEmail || '',
          telefono: '',
          cargo: '',
          industria: '',
          ubicacion: '',
          etiquetas: 'Cliente Ganado',
          notas: `Cliente convertido desde oportunidad ganada.\n\nOportunidad: ${oportunidad.nombre}\nValor cerrado: $${oportunidad.valor}\nNotas de la oportunidad:\n${oportunidad.notas}`,
          activo: true,
          fechaCreacion: new Date().toISOString(),
          origenOportunidadId: oportunidad.id
        });

        // Actualizar oportunidad
        await updateDoc(doc(db, 'oportunidades', oportunidad.id), {
          convertidoACliente: true,
          clienteIdFinal: nuevoClienteRef.id,
          fechaConversion: new Date().toISOString()
        });

        alert('✅ ¡Oportunidad convertida a Cliente exitosamente!');
      }

      setShowConvertirClienteModal(null);
      loadData();
    } catch (error) {
      console.error('Error convirtiendo a cliente:', error);
      alert('Error: ' + error.message);
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

  const getEmpresaColores = (empresaId) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return {
      primario: empresa?.colorPrimario || '#ea580c',
      secundario: empresa?.colorSecundario || '#fb923c'
    };
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

  const handleDragStart = (e, oportunidadId) => {
    e.dataTransfer.setData('oportunidadId', oportunidadId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, nuevaEtapa) => {
    e.preventDefault();
    const oportunidadId = e.dataTransfer.getData('oportunidadId');
    const oportunidad = oportunidades.find(o => o.id === oportunidadId);

    if (oportunidad && oportunidad.etapa !== nuevaEtapa) {
      // Validaciones de información requerida por etapa
      const validaciones = {
        'Propuesta Enviada': () => {
          if (!oportunidad.valor || oportunidad.valor === 0) {
            alert('⚠️ Debes especificar un valor para la oportunidad antes de enviar propuesta.');
            return false;
          }
          if (!oportunidad.notas || oportunidad.notas.trim() === '') {
            alert('⚠️ Agrega notas con los detalles de la propuesta antes de mover a esta etapa.');
            return false;
          }
          return true;
        },
        'Negociación': () => {
          const etapaPreviaValida = ['Propuesta Enviada', 'Negociación'].includes(oportunidad.etapa);
          if (!etapaPreviaValida) {
            alert('⚠️ Debes pasar por "Propuesta Enviada" antes de negociar.');
            return false;
          }
          if (!oportunidad.fechaEstimadaCierre) {
            alert('⚠️ Define una fecha estimada de cierre antes de negociar.');
            return false;
          }
          return true;
        },
        'Cerrado Ganado': () => {
          if (!oportunidad.valor || oportunidad.valor === 0) {
            alert('⚠️ Define el valor final de la oportunidad.');
            return false;
          }
          if (!oportunidad.fechaEstimadaCierre) {
            alert('⚠️ Define la fecha de cierre.');
            return false;
          }
          const etapaPreviaValida = ['Negociación', 'Propuesta Enviada'].includes(oportunidad.etapa);
          if (!etapaPreviaValida) {
            alert('⚠️ Debes negociar antes de cerrar como ganado.');
            return false;
          }
          return true;
        }
      };

      // Ejecutar validación si existe para la nueva etapa
      if (validaciones[nuevaEtapa] && !validaciones[nuevaEtapa]()) {
        return; // No proceder si falla la validación
      }

      try {
        await updateDoc(doc(db, 'oportunidades', oportunidadId), { etapa: nuevaEtapa });

        // Crear tarea automática según la nueva etapa
        const tareasAutomaticas = {
          'Contacto Inicial': {
            titulo: `Realizar seguimiento inicial: ${oportunidad.nombre}`,
            descripcion: `Contactar al cliente para discutir necesidades y expectativas.\nCliente: ${oportunidad.clienteNombre}\nEmail: ${oportunidad.clienteEmail || 'No especificado'}`,
            dias: 1
          },
          'Calificación': {
            titulo: `Calificar oportunidad: ${oportunidad.nombre}`,
            descripcion: `Evaluar viabilidad del lead: presupuesto, autoridad, necesidad, tiempo (BANT).\nCliente: ${oportunidad.clienteNombre}\nValor estimado: $${oportunidad.valor}`,
            dias: 2
          },
          'Análisis de Necesidades': {
            titulo: `Análisis profundo de necesidades: ${oportunidad.nombre}`,
            descripcion: `Reunión de descubrimiento: pain points, objetivos, stakeholders.\nCliente: ${oportunidad.clienteNombre}\nPreparar documento de requerimientos`,
            dias: 3
          },
          'Presentación/Demo': {
            titulo: `Preparar y realizar presentación: ${oportunidad.nombre}`,
            descripcion: `Demo del producto/servicio adaptado a necesidades del cliente.\nAsegurar asistencia de decision makers.\nCliente: ${oportunidad.clienteNombre}`,
            dias: 3
          },
          'Propuesta Enviada': {
            titulo: `Hacer seguimiento de propuesta: ${oportunidad.nombre}`,
            descripcion: `Contactar al cliente para resolver dudas sobre la propuesta enviada.\nValor: $${oportunidad.valor}\nCliente: ${oportunidad.clienteNombre}`,
            dias: 2
          },
          'Negociación': {
            titulo: `Negociar términos: ${oportunidad.nombre}`,
            descripcion: `Revisar términos, ajustar propuesta y cerrar condiciones finales.\nValor: $${oportunidad.valor}\nCliente: ${oportunidad.clienteNombre}`,
            dias: 3
          },
          'Cerrado Ganado': {
            titulo: `Iniciar onboarding: ${oportunidad.nombre}`,
            descripcion: `Preparar documentación, contratos y proceso de onboarding del cliente.\nCliente: ${oportunidad.clienteNombre}\nValor cerrado: $${oportunidad.valor}`,
            dias: 1
          }
        };

        // Solo crear tarea para etapas que no sean "Cerrado Perdido"
        if (nuevaEtapa !== 'Cerrado Perdido' && tareasAutomaticas[nuevaEtapa]) {
          const tarea = tareasAutomaticas[nuevaEtapa];
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + tarea.dias);

          await addDoc(collection(db, 'tareas'), {
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            prioridad: nuevaEtapa === 'Cerrado Ganado' ? 'urgente' : 'alta',
            estado: 'pendiente',
            fechaCreacion: new Date().toISOString(),
            fechaVencimiento: fechaVencimiento.toISOString(),
            responsable: oportunidad.usuarioResponsableId || 'Sin asignar',
            relacionadoCon: 'oportunidad',
            relacionadoId: oportunidadId,
            relacionadoNombre: oportunidad.nombre
          });
        }

        loadData();
      } catch (error) {
        console.error('Error actualizando etapa:', error);
      }
    }
  };

  const getOportunidadesPorEtapa = (etapa) => {
    return oportunidades.filter(o => o.etapa === etapa);
  };

  const getInteraccionesPorOportunidad = (oportunidadId) => {
    return interacciones.filter(i => i.oportunidadId === oportunidadId);
  };

  const handleAbrirDetalle = async (oportunidad) => {
    setOportunidadDetalle(oportunidad);
    setShowNuevaInteraccion(false);
    setShowNuevaTarea(false);

    // Cargar tareas relacionadas
    try {
      const tareasSnap = await getDocs(collection(db, 'tareas'));
      const todasTareas = tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tareasOportunidad = todasTareas.filter(t => t.relacionadoId === oportunidad.id && t.relacionadoCon === 'oportunidad');
      setTareasRelacionadas(tareasOportunidad);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      setTareasRelacionadas([]);
    }
  };

  const abrirChatIA = (tipo) => {
    setChatIAType(tipo);
    setChatIAMessages([]);
    setMensajeUsuarioIA('');
    setShowChatIA(true);

    // Generar primer mensaje automáticamente
    generarPrimerMensajeIA(tipo);
  };

  const generarPrimerMensajeIA = async (tipo) => {
    setEnviandoMensajeIA(true);
    try {
      let prompt = '';

      if (tipo === 'interaccion') {
        const tipoMap = {
          'llamada': 'llamada telefónica',
          'email': 'correo electrónico',
          'reunion': 'resumen de reunión',
          'mensaje': 'mensaje',
          'otro': 'nota'
        };

        const interaccionesPrevias = getInteraccionesPorOportunidad(oportunidadDetalle.id)
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          .slice(-3);

        const contextoInteracciones = interaccionesPrevias.length > 0
          ? `Últimas interacciones:\n${interaccionesPrevias.map((int, i) =>
              `${i + 1}. ${int.tipo} (${int.fecha}): ${int.descripcion.substring(0, 100)}...`
            ).join('\n')}`
          : 'No hay interacciones previas registradas.';

        prompt = `Eres un experto en ventas B2B y comunicación profesional.

CONTEXTO:
- Cliente: ${getClienteNombre(oportunidadDetalle.clienteId)}
- Oportunidad: ${oportunidadDetalle.nombre}
- Valor: ${formatCurrency(oportunidadDetalle.valor)}
- Etapa actual: ${oportunidadDetalle.etapa}
${contextoInteracciones}

TIPO DE COMUNICACIÓN: ${tipoMap[nuevaInteraccion.tipo]}

${nuevaInteraccion.descripcion ? `CONTEXTO ADICIONAL PROPORCIONADO:\n${nuevaInteraccion.descripcion}\n\nMejora y profesionaliza este texto.` : 'Genera un contenido profesional para esta comunicación.'}

REQUISITOS:
1. Lenguaje profesional, directo y orientado a resultados
2. Debe incluir un Call-to-Action claro
3. Mencionar valor agregado específico
4. Establecer próximos pasos concretos
5. Máximo 200 palabras
6. Tono consultivo, no agresivo

Responde SOLO con el contenido de la ${tipoMap[nuevaInteraccion.tipo]}, sin introducción ni explicaciones adicionales.`;
      } else {
        // tipo === 'tarea'
        const tareasRelacionadasExistentes = tareasRelacionadas
          .filter(t => t.estado !== 'completada')
          .slice(0, 3);

        const contextoTareas = tareasRelacionadasExistentes.length > 0
          ? `Tareas pendientes:\n${tareasRelacionadasExistentes.map((t, i) =>
              `${i + 1}. ${t.titulo} (${t.prioridad}) - ${t.descripcion || 'Sin detalles'}`
            ).join('\n')}`
          : 'No hay tareas pendientes.';

        prompt = `Eres un experto en gestión de ventas y productividad.

CONTEXTO DE LA OPORTUNIDAD:
- Cliente: ${getClienteNombre(oportunidadDetalle.clienteId)}
- Oportunidad: ${oportunidadDetalle.nombre}
- Valor: ${formatCurrency(oportunidadDetalle.valor)}
- Etapa actual: ${oportunidadDetalle.etapa}
${contextoTareas}

${nuevaTarea.titulo ? `TAREA A MEJORAR:\nTítulo: ${nuevaTarea.titulo}\n${nuevaTarea.descripcion ? `Descripción inicial: ${nuevaTarea.descripcion}` : ''}` : 'OBJETIVO: Generar una tarea efectiva para avanzar esta oportunidad'}

REQUISITOS:
1. Genera un título claro y accionable (máximo 60 caracteres)
2. Descripción específica con pasos concretos
3. Orientada a cerrar la venta o avanzar a la siguiente etapa
4. Incluye criterios de éxito medibles
5. Máximo 150 palabras en la descripción

Responde en formato JSON:
{
  "titulo": "título de la tarea",
  "descripcion": "descripción detallada con pasos"
}`;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: tipo === 'interaccion'
                ? 'Eres un experto en ventas B2B, redacción comercial y cierre de oportunidades. Generas contenido profesional, persuasivo y orientado a resultados.'
                : 'Eres un experto en ventas B2B y productividad. Generas tareas accionables, específicas y orientadas a resultados.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: tipo === 'interaccion' ? 600 : 400,
          ...(tipo === 'tarea' && { response_format: { type: "json_object" } })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error de Groq:', errorData);
        throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      const contenido = data.choices[0].message.content;

      setChatIAMessages([
        { role: 'assistant', content: contenido }
      ]);

    } catch (error) {
      console.error('Error generando con IA:', error);
      alert(`Error al generar contenido con IA: ${error.message}\n\nVerifica tu conexión a internet.`);
      setShowChatIA(false);
    } finally {
      setEnviandoMensajeIA(false);
    }
  };

  const enviarMensajeIA = async () => {
    if (!mensajeUsuarioIA.trim()) return;

    const nuevoMensajeUsuario = { role: 'user', content: mensajeUsuarioIA };
    const mensajesActualizados = [...chatIAMessages, nuevoMensajeUsuario];

    setChatIAMessages(mensajesActualizados);
    setMensajeUsuarioIA('');
    setEnviandoMensajeIA(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: chatIAType === 'interaccion'
                ? 'Eres un experto en ventas B2B, redacción comercial y cierre de oportunidades. Ayudas a mejorar y ajustar contenido profesional según las indicaciones del usuario.'
                : 'Eres un experto en ventas B2B y productividad. Ayudas a crear y mejorar tareas accionables según las indicaciones del usuario. Siempre respondes en formato JSON con {titulo, descripcion}.'
            },
            ...mensajesActualizados
          ],
          temperature: 0.7,
          max_tokens: 600,
          ...(chatIAType === 'tarea' && { response_format: { type: "json_object" } })
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error ${response.status}: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      const respuestaIA = data.choices[0].message.content;

      setChatIAMessages([...mensajesActualizados, { role: 'assistant', content: respuestaIA }]);

    } catch (error) {
      console.error('Error en chat IA:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setEnviandoMensajeIA(false);
    }
  };

  const aceptarContenidoIA = () => {
    const ultimoMensajeIA = chatIAMessages.filter(m => m.role === 'assistant').slice(-1)[0];

    if (!ultimoMensajeIA) return;

    if (chatIAType === 'interaccion') {
      setNuevaInteraccion({
        ...nuevaInteraccion,
        descripcion: ultimoMensajeIA.content
      });
    } else {
      try {
        const resultado = JSON.parse(ultimoMensajeIA.content);
        setNuevaTarea({
          ...nuevaTarea,
          titulo: resultado.titulo,
          descripcion: resultado.descripcion
        });
      } catch (error) {
        setNuevaTarea({
          ...nuevaTarea,
          descripcion: ultimoMensajeIA.content
        });
      }
    }

    setShowChatIA(false);
  };

  const handleGuardarInteraccion = async (e) => {
    e.preventDefault();
    setSubiendoArchivo(true);

    try {
      let archivoURL = null;
      let archivoNombre = null;

      // Subir archivo si existe
      if (archivoAdjunto) {
        try {
          console.log('Iniciando subida de archivo:', archivoAdjunto.name);
          const timestamp = Date.now();
          const nombreArchivo = `interacciones/${oportunidadDetalle.id}/${timestamp}_${archivoAdjunto.name}`;
          const archivoRef = ref(storage, nombreArchivo);

          await uploadBytes(archivoRef, archivoAdjunto);
          archivoURL = await getDownloadURL(archivoRef);
          archivoNombre = archivoAdjunto.name;
          console.log('Archivo subido exitosamente:', archivoURL);
        } catch (uploadError) {
          console.error('Error subiendo archivo:', uploadError);

          // Si falla la subida del archivo, preguntar si quiere continuar sin archivo
          const continuar = window.confirm(
            'No se pudo subir el archivo. Esto puede deberse a que Firebase Storage no está configurado.\n\n' +
            '¿Deseas guardar la interacción sin el archivo adjunto?'
          );

          if (!continuar) {
            setSubiendoArchivo(false);
            return;
          }
        }
      }

      if (editingInteraccionId) {
        // Editar interacción existente
        const updateData = {
          tipo: nuevaInteraccion.tipo,
          descripcion: nuevaInteraccion.descripcion || '',
          resultado: nuevaInteraccion.resultado || '',
          fecha: nuevaInteraccion.fecha
        };

        // Solo actualizar archivo si se subió uno nuevo
        if (archivoURL) {
          updateData.archivoURL = archivoURL;
          updateData.archivoNombre = archivoNombre;
        }

        await updateDoc(doc(db, 'interacciones', editingInteraccionId), updateData);
      } else {
        // Crear nueva interacción
        const nuevaInteraccionData = {
          ...nuevaInteraccion,
          oportunidadId: oportunidadDetalle.id,
          clienteId: oportunidadDetalle.clienteId,
          fechaCreacion: new Date().toISOString()
        };

        if (archivoURL) {
          nuevaInteraccionData.archivoURL = archivoURL;
          nuevaInteraccionData.archivoNombre = archivoNombre;
        }

        await addDoc(collection(db, 'interacciones'), nuevaInteraccionData);
      }

      // Recargar datos
      await loadData();

      // Resetear formulario
      setNuevaInteraccion({
        tipo: 'llamada',
        descripcion: '',
        resultado: '',
        fecha: new Date().toISOString().split('T')[0]
      });
      setArchivoAdjunto(null);
      setShowNuevaInteraccion(false);
      setEditingInteraccionId(null);

      alert('✅ Interacción guardada exitosamente');
    } catch (error) {
      console.error('Error guardando interacción:', error);
      alert('❌ Error al guardar la interacción: ' + error.message);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleEditarInteraccion = (interaccion) => {
    setNuevaInteraccion({
      tipo: interaccion.tipo,
      descripcion: interaccion.descripcion || '',
      resultado: interaccion.resultado || '',
      fecha: interaccion.fecha
    });
    setEditingInteraccionId(interaccion.id);
    setShowNuevaInteraccion(true);
  };

  const handleEliminarInteraccion = async (interaccionId) => {
    if (window.confirm('¿Estás seguro de eliminar esta interacción?')) {
      try {
        await deleteDoc(doc(db, 'interacciones', interaccionId));
        await loadData();
      } catch (error) {
        console.error('Error eliminando interacción:', error);
        alert('Error al eliminar la interacción');
      }
    }
  };

  const handleCancelarEdicionInteraccion = () => {
    setNuevaInteraccion({
      tipo: 'llamada',
      descripcion: '',
      resultado: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setArchivoAdjunto(null);
    setEditingInteraccionId(null);
    setShowNuevaInteraccion(false);
  };

  const handleEditarTarea = (tarea) => {
    setNuevaTarea({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion || '',
      prioridad: tarea.prioridad,
      fechaVencimiento: tarea.fechaVencimiento
    });
    setEditingTareaId(tarea.id);
    setShowNuevaTarea(true);
  };

  const handleCancelarEdicionTarea = () => {
    setNuevaTarea({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fechaVencimiento: ''
    });
    setEditingTareaId(null);
    setShowNuevaTarea(false);
  };

  const handleGuardarTarea = async (e) => {
    e.preventDefault();
    try {
      if (editingTareaId) {
        // Editar tarea existente
        await updateDoc(doc(db, 'tareas', editingTareaId), {
          titulo: nuevaTarea.titulo,
          descripcion: nuevaTarea.descripcion,
          prioridad: nuevaTarea.prioridad,
          fechaVencimiento: nuevaTarea.fechaVencimiento
        });
      } else {
        // Crear nueva tarea
        await addDoc(collection(db, 'tareas'), {
          ...nuevaTarea,
          estado: 'pendiente',
          fechaCreacion: new Date().toISOString(),
          responsable: oportunidadDetalle.usuarioResponsableId || currentUser.id,
          relacionadoCon: 'oportunidad',
          relacionadoId: oportunidadDetalle.id,
          relacionadoNombre: oportunidadDetalle.nombre
        });
      }

      // Recargar tareas
      const tareasSnap = await getDocs(collection(db, 'tareas'));
      const todasTareas = tareasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tareasOportunidad = todasTareas.filter(t => t.relacionadoId === oportunidadDetalle.id && t.relacionadoCon === 'oportunidad');
      setTareasRelacionadas(tareasOportunidad);

      // Resetear formulario
      setNuevaTarea({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        fechaVencimiento: ''
      });
      setEditingTareaId(null);
      setShowNuevaTarea(false);
    } catch (error) {
      console.error('Error guardando tarea:', error);
      alert('Error al guardar la tarea');
    }
  };

  const getTipoInteraccionIcon = (tipo) => {
    const tipos = {
      'llamada': '📞',
      'email': '📧',
      'reunion': '🤝',
      'mensaje': '💬',
      'otro': '📝'
    };
    return tipos[tipo] || '📝';
  };

  const handleExport = () => {
    const dataToExport = oportunidades.map(op => ({
      Nombre: op.nombre,
      Cliente: getClienteNombre(op.clienteId),
      Empresa: getEmpresaNombre(op.empresaId),
      Responsable: getUsuarioNombre(op.usuarioResponsableId),
      Valor: op.valor,
      Probabilidad: op.probabilidad + '%',
      Etapa: op.etapa,
      'Fecha Cierre': formatDate(op.fechaEstimadaCierre)
    }));
    exportToExcel(dataToExport, 'Oportunidades');
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
            <div className="flex gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setVistaKanban(true)}
                  className={`px-4 py-2 rounded-md transition-all ${vistaKanban ? 'bg-white shadow text-blue-900 font-semibold' : 'text-gray-600'}`}
                >
                  📋 Kanban
                </button>
                <button
                  onClick={() => setVistaKanban(false)}
                  className={`px-4 py-2 rounded-md transition-all ${!vistaKanban ? 'bg-white shadow text-blue-900 font-semibold' : 'text-gray-600'}`}
                >
                  📊 Tabla
                </button>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all shadow-md"
              >
                <Download className="w-5 h-5" />
                Exportar
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Nueva Oportunidad
              </button>
            </div>
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
        ) : vistaKanban ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {etapas.map(etapa => (
              <div
                key={etapa.value}
                className="flex-1 min-w-[240px] bg-gray-50 rounded-lg p-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, etapa.value)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{etapa.label}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEtapaInfo(etapa.value);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Información de esta etapa"
                    >
                      <HelpCircle size={18} />
                    </button>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${etapa.color}`}>
                    {getOportunidadesPorEtapa(etapa.value).length}
                  </span>
                </div>
                <div className="space-y-3 min-h-[400px]">
                  {getOportunidadesPorEtapa(etapa.value).map(oportunidad => (
                    <div
                      key={oportunidad.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, oportunidad.id)}
                      onClick={() => handleAbrirDetalle(oportunidad)}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-400 transition-all cursor-pointer"
                    >
                      <h5 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                        <span>{oportunidad.nombre}</span>
                        <span className="text-xs text-gray-400">👁️ Ver detalle</span>
                      </h5>
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <p>👤 {getClienteNombre(oportunidad.clienteId)}</p>
                        <p className="font-semibold text-green-600">{formatCurrency(oportunidad.valor)}</p>
                        <p>📅 {formatDate(oportunidad.fechaEstimadaCierre)}</p>
                        {getInteraccionesPorOportunidad(oportunidad.id).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Interacciones:</p>
                            <div className="flex gap-1 flex-wrap">
                              {getInteraccionesPorOportunidad(oportunidad.id).slice(0, 3).map(interaccion => (
                                <button
                                  key={interaccion.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInteraccionSeleccionada(interaccion);
                                  }}
                                  className="text-lg hover:scale-125 transition-transform cursor-pointer"
                                  title="Click para ver detalles"
                                >
                                  {getTipoInteraccionIcon(interaccion.tipo)}
                                </button>
                              ))}
                              {getInteraccionesPorOportunidad(oportunidad.id).length > 3 && (
                                <span className="text-xs text-gray-400">+{getInteraccionesPorOportunidad(oportunidad.id).length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${oportunidad.probabilidad || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{oportunidad.probabilidad}%</span>
                        </div>
                        <div className="flex gap-2">
                          {oportunidad.etapa === 'Cerrado Ganado' && !oportunidad.convertidoACliente && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowConvertirClienteModal(oportunidad);
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 transition-all"
                            >
                              → Cliente
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(oportunidad)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Oportunidad</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Prob. Manual</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-center gap-1">
                      <Award size={20} className="text-purple-600" />
                      <span>IA Prob.</span>
                    </div>
                  </th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider bg-gradient-to-r from-pink-50 to-purple-50">Siguiente Acción</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Etapa</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Cierre Est.</th>
                  <th className="px-6 py-10 text-center text-base font-bold text-black uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {oportunidades.map((oportunidad) => {
                  // IA Predictiva
                  const aiProbabilidad = calcularProbabilidadCierre(oportunidad, interacciones);
                  const siguienteAccion = recomendarSiguienteAccion(oportunidad, 'oportunidad', interacciones);

                  return (
                  <tr key={oportunidad.id} className="hover:bg-gray-50">
                    <td className="px-6 py-12 text-center">
                      <div className="text-xl font-bold text-black">{oportunidad.nombre}</div>
                      {oportunidad.empresaId && (
                        <div className="text-sm text-gray-500">{getEmpresaNombre(oportunidad.empresaId)}</div>
                      )}
                    </td>
                    <td className="px-6 py-12 text-center text-base text-gray-900">{getClienteNombre(oportunidad.clienteId)}</td>
                    <td className="px-6 py-12 text-center text-base text-gray-900">{getUsuarioNombre(oportunidad.usuarioResponsableId)}</td>
                    <td className="px-6 py-12 text-center text-base font-semibold text-gray-900">{formatCurrency(oportunidad.valor)}</td>
                    <td className="px-6 py-12">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full"
                            style={{ width: `${oportunidad.probabilidad || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-base text-gray-600">{oportunidad.probabilidad}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-12 bg-gradient-to-r from-purple-50 to-pink-50">
                      <div className="flex items-center justify-center gap-2">
                        <Award size={20} className={aiProbabilidad >= 70 ? 'text-green-600' : aiProbabilidad >= 40 ? 'text-yellow-600' : 'text-red-600'} />
                        <div className="w-24 bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${aiProbabilidad >= 70 ? 'bg-green-600' : aiProbabilidad >= 40 ? 'bg-yellow-600' : 'bg-red-600'}`}
                            style={{ width: `${aiProbabilidad}%` }}
                          ></div>
                        </div>
                        <span className={`text-base font-bold ${aiProbabilidad >= 70 ? 'text-green-600' : aiProbabilidad >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {aiProbabilidad}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-12 bg-gradient-to-r from-pink-50 to-purple-50">
                      <div className="space-y-1 flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{siguienteAccion.icono}</span>
                          <span className="font-semibold text-sm text-gray-900">{siguienteAccion.accion}</span>
                        </div>
                        <div className={`text-sm px-2 py-1 rounded inline-block ${
                          siguienteAccion.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                          siguienteAccion.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {siguienteAccion.prioridad.toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-12 text-center">
                      <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getEtapaColor(oportunidad.etapa)}`}>
                        {oportunidad.etapa}
                      </span>
                    </td>
                    <td className="px-6 py-12 text-center text-base text-gray-900">{formatDate(oportunidad.fechaEstimadaCierre)}</td>
                    <td className="px-6 py-12 text-center text-base font-medium">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(oportunidad)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(oportunidad.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
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

      {/* Modal de Interacción */}
      {interaccionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setInteraccionSeleccionada(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getTipoInteraccionIcon(interaccionSeleccionada.tipo)}</span>
                <h3 className="text-2xl font-bold text-gray-900 capitalize">{interaccionSeleccionada.tipo}</h3>
              </div>
              <button
                onClick={() => setInteraccionSeleccionada(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {clientes.find(c => c.id === interaccionSeleccionada.clienteId)?.nombre || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuario</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {usuarios.find(u => u.id === interaccionSeleccionada.usuarioId)?.nombre || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(interaccionSeleccionada.fecha).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {interaccionSeleccionada.hora && (
                  <div>
                    <p className="text-sm text-gray-500">Hora</p>
                    <p className="text-lg font-semibold text-gray-900">{interaccionSeleccionada.hora}</p>
                  </div>
                )}
              </div>

              {interaccionSeleccionada.duracion && (
                <div>
                  <p className="text-sm text-gray-500">Duración</p>
                  <p className="text-lg text-gray-900">{interaccionSeleccionada.duracion}</p>
                </div>
              )}

              {interaccionSeleccionada.notas && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Resumen / Notas</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{interaccionSeleccionada.notas}</p>
                  </div>
                </div>
              )}

              {interaccionSeleccionada.seguimiento && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seguimiento</p>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-gray-900">{interaccionSeleccionada.seguimiento}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  interaccionSeleccionada.completado
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {interaccionSeleccionada.completado ? '✓ Completado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setInteraccionSeleccionada(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conversión a Cliente */}
      {showConvertirClienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConvertirClienteModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 lg:p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRight className="text-green-600" size={28} />
                Convertir a Cliente
              </h3>
              <button onClick={() => setShowConvertirClienteModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="font-semibold text-green-900">{showConvertirClienteModal.nombre}</p>
                <p className="text-green-700">{showConvertirClienteModal.clienteNombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Valor Cerrado</p>
                  <p className="text-lg font-semibold text-green-600">${showConvertirClienteModal.valor}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base">{showConvertirClienteModal.clienteEmail || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Probabilidad</p>
                  <p className="text-base">{showConvertirClienteModal.probabilidad}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Cierre</p>
                  <p className="text-base">{showConvertirClienteModal.fechaEstimadaCierre ? new Date(showConvertirClienteModal.fechaEstimadaCierre).toLocaleDateString('es-MX') : 'No especificada'}</p>
                </div>
              </div>

              {showConvertirClienteModal.notas && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Notas de la Oportunidad</p>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <p className="text-gray-900 whitespace-pre-wrap">{showConvertirClienteModal.notas}</p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  ℹ️ Se creará un nuevo cliente con la información de esta oportunidad. Si ya existe un cliente con el mismo email, la oportunidad se vinculará a ese cliente existente.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleConvertirACliente(showConvertirClienteModal)}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRight size={20} />
                  Convertir a Cliente
                </button>
                <button
                  onClick={() => setShowConvertirClienteModal(null)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Detalle Lateral - Historial Completo */}
      {oportunidadDetalle && (() => {
        const colores = getEmpresaColores(oportunidadDetalle.empresaId);
        return (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setOportunidadDetalle(null)}
          />

          {/* Panel lateral */}
          <div className="absolute inset-y-0 right-0 max-w-[900px] w-full bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 sticky top-0 z-10" style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Detalle de Oportunidad</h3>
                <button
                  onClick={() => setOportunidadDetalle(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X size={40} />
                </button>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <h4 className="text-xl font-bold text-white mb-2">{oportunidadDetalle.nombre}</h4>
                <div className="flex items-center gap-4 text-white text-sm">
                  <span className={`px-3 py-1 rounded-full font-semibold ${getEtapaColor(oportunidadDetalle.etapa)}`}>
                    {oportunidadDetalle.etapa}
                  </span>
                  <span className="font-bold text-lg">{formatCurrency(oportunidadDetalle.valor)}</span>
                </div>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Información Básica */}
              <div className="bg-white rounded-xl border-2 p-5" style={{borderColor: colores.primario}}>
                <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info size={34} style={{color: colores.primario}} />
                  Información General
                </h5>
                <div className="grid grid-cols-2 gap-4 text-base">
                  <div>
                    <p className="text-gray-500 font-medium">Cliente</p>
                    <p className="text-gray-900 font-semibold">{getClienteNombre(oportunidadDetalle.clienteId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Empresa</p>
                    <p className="text-gray-900">{getEmpresaNombre(oportunidadDetalle.empresaId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Responsable</p>
                    <p className="text-gray-900">{getUsuarioNombre(oportunidadDetalle.usuarioResponsableId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Probabilidad</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${oportunidadDetalle.probabilidad}%`, backgroundColor: colores.primario }}
                        />
                      </div>
                      <span className="text-gray-900 font-semibold">{oportunidadDetalle.probabilidad}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Fecha Estimada Cierre</p>
                    <p className="text-gray-900">{formatDate(oportunidadDetalle.fechaEstimadaCierre)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Creada</p>
                    <p className="text-gray-900">{formatDate(oportunidadDetalle.fechaCreacion)}</p>
                  </div>
                </div>

                {oportunidadDetalle.notas && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-500 font-medium mb-2">Notas</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-gray-900 text-base">
                      {oportunidadDetalle.notas}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline de Interacciones */}
              <div className="bg-white rounded-xl border-2 p-5" style={{borderColor: colores.primario}}>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Phone size={26} style={{color: colores.primario}} />
                    Interacciones ({getInteraccionesPorOportunidad(oportunidadDetalle.id).length})
                  </h5>
                  <button
                    onClick={() => {
                      if (showNuevaInteraccion || editingInteraccionId) {
                        handleCancelarEdicionInteraccion();
                      } else {
                        setShowNuevaInteraccion(true);
                      }
                    }}
                    className="text-white px-3 py-1 rounded-lg text-base font-semibold flex items-center gap-1 transition-colors"
                    style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Plus size={20} />
                    {showNuevaInteraccion || editingInteraccionId ? 'Cancelar' : 'Nueva'}
                  </button>
                </div>

                {/* Formulario Nueva Interacción */}
                {showNuevaInteraccion && (
                  <form onSubmit={handleGuardarInteraccion} className="mb-4 p-4 rounded-lg border-2" style={{backgroundColor: `${colores.primario}10`, borderColor: colores.primario}}>
                    <h6 className="text-base font-bold text-gray-800 mb-3">
                      {editingInteraccionId ? '✏️ Editar Interacción' : '➕ Nueva Interacción'}
                    </h6>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                          <select
                            required
                            value={nuevaInteraccion.tipo}
                            onChange={(e) => setNuevaInteraccion({...nuevaInteraccion, tipo: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none"
                            style={{'--tw-ring-color': colores.primario}}
                            onFocus={(e) => e.target.style.borderColor = colores.primario}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          >
                            <option value="llamada">📞 Llamada</option>
                            <option value="email">📧 Email</option>
                            <option value="reunion">🤝 Reunión</option>
                            <option value="mensaje">💬 Mensaje</option>
                            <option value="otro">📝 Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                          <input
                            type="date"
                            required
                            value={nuevaInteraccion.fecha}
                            onChange={(e) => setNuevaInteraccion({...nuevaInteraccion, fecha: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-green-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold text-gray-700">Descripción *</label>
                          <button
                            type="button"
                            onClick={() => abrirChatIA('interaccion')}
                            className="text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                          >
                            ✨ Ayuda con IA
                          </button>
                        </div>
                        <textarea
                          required
                          rows="4"
                          value={nuevaInteraccion.descripcion}
                          onChange={(e) => setNuevaInteraccion({...nuevaInteraccion, descripcion: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-green-500 focus:outline-none"
                          placeholder="Escribe el contexto o deja vacío para que la IA lo genere automáticamente..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Tip: Escribe puntos clave y haz clic en "Ayuda con IA" para generar contenido profesional
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Resultado</label>
                        <input
                          type="text"
                          value={nuevaInteraccion.resultado}
                          onChange={(e) => setNuevaInteraccion({...nuevaInteraccion, resultado: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-green-500 focus:outline-none"
                          placeholder="Resultado o próximos pasos"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <Paperclip size={18} />
                          Archivo Adjunto (PDF, Minutas, Acuerdos) - Opcional
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => setArchivoAdjunto(e.target.files[0])}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-green-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                          />
                          {archivoAdjunto && (
                            <button
                              type="button"
                              onClick={() => setArchivoAdjunto(null)}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold"
                            >
                              ✕ Quitar
                            </button>
                          )}
                        </div>
                        {archivoAdjunto && (
                          <p className="text-sm text-green-700 mt-1 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                            <FileText size={16} />
                            <span className="font-semibold">Seleccionado:</span> {archivoAdjunto.name}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          ⚠️ Nota: Requiere Firebase Storage habilitado
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={subiendoArchivo}
                        className="w-full text-white py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        style={{background: subiendoArchivo ? undefined : `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                      >
                        {subiendoArchivo ? 'Subiendo archivo...' : editingInteraccionId ? 'Guardar Cambios' : 'Guardar Interacción'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Interacciones (más nuevo primero) */}
                {getInteraccionesPorOportunidad(oportunidadDetalle.id).length === 0 && !showNuevaInteraccion ? (
                  <p className="text-gray-500 text-base italic">No hay interacciones registradas</p>
                ) : (
                  <div className="space-y-3">
                    {getInteraccionesPorOportunidad(oportunidadDetalle.id)
                      .sort((a, b) => new Date(b.fechaCreacion || b.fecha) - new Date(a.fechaCreacion || a.fecha))
                      .map(interaccion => (
                        <div
                          key={interaccion.id}
                          className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          onClick={() => setInteraccionDetalleView(interaccion)}
                        >
                          <div className="text-2xl">{getTipoInteraccionIcon(interaccion.tipo)}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 capitalize">{interaccion.tipo}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{formatDate(interaccion.fecha)}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarInteraccion(interaccion);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar interacción"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEliminarInteraccion(interaccion.id);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar interacción"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            <p className="text-base text-gray-700 line-clamp-2">{interaccion.descripcion}</p>
                            {interaccion.archivoURL && (
                              <div className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                <Paperclip size={16} />
                                Archivo adjunto
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Tareas Relacionadas */}
              <div className="bg-white rounded-xl border-2 p-5" style={{borderColor: colores.primario}}>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList size={26} style={{color: colores.primario}} />
                    Tareas ({tareasRelacionadas.length})
                  </h5>
                  <button
                    onClick={() => {
                      if (showNuevaTarea || editingTareaId) {
                        handleCancelarEdicionTarea();
                      } else {
                        setShowNuevaTarea(true);
                      }
                    }}
                    className="text-white px-3 py-1 rounded-lg text-base font-semibold flex items-center gap-1 transition-colors"
                    style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Plus size={20} />
                    {showNuevaTarea || editingTareaId ? 'Cancelar' : 'Nueva'}
                  </button>
                </div>

                {/* Formulario Nueva Tarea */}
                {showNuevaTarea && (
                  <form onSubmit={handleGuardarTarea} className="mb-4 p-4 rounded-lg border-2" style={{backgroundColor: `${colores.primario}10`, borderColor: colores.primario}}>
                    <h6 className="text-base font-bold text-gray-800 mb-3">
                      {editingTareaId ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}
                    </h6>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-semibold text-gray-700">Título *</label>
                          <button
                            type="button"
                            onClick={() => abrirChatIA('tarea')}
                            className="text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                          >
                            ✨ Ayuda con IA
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={nuevaTarea.titulo}
                          onChange={(e) => setNuevaTarea({...nuevaTarea, titulo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-purple-500 focus:outline-none"
                          placeholder="¿Qué hay que hacer?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                        <textarea
                          rows="2"
                          value={nuevaTarea.descripcion}
                          onChange={(e) => setNuevaTarea({...nuevaTarea, descripcion: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-purple-500 focus:outline-none"
                          placeholder="Detalles de la tarea..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label>
                          <select
                            value={nuevaTarea.prioridad}
                            onChange={(e) => setNuevaTarea({...nuevaTarea, prioridad: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-purple-500 focus:outline-none"
                          >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Vencimiento *</label>
                          <input
                            type="date"
                            required
                            value={nuevaTarea.fechaVencimiento}
                            onChange={(e) => setNuevaTarea({...nuevaTarea, fechaVencimiento: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full text-white py-2 rounded-lg font-semibold transition-colors"
                        style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        {editingTareaId ? 'Guardar Cambios' : 'Guardar Tarea'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Tareas (más nuevo primero) */}
                {tareasRelacionadas.length === 0 && !showNuevaTarea ? (
                  <p className="text-gray-500 text-base italic">No hay tareas relacionadas</p>
                ) : (
                  <div className="space-y-2">
                    {tareasRelacionadas
                      .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
                      .map(tarea => (
                        <div key={tarea.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="mt-0.5">
                            {tarea.estado === 'completada' ? (
                              <span className="text-green-600 text-xl">✓</span>
                            ) : (
                              <span className="text-orange-500 text-xl">○</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-base">{tarea.titulo}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className={`text-base px-2 py-1 rounded font-semibold ${
                                  tarea.estado === 'completada' ? 'bg-green-100 text-green-800' :
                                  tarea.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {tarea.estado === 'completada' ? 'Completada' :
                                   tarea.estado === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
                                </span>
                                <button
                                  onClick={() => handleEditarTarea(tarea)}
                                  className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                  title="Editar tarea"
                                >
                                  <Edit2 size={18} />
                                </button>
                              </div>
                            </div>
                            <p className="text-base text-gray-600 mb-1">{tarea.descripcion}</p>
                            <div className="flex items-center gap-4 text-base text-gray-500">
                              <span>📅 Vence: {formatDate(tarea.fechaVencimiento)}</span>
                              <span className={`font-semibold ${
                                tarea.prioridad === 'urgente' ? 'text-red-600' :
                                tarea.prioridad === 'alta' ? 'text-orange-600' :
                                tarea.prioridad === 'media' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {tarea.prioridad?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="sticky bottom-0 bg-white border-t-2 pt-4" style={{borderColor: colores.primario}}>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleEdit(oportunidadDetalle);
                      setOportunidadDetalle(null);
                    }}
                    className="flex-1 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <Edit2 size={18} />
                    Editar Oportunidad
                  </button>
                  <button
                    onClick={() => setOportunidadDetalle(null)}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal Detalle de Interacción */}
      {interaccionDetalleView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setInteraccionDetalleView(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{getTipoInteraccionIcon(interaccionDetalleView.tipo)}</div>
                  <div>
                    <h2 className="text-2xl font-bold capitalize">{interaccionDetalleView.tipo}</h2>
                    <p className="text-green-100 text-sm">{formatDate(interaccionDetalleView.fecha)}</p>
                  </div>
                </div>
                <button onClick={() => setInteraccionDetalleView(null)} className="text-white hover:text-gray-200">
                  <X size={32} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Descripción */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Descripción</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{interaccionDetalleView.descripcion}</p>
              </div>

              {/* Resultado */}
              {interaccionDetalleView.resultado && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">Resultado</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{interaccionDetalleView.resultado}</p>
                </div>
              )}

              {/* Archivo Adjunto */}
              {interaccionDetalleView.archivoURL && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <Paperclip size={16} />
                    Archivo Adjunto
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white rounded-lg p-3 border-2 border-green-200">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <FileText size={18} className="text-green-600" />
                        {interaccionDetalleView.archivoNombre || 'Archivo adjunto'}
                      </p>
                    </div>
                    <a
                      href={interaccionDetalleView.archivoURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={18} />
                      Abrir
                    </a>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Información Adicional</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium">Tipo de Interacción</p>
                    <p className="text-gray-900 font-semibold capitalize">{interaccionDetalleView.tipo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">Fecha</p>
                    <p className="text-gray-900 font-semibold">{formatDate(interaccionDetalleView.fecha)}</p>
                  </div>
                  {interaccionDetalleView.fechaCreacion && (
                    <div className="col-span-2">
                      <p className="text-gray-500 font-medium">Creado el</p>
                      <p className="text-gray-900">{new Date(interaccionDetalleView.fechaCreacion).toLocaleString('es-MX')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setInteraccionDetalleView(null);
                    handleEditarInteraccion(interaccionDetalleView);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Editar
                </button>
                <button
                  onClick={() => setInteraccionDetalleView(null)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chat con IA */}
      {showChatIA && oportunidadDetalle && (() => {
        const colores = getEmpresaColores(oportunidadDetalle.empresaId);
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b" style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  ✨ Asistente de IA
                  <span className="text-sm font-normal opacity-90">
                    ({chatIAType === 'interaccion' ? 'Interacción' : 'Tarea'})
                  </span>
                </h3>
                <button
                  onClick={() => setShowChatIA(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mensajes del chat */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {chatIAMessages.map((mensaje, index) => (
                <div
                  key={index}
                  className={`flex ${mensaje.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      mensaje.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border-2 shadow-sm'
                    }`}
                    style={mensaje.role === 'assistant' ? {borderColor: colores.primario} : {}}
                  >
                    {mensaje.role === 'assistant' && chatIAType === 'tarea' ? (
                      // Para tareas, intentar parsear el JSON
                      (() => {
                        try {
                          const data = JSON.parse(mensaje.content);
                          return (
                            <div className="space-y-2">
                              <div>
                                <span className="font-bold text-sm" style={{color: colores.primario}}>Título:</span>
                                <p className="text-base text-gray-900 mt-1">{data.titulo}</p>
                              </div>
                              <div>
                                <span className="font-bold text-sm" style={{color: colores.primario}}>Descripción:</span>
                                <p className="text-base text-gray-700 mt-1 whitespace-pre-line">{data.descripcion}</p>
                              </div>
                            </div>
                          );
                        } catch {
                          return <p className="text-base text-gray-800 whitespace-pre-line">{mensaje.content}</p>;
                        }
                      })()
                    ) : (
                      <p className="text-base whitespace-pre-line">{mensaje.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {enviandoMensajeIA && (
                <div className="flex justify-start">
                  <div className="bg-white border-2 rounded-lg p-4" style={{borderColor: colores.primario}}>
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                      Pensando...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input para enviar mensajes */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mensajeUsuarioIA}
                  onChange={(e) => setMensajeUsuarioIA(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !enviandoMensajeIA) {
                      enviarMensajeIA();
                    }
                  }}
                  placeholder="Escribe tus ajustes... (ej: 'hazlo más corto', 'agrega descuento 10%')"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={enviandoMensajeIA}
                />
                <button
                  onClick={enviarMensajeIA}
                  disabled={enviandoMensajeIA || !mensajeUsuarioIA.trim()}
                  className="px-6 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
                >
                  Enviar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Pide ajustes hasta que quede perfecto, luego acepta el contenido
              </p>
            </div>

            {/* Footer con botones */}
            <div className="p-4 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowChatIA(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={aceptarContenidoIA}
                disabled={chatIAMessages.filter(m => m.role === 'assistant').length === 0}
                className="px-6 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{background: `linear-gradient(to right, ${colores.primario}, ${colores.secundario})`}}
              >
                ✓ Aceptar y Usar
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal de Información de Etapas */}
      {showEtapaInfo && etapasInfo[showEtapaInfo] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{showEtapaInfo}</h3>
                  <p className="text-blue-100 mt-1">Probabilidad de cierre: {etapasInfo[showEtapaInfo].probabilidad}</p>
                </div>
                <button
                  onClick={() => setShowEtapaInfo(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Descripción */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">📋 Descripción</h4>
                <p className="text-gray-700">{etapasInfo[showEtapaInfo].descripcion}</p>
              </div>

              {/* Objetivos */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">🎯 Objetivos de esta etapa</h4>
                <ul className="space-y-2">
                  {etapasInfo[showEtapaInfo].objetivos.map((objetivo, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-gray-700">{objetivo}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Duración y Probabilidad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">⏱️ Duración típica</p>
                  <p className="text-xl font-bold text-blue-900">{etapasInfo[showEtapaInfo].duracion}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium mb-1">📊 Probabilidad base</p>
                  <p className="text-xl font-bold text-green-900">{etapasInfo[showEtapaInfo].probabilidad}</p>
                </div>
              </div>

              {/* Botón cerrar */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEtapaInfo(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
      const etapas = ['Contacto Inicial', 'Calificación', 'Análisis de Necesidades', 'Presentación/Demo', 'Propuesta Enviada', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
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

// Módulo Login/Autenticación
function LoginModule({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Buscar datos del usuario en Firestore
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuario = usuariosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(u => u.email === email);

      if (!usuario) {
        setError('Usuario no encontrado en la base de datos');
        await signOut(auth);
        setLoading(false);
        return;
      }

      if (!usuario.activo) {
        setError('Usuario inactivo - Contacta al administrador');
        await signOut(auth);
        setLoading(false);
        return;
      }

      // Login exitoso
      onLogin({ ...usuario, uid: firebaseUser.uid });
    } catch (err) {
      console.error('Error en login:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado en Firebase Auth');
      } else if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas');
      } else {
        setError('Error al iniciar sesión: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-900 to-orange-500 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Briefcase size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GRX CRM</h1>
          <p className="text-gray-600">Sistema de Gestión de Relaciones con Clientes</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-orange-500 text-white py-3 rounded-lg font-bold text-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800 font-semibold mb-2">🔐 Acceso Seguro</p>
          <p className="text-xs text-blue-700">Usa tu email y contraseña registrados en Firebase Auth</p>
        </div>
      </div>
    </div>
  );
}

// Módulo Productos
function ProductosModule({ currentUser }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'servicio',
    sku: '',
    activo: true,
    stock: '',
    empresaId: currentUser?.empresaId || ''
  });

  const categorias = [
    { value: 'servicio', label: 'Servicio', icon: '🔧' },
    { value: 'software', label: 'Software', icon: '💻' },
    { value: 'licencia', label: 'Licencia', icon: '📜' },
    { value: 'hardware', label: 'Hardware', icon: '⚙️' },
    { value: 'consultoria', label: 'Consultoría', icon: '📊' },
    { value: 'otro', label: 'Otro', icon: '📦' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const productosSnap = await getDocs(collection(db, 'productos'));
      setProductos(productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'productos', editingId), formData);
        alert('Producto actualizado exitosamente!');
      } else {
        await addDoc(collection(db, 'productos'), {
          ...formData,
          fechaCreacion: new Date().toISOString(),
          creadoPor: currentUser?.id
        });
        alert('Producto creado exitosamente!');
      }
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (producto) => {
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      categoria: producto.categoria,
      sku: producto.sku || '',
      activo: producto.activo,
      stock: producto.stock || '',
      empresaId: producto.empresaId || ''
    });
    setEditingId(producto.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este producto?')) {
      try {
        await deleteDoc(doc(db, 'productos', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando producto:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: 'servicio',
      sku: '',
      activo: true,
      stock: '',
      empresaId: currentUser?.empresaId || ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Productos</h2>
        <p className="text-blue-100 mt-2">Catálogo de productos y servicios</p>
      </div>

      {/* Controles superiores */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-orange-500">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => exportToExcel(productos, 'productos')}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            <Download size={24} />
            <span className="text-xl">Exportar</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            {showForm ? <X size={24} /> : <Plus size={24} />}
            <span className="text-xl">{showForm ? 'Cancelar' : 'Nuevo Producto'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            {editingId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                <select
                  required
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {categorias.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                  className="w-5 h-5 mr-2"
                />
                <label className="text-sm font-semibold text-gray-700">Producto Activo</label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                <Save size={20} />
                <span>Guardar</span>
              </button>
              <button type="button" onClick={resetForm} className="bg-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de productos */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
          <h3 className="text-2xl font-semibold mb-6 text-blue-900">
            Listado de Productos ({productosFiltrados.length})
          </h3>
          {productosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay productos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Producto</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">SKU</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Categoría</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Precio</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Estado</th>
                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const categoria = categorias.find(c => c.value === producto.categoria);
                    return (
                      <tr key={producto.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{producto.nombre}</p>
                            {producto.descripcion && (
                              <p className="text-sm text-gray-500">{producto.descripcion.substring(0, 60)}...</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{producto.sku || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{categoria?.icon} {categoria?.label}</span>
                        </td>
                        <td className="px-6 py-4 text-lg font-bold text-green-600">
                          ${parseFloat(producto.precio).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{producto.stock || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            producto.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {producto.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(producto)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={() => handleDelete(producto.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
      )}
    </div>
  );
}

// Módulo Cotizaciones (Quotes)
function CotizacionesModule({ currentUser }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todas');

  const [formData, setFormData] = useState({
    numero: '',
    clienteId: '',
    oportunidadId: '',
    fecha: new Date().toISOString().split('T')[0],
    validezDias: 30,
    items: [],
    descuentoGlobal: 0,
    notas: '',
    terminosCondiciones: 'Pago: 50% anticipo, 50% contra entrega\nTiempo de entrega: 15 días hábiles\nGarantía: 12 meses',
    estado: 'borrador'
  });

  const [nuevoItem, setNuevoItem] = useState({
    productoId: '',
    cantidad: 1,
    precioUnitario: 0,
    descuento: 0
  });

  const estados = [
    { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
    { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-800' },
    { value: 'aceptada', label: 'Aceptada', color: 'bg-green-100 text-green-800' },
    { value: 'rechazada', label: 'Rechazada', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cotizacionesSnap, productosSnap, clientesSnap, oportunidadesSnap] = await Promise.all([
        getDocs(collection(db, 'cotizaciones')),
        getDocs(collection(db, 'productos')),
        getDocs(collection(db, 'clientes')),
        getDocs(collection(db, 'oportunidades'))
      ]);

      const cotizacionesList = cotizacionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cotizacionesList.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setCotizaciones(cotizacionesList);
      setProductos(productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setOportunidades(oportunidadesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarNumero = () => {
    const año = new Date().getFullYear();
    const numero = cotizaciones.length + 1;
    return `COT-${año}-${String(numero).padStart(4, '0')}`;
  };

  const agregarItem = () => {
    if (!nuevoItem.productoId) {
      alert('Selecciona un producto');
      return;
    }

    const producto = productos.find(p => p.id === nuevoItem.productoId);
    const item = {
      productoId: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      cantidad: parseFloat(nuevoItem.cantidad) || 1,
      precioUnitario: parseFloat(nuevoItem.precioUnitario) || producto.precio,
      descuento: parseFloat(nuevoItem.descuento) || 0
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNuevoItem({
      productoId: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0
    });
  };

  const eliminarItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularSubtotal = (item) => {
    const subtotal = item.cantidad * item.precioUnitario;
    const descuento = subtotal * (item.descuento / 100);
    return subtotal - descuento;
  };

  const calcularTotales = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calcularSubtotal(item), 0);
    const descuentoGlobal = subtotal * (formData.descuentoGlobal / 100);
    const subtotalConDescuento = subtotal - descuentoGlobal;
    const iva = subtotalConDescuento * 0.16;
    const total = subtotalConDescuento + iva;

    return { subtotal, descuentoGlobal, subtotalConDescuento, iva, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Agrega al menos un producto a la cotización');
      return;
    }

    try {
      const totales = calcularTotales();
      const cotizacionData = {
        ...formData,
        numero: editingId ? formData.numero : generarNumero(),
        subtotal: totales.subtotal,
        descuentoGlobalMonto: totales.descuentoGlobal,
        iva: totales.iva,
        total: totales.total,
        creadoPor: currentUser.id,
        fechaCreacion: editingId ? formData.fechaCreacion : new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'cotizaciones', editingId), cotizacionData);
      } else {
        await addDoc(collection(db, 'cotizaciones'), cotizacionData);
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error guardando cotización:', error);
      alert('Error al guardar la cotización');
    }
  };

  const handleEdit = (cotizacion) => {
    setEditingId(cotizacion.id);
    setFormData({
      numero: cotizacion.numero,
      clienteId: cotizacion.clienteId,
      oportunidadId: cotizacion.oportunidadId || '',
      fecha: cotizacion.fecha,
      validezDias: cotizacion.validezDias,
      items: cotizacion.items,
      descuentoGlobal: cotizacion.descuentoGlobal,
      notas: cotizacion.notas,
      terminosCondiciones: cotizacion.terminosCondiciones,
      estado: cotizacion.estado
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta cotización?')) {
      try {
        await deleteDoc(doc(db, 'cotizaciones', id));
        loadData();
      } catch (error) {
        console.error('Error eliminando cotización:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      clienteId: '',
      oportunidadId: '',
      fecha: new Date().toISOString().split('T')[0],
      validezDias: 30,
      items: [],
      descuentoGlobal: 0,
      notas: '',
      terminosCondiciones: 'Pago: 50% anticipo, 50% contra entrega\nTiempo de entrega: 15 días hábiles\nGarantía: 12 meses',
      estado: 'borrador'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleExport = () => {
    const dataToExport = cotizaciones.map(cot => ({
      'Número': cot.numero,
      'Cliente': clientes.find(c => c.id === cot.clienteId)?.nombre || 'N/A',
      'Fecha': new Date(cot.fecha).toLocaleDateString(),
      'Subtotal': `$${cot.subtotal?.toFixed(2)}`,
      'IVA': `$${cot.iva?.toFixed(2)}`,
      'Total': `$${cot.total?.toFixed(2)}`,
      'Estado': estados.find(e => e.value === cot.estado)?.label,
      'Validez': `${cot.validezDias} días`
    }));
    exportToExcel(dataToExport, 'Cotizaciones');
  };

  const cotizacionesFiltradas = cotizaciones.filter(cot => {
    const cliente = clientes.find(c => c.id === cot.clienteId);
    const matchSearch = !searchTerm ||
      cot.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchEstado = filterEstado === 'todas' || cot.estado === filterEstado;

    return matchSearch && matchEstado;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl text-gray-600">Cargando cotizaciones...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Cotizaciones</h2>
        <p className="text-blue-100 mt-2">Gestión de cotizaciones y propuestas comerciales</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-blue-900">
            {showForm ? (editingId ? 'Editar Cotización' : 'Nueva Cotización') : 'Lista de Cotizaciones'}
          </h3>
          {!showForm && (
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all shadow-md"
              >
                <Download size={20} />
                Exportar
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
              >
                <Plus size={20} />
                Nueva Cotización
              </button>
            </div>
          )}
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente *</label>
                <select
                  required
                  value={formData.clienteId}
                  onChange={(e) => setFormData({...formData, clienteId: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Oportunidad (opcional)</label>
                <select
                  value={formData.oportunidadId}
                  onChange={(e) => setFormData({...formData, oportunidadId: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Sin vincular...</option>
                  {oportunidades
                    .filter(op => op.clienteId === formData.clienteId)
                    .map(op => (
                      <option key={op.id} value={op.id}>{op.nombre}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha *</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Validez (días)</label>
                <input
                  type="number"
                  value={formData.validezDias}
                  onChange={(e) => setFormData({...formData, validezDias: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descuento Global (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.descuentoGlobal}
                  onChange={(e) => setFormData({...formData, descuentoGlobal: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  {estados.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items / Productos */}
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Productos y Servicios</h4>

              {/* Agregar Producto */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 bg-white p-4 rounded-lg border border-gray-300">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Producto</label>
                  <select
                    value={nuevoItem.productoId}
                    onChange={(e) => {
                      const producto = productos.find(p => p.id === e.target.value);
                      setNuevoItem({
                        ...nuevoItem,
                        productoId: e.target.value,
                        precioUnitario: producto?.precio || 0
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} - ${producto.precio}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={nuevoItem.cantidad}
                    onChange={(e) => setNuevoItem({...nuevoItem, cantidad: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Precio Unit.</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevoItem.precioUnitario}
                    onChange={(e) => setNuevoItem({...nuevoItem, precioUnitario: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Desc. %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={nuevoItem.descuento}
                    onChange={(e) => setNuevoItem({...nuevoItem, descuento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>
              </div>

              {/* Lista de Items */}
              {formData.items.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6">No hay productos agregados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Producto</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold">Precio Unit.</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold">Desc. %</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold">Subtotal</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm">{item.nombre}</div>
                            <div className="text-xs text-gray-500">{item.descripcion}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">{item.cantidad}</td>
                          <td className="px-4 py-3 text-right text-sm">${item.precioUnitario.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-sm">{item.descuento}%</td>
                          <td className="px-4 py-3 text-right font-semibold text-sm">${calcularSubtotal(item).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarItem(index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totales */}
              {formData.items.length > 0 && (
                <div className="mt-6 bg-white rounded-lg p-4 border-2 border-gray-300">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">${calcularTotales().subtotal.toFixed(2)}</span>
                      </div>
                      {formData.descuentoGlobal > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Descuento ({formData.descuentoGlobal}%):</span>
                          <span>-${calcularTotales().descuentoGlobal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IVA (16%):</span>
                        <span className="font-semibold">${calcularTotales().iva.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2">
                        <span>TOTAL:</span>
                        <span className="text-green-600">${calcularTotales().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notas y Términos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
                <textarea
                  rows="4"
                  value={formData.notas}
                  onChange={(e) => setFormData({...formData, notas: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="Notas adicionales para el cliente..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Términos y Condiciones</label>
                <textarea
                  rows="4"
                  value={formData.terminosCondiciones}
                  onChange={(e) => setFormData({...formData, terminosCondiciones: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="Términos y condiciones de la cotización..."
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-semibold"
              >
                {editingId ? 'Actualizar' : 'Guardar'} Cotización
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Filtros */}
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              >
                <option value="todas">Todas</option>
                {estados.map(estado => (
                  <option key={estado.value} value={estado.value}>{estado.label}</option>
                ))}
              </select>
            </div>

            {/* Lista */}
            {cotizacionesFiltradas.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No hay cotizaciones registradas</p>
                <p className="text-gray-500 mt-2">Crea tu primera cotización</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Validez</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cotizacionesFiltradas.map((cotizacion) => {
                      const cliente = clientes.find(c => c.id === cotizacion.clienteId);
                      const estadoInfo = estados.find(e => e.value === cotizacion.estado);
                      const fechaVencimiento = new Date(cotizacion.fecha);
                      fechaVencimiento.setDate(fechaVencimiento.getDate() + cotizacion.validezDias);
                      const vencida = new Date() > fechaVencimiento && cotizacion.estado === 'enviada';

                      return (
                        <tr key={cotizacion.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-blue-900">{cotizacion.numero}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{cliente?.nombre || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(cotizacion.fecha).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {vencida ? (
                              <span className="text-red-600 font-semibold">Vencida</span>
                            ) : (
                              <span className="text-gray-600">
                                {fechaVencimiento.toLocaleDateString()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">
                            ${cotizacion.total?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoInfo?.color}`}>
                              {estadoInfo?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {cotizacion.items?.length || 0} productos
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(cotizacion)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(cotizacion.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
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
          </>
        )}
      </div>
    </div>
  );
}

// ============= CHATBOT CON IA =============
function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente inteligente de GRX CRM. ¿En qué puedo ayudarte hoy? 🤖'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim().toLowerCase();
    const originalMessage = inputMessage.trim();
    setInputMessage('');

    // Agregar mensaje del usuario
    const newMessages = [...messages, { role: 'user', content: originalMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    // Simular delay de IA
    setTimeout(() => {
      let response = '';

      // Sistema de respuestas inteligente
      if (userMessage.match(/hola|hi|buenos|buenas|hey/)) {
        response = '¡Hola! 👋 Soy tu asistente inteligente de GRX CRM.\n\nPuedo ayudarte con:\n• 📊 Gestión de Leads y Scoring\n• 💼 Pipeline de Oportunidades\n• 👥 Clientes y Contactos\n• ✅ Tareas y Calendario\n• 📈 Reportes y KPIs\n• ⚙️ Configuración del sistema\n\n¿En qué puedo ayudarte hoy?';
      }
      else if (userMessage.match(/lead|prospecto/)) {
        response = '📊 **Sistema de Gestión de Leads**\n\n**Características principales:**\n• Lead Score automático (0-100 puntos)\n• Calificación por múltiples factores\n• Seguimiento de fuente de origen\n• Historial completo de interacciones\n\n**Lead Score se calcula con:**\n✓ Fuente del lead (25 pts)\n✓ Tamaño de empresa (20 pts)\n✓ Calidad de datos (20 pts)\n✓ Frecuencia de interacciones (20 pts)\n✓ Tiempo de respuesta (15 pts)\n\n**Acciones disponibles:**\n→ Crear nuevo lead desde módulo Clientes\n→ Filtrar por score, estado, fecha\n→ Exportar a Excel\n→ Convertir a oportunidad\n\n¿Necesitas ayuda con algo específico de leads?';
      }
      else if (userMessage.match(/oportunidad|pipeline|venta|cierre|deal/)) {
        response = '💼 **Pipeline de Oportunidades**\n\n**5 Etapas del Pipeline:**\n1️⃣ Prospecto (10% probabilidad)\n2️⃣ Calificación (25% probabilidad)\n3️⃣ Propuesta (50% probabilidad)\n4️⃣ Negociación (75% probabilidad)\n5️⃣ Cierre (90% probabilidad)\n\n**Funcionalidades:**\n• Kanban drag & drop\n• Cálculo automático de probabilidad\n• Valor total del pipeline\n• Tiempo promedio por etapa\n• Asociación con clientes y proyectos\n\n**IA Predictiva:**\nEl sistema calcula probabilidad de cierre basándose en:\n→ Etapa actual\n→ Valor del deal\n→ Interacciones recientes\n→ Días en la etapa\n\n¿Quieres saber cómo mover una oportunidad?';
      }
      else if (userMessage.match(/dashboard|kpi|métrica|estadística/)) {
        response = '📈 **Dashboard y KPIs**\n\n**Métricas Principales:**\n📊 Total de Leads\n📈 Tasa de Conversión\n💰 Valor Total Pipeline\n🎯 Oportunidades Activas\n⏱️ Tiempo Promedio de Cierre\n\n**Visualizaciones:**\n• Gráfica de barras: Leads por fuente\n• Gráfica de pastel: Oportunidades por etapa\n• Timeline: Actividad reciente del equipo\n• Tabla: Top clientes y deals\n\n**Datos en tiempo real:**\nTodo se actualiza automáticamente desde Firebase\n\n**Exportación:**\nPuedes exportar cualquier métrica a Excel\n\n¿Qué KPI te interesa analizar?';
      }
      else if (userMessage.match(/cliente|contacto/)) {
        response = '👥 **Gestión de Clientes**\n\n**Base de Datos Completa:**\n• Clientes y Leads unificados\n• Información de contacto\n• Empresa y sector\n• Ubicación geográfica\n\n**Historial 360°:**\n→ Todas las interacciones\n→ Oportunidades asociadas\n→ Tareas pendientes\n→ Proyectos activos\n→ Notas y adjuntos\n\n**Segmentación:**\nFiltra por tipo, sector, ubicación, estado\n\n**Lead Score:**\nCada lead tiene puntuación de 0-100\n\n**Acciones rápidas:**\n• Crear interacción\n• Asignar tarea\n• Generar oportunidad\n• Exportar datos\n\n¿Necesitas ayuda para gestionar un cliente?';
      }
      else if (userMessage.match(/tarea|actividad|pendiente|to-do/)) {
        response = '✅ **Sistema de Tareas**\n\n**Gestión Completa:**\n• Título y descripción\n• Prioridad: Alta 🔴 Media 🟡 Baja 🟢\n• Fecha límite y recordatorios\n• Asignación a usuarios\n• Estado: Pendiente/Completada\n\n**Asociaciones:**\nVincula tareas con:\n→ Clientes\n→ Oportunidades\n→ Proyectos\n\n**Vista de Calendario:**\nTodas tus tareas en vista mensual integrada\n\n**Notificaciones:**\nAlertas automáticas para:\n• Tareas próximas a vencer\n• Tareas vencidas\n• Nuevas asignaciones\n\n**Productividad:**\nFiltros por prioridad, estado, responsable\n\n¿Quieres crear una tarea nueva?';
      }
      else if (userMessage.match(/reporte|análisis|informe/)) {
        response = '📊 **Módulo de Reportes**\n\n**Reportes Disponibles:**\n\n1. **Performance de Ventas**\n   → Conversión de leads\n   → Oportunidades ganadas/perdidas\n   → Valor promedio de deals\n   → Tasa de cierre\n\n2. **Actividad del Equipo**\n   → Interacciones por usuario\n   → Tareas completadas\n   → Tiempo de respuesta\n\n3. **Pipeline Analytics**\n   → Distribución por etapa\n   → Tiempo en cada etapa\n   → Embudo de conversión\n\n4. **Clientes**\n   → Segmentación geográfica\n   → Por sector/industria\n   → Clientes más activos\n\n**Exportación:**\nTodos los reportes se exportan a Excel\n\n**Filtros:**\nPor fecha, empresa, usuario, proyecto\n\n¿Qué tipo de reporte necesitas?';
      }
      else if (userMessage.match(/calendario|agenda/)) {
        response = '📅 **Calendario Unificado**\n\n**Vista Mensual:**\n• Todas tus tareas\n• Interacciones programadas\n• Reuniones y llamadas\n• Eventos importantes\n\n**Navegación:**\n← → Moverse entre meses\n🔍 Buscar eventos específicos\n\n**Códigos de Color:**\n🔴 Prioridad Alta\n🟡 Prioridad Media\n🟢 Prioridad Baja\n📞 Llamadas\n📧 Emails\n🤝 Reuniones\n\n**Sincronización:**\nActualización en tiempo real\n\n**Filtros:**\n• Por tipo de actividad\n• Por responsable\n• Por cliente/proyecto\n\n¿Necesitas programar algo?';
      }
      else if (userMessage.match(/usuario|equipo|permiso|rol/)) {
        response = '👤 **Gestión de Usuarios**\n\n**Roles Disponibles:**\n\n🔴 **Administrador**\n→ Acceso total al sistema\n→ Gestiona empresas y usuarios\n→ Configuración global\n\n🔵 **Gerente**\n→ Gestiona su equipo\n→ Ve reportes completos\n→ Asigna tareas\n\n🟢 **Ejecutivo**\n→ Gestiona sus clientes\n→ Crea oportunidades\n→ Reporta actividad\n\n⚪ **Invitado**\n→ Solo lectura\n→ Acceso limitado\n\n**Permisos:**\nCada rol tiene permisos específicos en cada módulo\n\n**Multi-empresa:**\nUsuarios pueden pertenecer a múltiples empresas\n\n¿Necesitas crear o modificar usuarios?';
      }
      else if (userMessage.match(/empresa|organización|tenant/)) {
        response = '🏢 **Sistema Multi-Empresa**\n\n**Características:**\n• Aislamiento total de datos\n• Configuración independiente\n• Usuarios por empresa\n• Proyectos por empresa\n\n**Personalización:**\n→ Logo personalizado\n→ Colores corporativos\n→ Datos de contacto\n→ Configuración regional\n\n**Gestión:**\nSolo administradores pueden:\n• Crear empresas\n• Asignar usuarios\n• Configurar permisos\n• Ver datos consolidados\n\n**Multi-tenant:**\nIdeal para:\n• Holdings\n• Grupos empresariales\n• Agencias\n• Consultoras\n\n¿Quieres configurar una nueva empresa?';
      }
      else if (userMessage.match(/export|excel|descargar|csv/)) {
        response = '📥 **Exportación de Datos**\n\n**Módulos con Exportación:**\n✅ Clientes y Leads\n✅ Oportunidades\n✅ Tareas\n✅ Interacciones\n✅ Proyectos\n✅ Reportes\n✅ Usuarios\n\n**Formato:**\nArchivos Excel (.xlsx)\nCompatible con:\n→ Microsoft Excel\n→ Google Sheets\n→ LibreOffice\n\n**Contenido:**\n• Todos los campos visibles\n• Datos filtrados actuales\n• Formato organizado\n• Listo para análisis\n\n**Cómo exportar:**\n1. Ve al módulo deseado\n2. Aplica filtros si necesitas\n3. Click en botón "Descargar Excel"\n4. Archivo se descarga automáticamente\n\n¿Qué datos necesitas exportar?';
      }
      else if (userMessage.match(/interacción|llamada|email|reunión|contacto/)) {
        response = '📞 **Gestión de Interacciones**\n\n**Tipos de Interacción:**\n📞 Llamadas telefónicas\n📧 Emails\n🤝 Reuniones presenciales\n💬 WhatsApp/Chat\n📄 Presentaciones\n\n**Registro Completo:**\n• Fecha y hora\n• Tipo de interacción\n• Cliente asociado\n• Oportunidad relacionada\n• Notas detalladas\n• Resultado/Siguiente paso\n\n**Seguimiento:**\nHistorial completo por cliente\n\n**Analytics:**\n→ Frecuencia de contacto\n→ Efectividad por tipo\n→ Tiempo de respuesta\n\n**Automatización:**\nCrea tareas de seguimiento automáticas\n\n¿Necesitas registrar una interacción?';
      }
      else if (userMessage.match(/proyecto/)) {
        response = '📁 **Gestión de Proyectos**\n\n**Características:**\n• Proyectos por empresa\n• Múltiples clientes por proyecto\n• Oportunidades asociadas\n• Equipo asignado\n• Timeline y milestones\n\n**Información:**\n→ Nombre y descripción\n→ Fecha inicio/fin\n→ Presupuesto\n→ Estado (Activo/Pausado/Completado)\n\n**Seguimiento:**\n• Tareas del proyecto\n• Interacciones relacionadas\n• Progreso general\n• Documentos adjuntos\n\n**Reportes:**\nEstadísticas por proyecto\n\n¿Quieres crear un proyecto nuevo?';
      }
      else if (userMessage.match(/ayuda|help|cómo|como|qué puedes|que puedes/)) {
        response = '🤝 **Guía de Ayuda - GRX CRM**\n\n**Módulos Principales:**\n\n📊 **Dashboard** - KPIs y métricas en tiempo real\n🏢 **Empresas** - Gestión multi-tenant\n👤 **Usuarios** - Roles y permisos\n👥 **Clientes** - Base de datos completa\n📞 **Interacciones** - Historial de contacto\n✅ **Tareas** - Gestión de actividades\n📅 **Calendario** - Vista unificada\n📁 **Proyectos** - Organización de trabajo\n💼 **Oportunidades** - Pipeline de ventas\n📊 **Reportes** - Analytics avanzados\n🔔 **Notificaciones** - Alertas automáticas\n🔌 **Integraciones** - APIs externas\n⚙️ **Configuración** - Personalización\n\n**IA Predictiva:**\n• Lead Scoring automático\n• Probabilidad de cierre\n• Recomendaciones inteligentes\n\n¿Sobre qué módulo necesitas ayuda?';
      }
      else if (userMessage.match(/gracias|thanks|ok|perfecto|excelente/)) {
        response = '¡De nada! 😊\n\nEstoy aquí 24/7 para ayudarte con GRX CRM.\n\nSi necesitas algo más, solo pregúntame.\n\n¡Que tengas un excelente día! 🚀';
      }
      else if (userMessage.match(/score|scoring|puntuación/)) {
        response = '🎯 **Sistema de Lead Scoring**\n\n**Puntuación automática de 0-100**\n\n**Factores de Cálculo:**\n\n1. **Fuente del Lead (25 pts)**\n   • Web: 25 pts\n   • Referido: 20 pts\n   • Evento: 18 pts\n   • Redes Sociales: 15 pts\n   • Email Marketing: 12 pts\n   • Llamada fría: 8 pts\n\n2. **Tamaño Empresa (20 pts)**\n   • Corporativo: 20 pts\n   • Mediana: 15 pts\n   • Pequeña: 10 pts\n\n3. **Calidad Datos (20 pts)**\n   • Completo: 20 pts\n   • Parcial: 10-15 pts\n\n4. **Interacciones (20 pts)**\n   • 5+ contactos: 20 pts\n   • 3-4 contactos: 15 pts\n   • 1-2 contactos: 10 pts\n\n5. **Tiempo Respuesta (15 pts)**\n   • Reciente: 15 pts\n   • Activo: 10 pts\n   • Antiguo: 5 pts\n\n**Interpretación:**\n🟢 80-100: Excelente\n🟡 60-79: Bueno\n🟠 40-59: Regular\n🔴 0-39: Bajo\n\n¿Quieres saber más?';
      }
      else {
        // Respuesta genérica inteligente
        response = `Entiendo tu pregunta sobre "${originalMessage}" 🤔\n\n**Te puedo ayudar con:**\n\n📊 **Gestión de Leads**\n→ Scoring, calificación, seguimiento\n\n💼 **Pipeline de Ventas**\n→ Oportunidades, etapas, probabilidades\n\n👥 **Clientes**\n→ Base de datos, historial, segmentación\n\n✅ **Tareas y Calendario**\n→ Productividad, recordatorios, agenda\n\n📈 **Reportes y Analytics**\n→ KPIs, métricas, exportación\n\n⚙️ **Configuración**\n→ Usuarios, permisos, personalización\n\n¿Podrías ser más específico sobre qué necesitas? Pregúntame sobre cualquier módulo.`;
      }

      setMessages([...newMessages, { role: 'assistant', content: response }]);
      setIsLoading(false);
    }, 600);
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 z-50 animate-bounce"
          title="Chatear con IA"
        >
          <Bot size={32} />
        </button>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border-2 border-purple-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Asistente IA</h3>
                <p className="text-xs text-purple-100">Siempre disponible</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50 to-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-none'
                      : 'bg-white border-2 border-purple-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border-2 border-purple-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-purple-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// Módulo Configuración
// Módulo Workflows - Automatizaciones IF/THEN
function WorkflowsModule() {
  const [workflows, setWorkflows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executionLog, setExecutionLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
    trigger: {
      tipo: 'lead_created', // lead_created, lead_updated, opportunity_stage_changed, task_overdue, etc.
      condiciones: []
    },
    acciones: []
  });

  // Opciones de triggers
  const triggerOptions = [
    { value: 'lead_created', label: 'Lead Creado', icon: '🆕' },
    { value: 'lead_updated', label: 'Lead Actualizado', icon: '✏️' },
    { value: 'opportunity_created', label: 'Oportunidad Creada', icon: '💼' },
    { value: 'opportunity_stage_changed', label: 'Cambio de Etapa en Oportunidad', icon: '🔄' },
    { value: 'task_created', label: 'Tarea Creada', icon: '📋' },
    { value: 'task_overdue', label: 'Tarea Vencida', icon: '⏰' },
    { value: 'client_created', label: 'Cliente Creado', icon: '👤' },
    { value: 'interaction_created', label: 'Interacción Creada', icon: '📞' },
  ];

  // Opciones de condiciones
  const conditionFields = {
    lead: ['calificacion', 'score', 'estado', 'presupuesto', 'ciudad'],
    opportunity: ['etapa', 'valor', 'probabilidad', 'diasAbierto'],
    task: ['prioridad', 'estado', 'diasVencido'],
    client: ['tipo', 'sector', 'pais']
  };

  const operators = [
    { value: 'equals', label: 'Igual a (=)', icon: '=' },
    { value: 'not_equals', label: 'Diferente de (≠)', icon: '≠' },
    { value: 'greater_than', label: 'Mayor que (>)', icon: '>' },
    { value: 'less_than', label: 'Menor que (<)', icon: '<' },
    { value: 'contains', label: 'Contiene', icon: '⊃' },
    { value: 'not_contains', label: 'No contiene', icon: '⊅' },
  ];

  // Opciones de acciones
  const actionOptions = [
    { value: 'send_email', label: 'Enviar Email', icon: '✉️', fields: ['destinatario', 'asunto', 'mensaje'] },
    { value: 'send_notification', label: 'Enviar Notificación', icon: '🔔', fields: ['usuario', 'mensaje'] },
    { value: 'assign_to_user', label: 'Asignar a Usuario', icon: '👤', fields: ['usuario'] },
    { value: 'change_stage', label: 'Cambiar Etapa', icon: '🔄', fields: ['etapa'] },
    { value: 'update_field', label: 'Actualizar Campo', icon: '✏️', fields: ['campo', 'valor'] },
    { value: 'create_task', label: 'Crear Tarea', icon: '📋', fields: ['titulo', 'descripcion', 'fechaVencimiento', 'asignadoA'] },
    { value: 'add_tag', label: 'Agregar Etiqueta', icon: '🏷️', fields: ['etiqueta'] },
    { value: 'webhook', label: 'Llamar Webhook', icon: '🔗', fields: ['url', 'metodo'] },
  ];

  // Cargar workflows
  useEffect(() => {
    loadWorkflows();
    loadExecutionLog();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'workflows'));
      const workflowsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkflows(workflowsList);
    } catch (error) {
      console.error('Error cargando workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionLog = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'workflow_executions'));
      const executions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setExecutionLog(executions.slice(0, 50)); // Últimas 50 ejecuciones
    } catch (error) {
      console.error('Error cargando log de ejecuciones:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const workflowData = {
        ...formData,
        fechaCreacion: editingWorkflow?.fechaCreacion || new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

      if (editingWorkflow) {
        await updateDoc(doc(db, 'workflows', editingWorkflow.id), workflowData);
      } else {
        await addDoc(collection(db, 'workflows'), workflowData);
      }

      setShowForm(false);
      setEditingWorkflow(null);
      resetForm();
      loadWorkflows();
    } catch (error) {
      console.error('Error guardando workflow:', error);
      alert('Error al guardar el workflow');
    }
  };

  const handleEdit = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      nombre: workflow.nombre,
      descripcion: workflow.descripcion,
      activo: workflow.activo,
      trigger: workflow.trigger,
      acciones: workflow.acciones
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este workflow?')) {
      try {
        await deleteDoc(doc(db, 'workflows', id));
        loadWorkflows();
      } catch (error) {
        console.error('Error eliminando workflow:', error);
      }
    }
  };

  const toggleActive = async (workflow) => {
    try {
      await updateDoc(doc(db, 'workflows', workflow.id), {
        activo: !workflow.activo
      });
      loadWorkflows();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      activo: true,
      trigger: {
        tipo: 'lead_created',
        condiciones: []
      },
      acciones: []
    });
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        condiciones: [
          ...formData.trigger.condiciones,
          { campo: '', operador: 'equals', valor: '' }
        ]
      }
    });
  };

  const removeCondition = (index) => {
    const newCondiciones = formData.trigger.condiciones.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        condiciones: newCondiciones
      }
    });
  };

  const updateCondition = (index, field, value) => {
    const newCondiciones = [...formData.trigger.condiciones];
    newCondiciones[index][field] = value;
    setFormData({
      ...formData,
      trigger: {
        ...formData.trigger,
        condiciones: newCondiciones
      }
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      acciones: [
        ...formData.acciones,
        { tipo: 'send_notification', parametros: {} }
      ]
    });
  };

  const removeAction = (index) => {
    const newAcciones = formData.acciones.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      acciones: newAcciones
    });
  };

  const updateAction = (index, field, value) => {
    const newAcciones = [...formData.acciones];
    if (field === 'tipo') {
      newAcciones[index] = { tipo: value, parametros: {} };
    } else {
      newAcciones[index].parametros[field] = value;
    }
    setFormData({
      ...formData,
      acciones: newAcciones
    });
  };

  // Exportar workflows
  const handleExport = () => {
    const exportData = workflows.map(w => ({
      Nombre: w.nombre,
      Descripción: w.descripcion,
      Estado: w.activo ? 'Activo' : 'Inactivo',
      Trigger: triggerOptions.find(t => t.value === w.trigger.tipo)?.label || w.trigger.tipo,
      'Núm. Condiciones': w.trigger.condiciones?.length || 0,
      'Núm. Acciones': w.acciones?.length || 0,
      'Fecha Creación': new Date(w.fechaCreacion).toLocaleDateString()
    }));
    exportToExcel(exportData, 'workflows.xlsx');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl text-gray-600">Cargando workflows...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GitBranch size={48} />
            <div>
              <h2 className="text-4xl font-bold">Workflows Automáticos</h2>
              <p className="text-purple-200 mt-2">Motor de Automatización IF/THEN</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLog(!showLog)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Clock size={20} />
              {showLog ? 'Ocultar Log' : 'Ver Log'}
            </button>
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Exportar
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingWorkflow(null);
                resetForm();
              }}
              className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Log de Ejecuciones */}
      {showLog && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-blue-500">
          <h3 className="text-2xl font-semibold mb-4 text-indigo-900 flex items-center gap-2">
            <Clock size={24} />
            Historial de Ejecuciones (Últimas 50)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-indigo-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900">Workflow</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900">Trigger</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {executionLog.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No hay ejecuciones registradas aún
                    </td>
                  </tr>
                ) : (
                  executionLog.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium">{log.workflowNombre}</td>
                      <td className="px-4 py-3 text-sm">{log.triggerTipo}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.estado === 'success' ? 'bg-green-100 text-green-800' :
                          log.estado === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.estado === 'success' ? '✓ Exitoso' : log.estado === 'failed' ? '✗ Fallido' : '⚠ Parcial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.mensaje || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Workflows */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-indigo-900">Workflows Configurados ({workflows.length})</h3>

          {workflows.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <GitBranch size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-4">No hay workflows creados</p>
              <p className="text-gray-500">Crea tu primer workflow automático para ahorrar tiempo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => {
                const triggerInfo = triggerOptions.find(t => t.value === workflow.trigger.tipo);
                return (
                  <div key={workflow.id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-indigo-900">{workflow.nombre}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            workflow.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {workflow.activo ? '✓ Activo' : '○ Inactivo'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{workflow.descripcion}</p>

                        {/* Trigger */}
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{triggerInfo?.icon}</span>
                            <span className="font-semibold text-blue-900">CUANDO:</span>
                            <span className="text-blue-700">{triggerInfo?.label}</span>
                          </div>

                          {/* Condiciones */}
                          {workflow.trigger.condiciones && workflow.trigger.condiciones.length > 0 && (
                            <div className="ml-8 mt-2 space-y-1">
                              <span className="font-semibold text-blue-800">Y SI:</span>
                              {workflow.trigger.condiciones.map((cond, idx) => (
                                <div key={idx} className="text-sm text-blue-700">
                                  • {cond.campo} {operators.find(o => o.value === cond.operador)?.icon} {cond.valor}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">⚡</span>
                            <span className="font-semibold text-green-900">ENTONCES:</span>
                          </div>
                          <div className="ml-8 space-y-1">
                            {workflow.acciones?.map((accion, idx) => {
                              const actionInfo = actionOptions.find(a => a.value === accion.tipo);
                              return (
                                <div key={idx} className="text-sm text-green-700 flex items-center gap-2">
                                  <span>{actionInfo?.icon}</span>
                                  <span>{actionInfo?.label}</span>
                                  {accion.parametros && Object.keys(accion.parametros).length > 0 && (
                                    <span className="text-xs text-gray-600">
                                      ({Object.entries(accion.parametros).map(([k,v]) => `${k}: ${v}`).join(', ')})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(workflow)}
                          className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                            workflow.activo
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {workflow.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleEdit(workflow)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                      Creado: {new Date(workflow.fechaCreacion).toLocaleDateString()} |
                      Modificado: {new Date(workflow.fechaModificacion).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Formulario de Workflow */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-purple-500">
          <h3 className="text-2xl font-semibold mb-6 text-indigo-900">
            {editingWorkflow ? 'Editar Workflow' : 'Crear Nuevo Workflow'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Workflow *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Ej: Asignar leads calientes automáticamente"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.activo}
                  onChange={(e) => setFormData({...formData, activo: e.target.value === 'true'})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                rows="2"
                placeholder="Describe qué hace este workflow..."
              />
            </div>

            {/* TRIGGER */}
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                CUANDO (Trigger)
              </h4>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selecciona el evento que activa este workflow *
                </label>
                <select
                  required
                  value={formData.trigger.tipo}
                  onChange={(e) => setFormData({
                    ...formData,
                    trigger: {...formData.trigger, tipo: e.target.value}
                  })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {triggerOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condiciones (IF) */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Y SI (Condiciones - Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Agregar Condición
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.trigger.condiciones.map((condicion, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white p-3 rounded border border-blue-200">
                      <input
                        type="text"
                        placeholder="Campo"
                        value={condicion.campo}
                        onChange={(e) => updateCondition(idx, 'campo', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <select
                        value={condicion.operador}
                        onChange={(e) => updateCondition(idx, 'operador', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                      >
                        {operators.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.icon} {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Valor"
                        value={condicion.valor}
                        onChange={(e) => updateCondition(idx, 'valor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ACCIONES (THEN) */}
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-green-900 flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  ENTONCES (Acciones)
                </h4>
                <button
                  type="button"
                  onClick={addAction}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold flex items-center gap-1"
                >
                  <Plus size={14} />
                  Agregar Acción
                </button>
              </div>

              <div className="space-y-4">
                {formData.acciones.length === 0 ? (
                  <p className="text-gray-600 text-sm italic">
                    Agrega al menos una acción para ejecutar cuando se cumpla el trigger
                  </p>
                ) : (
                  formData.acciones.map((accion, idx) => {
                    const actionInfo = actionOptions.find(a => a.value === accion.tipo);
                    return (
                      <div key={idx} className="bg-white p-4 rounded border-2 border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{actionInfo?.icon}</span>
                          <select
                            value={accion.tipo}
                            onChange={(e) => updateAction(idx, 'tipo', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                          >
                            {actionOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeAction(idx)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Campos específicos de la acción */}
                        {actionInfo?.fields && (
                          <div className="grid grid-cols-2 gap-3 ml-8">
                            {actionInfo.fields.map(field => (
                              <div key={field}>
                                <label className="block text-xs font-semibold text-gray-700 mb-1 capitalize">
                                  {field}
                                </label>
                                <input
                                  type="text"
                                  placeholder={field}
                                  value={accion.parametros[field] || ''}
                                  onChange={(e) => updateAction(idx, field, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-green-500 focus:outline-none text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Save size={20} />
                {editingWorkflow ? 'Actualizar Workflow' : 'Crear Workflow'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingWorkflow(null);
                  resetForm();
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <X size={20} />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-lg p-6">
        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
          <Info size={20} />
          Acerca de Workflows
        </h4>
        <ul className="space-y-2 text-sm text-purple-800">
          <li>• Los workflows automatizan tareas repetitivas usando lógica IF/THEN</li>
          <li>• Un <strong>trigger</strong> es el evento que inicia el workflow (ej: lead creado)</li>
          <li>• Las <strong>condiciones</strong> filtran cuándo se ejecuta (ej: score &gt; 80)</li>
          <li>• Las <strong>acciones</strong> son las tareas a ejecutar (ej: asignar a gerente, enviar email)</li>
          <li>• Los workflows inactivos no se ejecutan, pero se guardan para activarlos después</li>
          <li>• Revisa el <strong>Log de Ejecuciones</strong> para ver el historial de automatizaciones</li>
        </ul>
      </div>
    </div>
  );
}

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
