import React, { useState } from 'react';
import { Building2, Users, LogIn } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-800">GRX-CRM</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-600">FASE 1 - MVP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center">
            <LogIn className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Bienvenido a GRX-CRM
            </h2>
            <p className="text-slate-600 mb-6">
              Sistema CRM multi-empresa, multi-usuario y multi-proyectos
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">📋 FASE 1 - MVP</h3>
                <p className="text-sm text-blue-700">Empresas + Usuarios/Roles + Auth</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-2">📞 FASE 2</h3>
                <p className="text-sm text-slate-500">Clientes + Interacciones</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-2">📌 FASE 3</h3>
                <p className="text-sm text-slate-500">Tareas + Proyectos</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Estructura base creada correctamente
              </p>
              <p className="text-sm text-green-600 mt-1">
                Listo para empezar con Firebase Auth y gestión de empresas
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
