# 🔒 Solución de Problemas de Autorización - Addocu v3.0

## ❌ Problema: "You do not have permission to call Ui.showSidebar"

### Descripción del Error
Este error ocurre cuando accidentalmente se rechazan los permisos del Add-on durante la instalación o primera configuración, dejando a Addocu en un estado donde no puede ejecutar funciones que requieren interfaz de usuario.

**Error completo:**
```
No se pudo abrir la configuración. Error: You do not have permission to call Ui.showSidebar. 
Required permissions: https://www.googleapis.com/auth/script.container.ui. 
For more information, see https://developers.google.com/apps-script/guides/support/troubleshooting#authorization-is
```

---

## 🔧 Soluciones por Orden de Prioridad

### 1. 🚀 SOLUCIÓN AUTOMÁTICA (Recomendada)

Addocu v3.0 incluye un **menú de recuperación** que aparece automáticamente cuando hay problemas de permisos:

1. **Refrescar la página** de Google Sheets
2. **Buscar el menú** `Extensions > Addocu` 
3. **Usar las opciones de recuperación:**
   - `🆘 Recuperación > 🔄 Reautorizar Permisos`
   - `🆘 Recuperación > 🔍 Diagnóstico Completo`

> 💡 **El menú de recuperación funciona incluso cuando los permisos principales están bloqueados**

### 2. 🔄 SOLUCIÓN MANUAL SIMPLE

Si el menú de recuperación no aparece:

1. Ve a `Extensions > Addocu > 📊 Auditar GA4`
2. Cuando aparezca el diálogo de autorización:
   - Haz clic en **"Autorizar"**
   - Selecciona tu cuenta de Google
   - Haz clic en **"Permitir"** para todos los permisos
3. No rechaces ningún permiso
4. Espera a que complete la autorización

### 3. 🔍 DIAGNÓSTICO AVANZADO

Para entender qué está fallando exactamente:

1. Abre la **Consola de Desarrollador** (F12)
2. Ve a la pestaña **"Console"**
3. Ejecuta en Apps Script:
   ```javascript
   diagnosticarAutorizacionCompleta()
   ```
4. Revisa el output para identificar permisos específicos que faltan

### 4. 🧹 RESETEO COMPLETO

**⚠️ SOLO como último recurso:**

1. `Extensions > Addocu > 🆘 Recuperación > 🚨 Reseteo de Emergencia`
2. Confirma que quieres eliminar TODA la configuración
3. Reconfigura desde cero

### 5. 🔄 REINSTALACIÓN LIMPIA

Si nada más funciona:

1. **Desinstalar Addocu:**
   - Ve a `Extensions > Add-ons > Manage add-ons`
   - Encuentra Addocu y haz clic en "Remove"
2. **Esperar 5 minutos** (importante para limpiar cache)
3. **Reinstalar desde [Google Workspace Marketplace](https://workspace.google.com/marketplace)**
4. Durante la instalación: **AUTORIZAR TODOS LOS PERMISOS**

---

## 🔒 Permisos Requeridos por Addocu

Addocu necesita estos permisos específicos para funcionar:

### ✅ Permisos Críticos
- `https://www.googleapis.com/auth/script.container.ui` - **Interfaz de usuario**
- `https://www.googleapis.com/auth/spreadsheets` - **Leer/escribir hojas**
- `https://www.googleapis.com/auth/script.storage` - **Configuración del usuario**

### ✅ Permisos de APIs
- `https://www.googleapis.com/auth/analytics.readonly` - **Google Analytics 4**
- `https://www.googleapis.com/auth/tagmanager.readonly` - **Google Tag Manager**
- `https://www.googleapis.com/auth/datastudio` - **Looker Studio**

### ✅ Permisos Técnicos
- `https://www.googleapis.com/auth/script.external_request` - **Llamadas a APIs**
- `https://www.googleapis.com/auth/userinfo.email` - **Identificación del usuario**

---

## 🚨 Casos Especiales

### 💼 **Entorno Corporativo**
Si trabajas en una empresa, es posible que haya **restricciones de política**:
- Contacta a tu administrador de Google Workspace
- Solicita que añadan Addocu a la lista de aplicaciones aprobadas
- Proporciona la URL: https://workspace.google.com/marketplace/app/addocu

### 🌐 **Navegador/Extensiones**
- Prueba en **modo incógnito**
- Desactiva **bloqueadores de anuncios** temporalmente
- Usa un navegador diferente (Chrome recomendado)

### 🔄 **Versiones Antiguas**
Si tienes una versión anterior de Addocu:
- Las versiones pre-v3.0 no tienen recuperación automática
- Recomendamos actualizar a v3.0 que incluye herramientas de recuperación

---

## 📞 Soporte y Contacto

### 🛠️ **Autodiagnóstico**
1. Usa `🆘 Recuperación > 🔍 Diagnóstico Completo`
2. Revisa la hoja `LOGS` para errores detallados
3. Anota el mensaje de error exacto

### 📧 **Soporte de la Comunidad**
- **GitHub Issues**: [Reportar problema](https://github.com/tu-usuario/addocu/issues)
- **Email**: hola@addocu.com
- **LinkedIn**: Mensajes privados para soporte personalizado

### 📝 **Información Útil para Soporte**
Al reportar un problema, incluye:
- Mensaje de error completo
- Navegador y versión
- Si estás en entorno corporativo
- Resultado del diagnóstico completo
- Pasos específicos que causaron el error

---

## ✅ Prevención de Problemas Futuros

### 🔐 **Mejores Prácticas**
1. **Siempre autorizar** todos los permisos durante la instalación
2. **No rechazar** permisos específicos sin entender su propósito
3. **Mantener actualizado** Addocu a la última versión
4. **Hacer backup** de configuraciones importantes antes de cambios mayores

### 🆕 **Características v3.0**
- **Menú de recuperación automático** cuando hay problemas de permisos
- **Diagnóstico integrado** para identificar problemas específicos
- **Reseteo de emergencia** para casos críticos
- **Mejor manejo de errores** con mensajes más claros

---

*📅 Última actualización: Septiembre 2025*  
*🔖 Versión del documento: 1.0*  
*🚀 Compatible con: Addocu v3.0+*
