# Deployment Instructions - GRX CRM

## 📋 Pre-requisitos

1. Node.js y npm instalados
2. Cuenta de Firebase activa
3. Proyecto Firebase creado (grx-crm)

## 🚀 Deployment a Firebase Hosting

### Paso 1: Autenticación

```bash
npx firebase login
```

### Paso 2: Build de Producción

```bash
npm run build
```

### Paso 3: Deploy

```bash
npx firebase deploy --only hosting
```

### Deploy Completo (Hosting + Firestore Rules)

```bash
npx firebase deploy
```

## 🔧 Configuración

### Firebase Config
El archivo `src/firebase.js` contiene la configuración del proyecto:
- Project ID: `grx-crm`
- Auth Domain: `grx-crm.firebaseapp.com`

### Firestore Rules
⚠️ **IMPORTANTE**: Las reglas actuales en `firestore.rules` permiten acceso completo.
**Debes actualizarlas** antes de lanzar a producción con usuarios reales.

Ejemplo de reglas más seguras:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /empresas/{empresaId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /usuarios/{usuarioId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    // ... más reglas según necesidad
  }
}
```

## 📦 Scripts Disponibles

- `npm start` - Inicia servidor de desarrollo (puerto 3000)
- `npm run build` - Crea build de producción
- `npm test` - Ejecuta tests
- `npx firebase deploy` - Deploya a Firebase

## 🌐 URLs

- **Desarrollo**: http://localhost:3000
- **Producción**: https://grx-crm.web.app (o tu dominio personalizado)
- **Firebase Console**: https://console.firebase.google.com/project/grx-crm

## ✅ Checklist Pre-Producción

- [ ] Configurar autenticación de usuarios
- [ ] Actualizar reglas de Firestore para seguridad
- [ ] Configurar roles y permisos por empresa
- [ ] Agregar índices compuestos si es necesario
- [ ] Configurar dominio personalizado (opcional)
- [ ] Habilitar Analytics (opcional)
- [ ] Configurar respaldos automáticos de Firestore
- [ ] Revisar límites y cuotas de Firebase
- [ ] Configurar monitoreo y alertas
- [ ] Documentar proceso de onboarding de usuarios

## 🎨 Funcionalidades Implementadas

✅ Dashboard dinámico con reportes y gráficas
✅ Exportación a Excel/PDF
✅ Búsqueda y filtros
✅ Vista calendario para tareas e interacciones
✅ Envío de emails desde interacciones
✅ Personalización de temas (logos y colores por empresa)
✅ Diseño responsive (móvil y escritorio)
✅ Pipeline de ventas con Kanban drag & drop
✅ Gestión multi-empresa
✅ 12 módulos completos:
   - Dashboard
   - Empresas
   - Usuarios
   - Clientes
   - Interacciones
   - Tareas
   - Calendario
   - Proyectos
   - Oportunidades
   - Reportes
   - Notificaciones
   - Integraciones
   - Configuración

## 🔒 Seguridad

1. **NO** expongas las credenciales de Firebase en repositorios públicos
2. Implementa autenticación antes del lanzamiento público
3. Configura reglas estrictas en Firestore
4. Habilita autenticación de dos factores para administradores
5. Monitorea logs de acceso regularmente

## 📞 Soporte

Para más información sobre Firebase Hosting:
- https://firebase.google.com/docs/hosting
- https://firebase.google.com/docs/firestore/security

## 🎉 ¡Listo para Producción!

Una vez completados los pasos anteriores, tu CRM estará disponible en:
```
https://grx-crm.web.app
```

o

```
https://grx-crm.firebaseapp.com
```
