# 🤖 Chatbot con IA - GRX CRM

## ✨ Características

El chatbot flotante con IA real está integrado en GRX CRM y ofrece:

- **IA Real con GPT-4**: Usa la API de OpenAI para respuestas inteligentes
- **Botón Flotante**: Robot animado en la esquina inferior derecha
- **Interfaz Moderna**: Diseño con gradientes morado/rosa
- **Historial de Conversación**: Mantiene el contexto de la charla
- **Indicador de Escritura**: Animación mientras la IA piensa
- **Experto en CRM**: Entrenado para ayudar con ventas, leads y clientes

## 🚀 Configuración

### 1. Obtener API Key de OpenAI

1. Ve a https://platform.openai.com/api-keys
2. Inicia sesión o crea una cuenta
3. Crea una nueva API Key
4. Copia la clave (empieza con `sk-proj-...`)

### 2. Configurar el Proyecto

```bash
# 1. Copia el archivo de ejemplo
cp .env.example .env

# 2. Edita el archivo .env y pega tu API Key
# Abre el archivo .env y reemplaza:
REACT_APP_OPENAI_API_KEY=tu-api-key-real-aqui

# 3. Reinicia el servidor
# Detén npm start (Ctrl+C) y vuelve a iniciar:
npm start
```

### 3. Probar el Chatbot

1. Abre http://localhost:3000
2. Verás un robot morado/rosa animado en la esquina inferior derecha
3. Haz clic para abrir el chat
4. Escribe cualquier pregunta sobre CRM, ventas, leads, etc.

## 💬 Ejemplos de Uso

Pregunta al chatbot:

- "¿Cómo calificar un lead?"
- "¿Qué es BANT en ventas?"
- "Dame consejos para cerrar oportunidades"
- "¿Cómo gestionar el pipeline de ventas?"
- "Estrategias para aumentar conversión"

## 🎨 Personalización

El chatbot está en `/src/App.js` líneas 8018-8177:

### Cambiar el Modelo de IA

```javascript
// Línea 8051 - Cambia el modelo
model: 'gpt-4',  // Opciones: 'gpt-4', 'gpt-3.5-turbo'
```

### Cambiar la Personalidad

```javascript
// Línea 8054-8056 - Modifica el system prompt
content: 'Eres un asistente experto en CRM...'
```

### Cambiar los Colores

```javascript
// Línea 8092 - Botón flotante
className="... from-purple-600 to-pink-600 ..."

// Línea 8103 - Header del chat
className="... from-purple-600 to-pink-600 ..."
```

## 💰 Costos

**GPT-4 Pricing** (Octubre 2025):
- Input: ~$0.03 USD por 1,000 tokens
- Output: ~$0.06 USD por 1,000 tokens

**Ejemplo:**
- Una conversación típica = ~2,000 tokens = $0.12 USD
- 100 conversaciones = ~$12 USD

**Alternativa Económica:**
Cambia a `gpt-3.5-turbo` (10x más barato):
```javascript
model: 'gpt-3.5-turbo',  // ~$0.002 por 1K tokens
```

## 🔒 Seguridad

⚠️ **IMPORTANTE:**

1. **NUNCA** subas el archivo `.env` a GitHub
2. El `.gitignore` ya lo excluye por defecto
3. No compartas tu API Key públicamente
4. Revisa tu uso en: https://platform.openai.com/usage

## 🐛 Troubleshooting

### Error: "Error en la API de OpenAI"

**Solución:** Verifica que tu API Key sea válida y tengas créditos en OpenAI.

```bash
# Verificar que la variable esté configurada
echo $REACT_APP_OPENAI_API_KEY
```

### El chatbot no aparece

**Solución:** Limpia la caché y reinicia:

```bash
# Detener el servidor (Ctrl+C)
rm -rf node_modules/.cache
npm start
```

### Respuestas lentas

**Solución:** Cambia a GPT-3.5-turbo (más rápido):

```javascript
model: 'gpt-3.5-turbo',
max_tokens: 300  // Reduce los tokens
```

## 📊 Monitoreo

Revisa el uso de tu API en:
https://platform.openai.com/usage

## 🎉 ¡Listo!

El chatbot con IA está funcionando. Los usuarios pueden:
- Hacer preguntas 24/7
- Recibir ayuda experta en CRM
- Aprender mejores prácticas de ventas
- Resolver dudas sobre el sistema

---

**GRX Holdings** | CRM con IA Real | Octubre 2025
