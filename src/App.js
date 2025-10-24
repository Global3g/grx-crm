import React, { useState } from 'react';
import { Building2, Users, LogIn, Settings, UserCircle, Phone, ClipboardList, Briefcase, TrendingUp, BarChart3, Bell, Plug } from 'lucide-react';

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
  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-lg border-4 border-orange-500 shadow-lg mb-8">
        <h2 className="text-4xl font-bold">Empresas</h2>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-orange-500">
        <h3 className="text-2xl font-semibold mb-6 text-blue-900">Gestión de Empresas</h3>
        <p className="text-gray-600 text-lg">Módulo en desarrollo - FASE 1</p>
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
