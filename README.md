# 🤖 ChatBot para Restaurante con n8n + WhatsApp

Automatización de atención al cliente para restaurantes, usando **n8n**, **WhatsApp** y lógica condicional. Este proyecto simula un chatbot inteligente que responde a preguntas frecuentes, gestiona reservas y guía a los clientes mediante respuestas automáticas 24/7.

📲 **Demo funcional (requiere Evolution API configurada)**  
⚙️ **Repositorio de automatización para importar directamente en n8n**

---

## 🧠 ¿Qué hace este bot?

El bot responde automáticamente según el contenido del mensaje del cliente. Estos son los flujos principales:

### 📋 Casos de uso automatizados:

#### 📌 Consulta de menú
Si el mensaje contiene palabras como `menú`, `carta`, `comida` o `platos`, responde con:
```json
{
  "mensaje": "¡Perfecto! Te muestro nuestro menú completo 📋",
  "link": "https://alanassell.github.io/RestaurantPage/",
  "linkText": "Ver Menú 📋"
}
📌 Reserva de mesa
Detecta palabras como reserva, mesa, agendar y responde:

text
Copiar
Editar
¡Perfecto! Te ayudo con tu reserva 📋 ¿Cuál es tu nombre completo?
Luego solicita datos paso a paso: nombre → teléfono → cantidad de personas → día y hora.

📌 Horarios del restaurante
Detecta "horario" y responde:

text
Copiar
Editar
Nuestros horarios: Lun-Vie 12-15 y 19-23:30, Sáb 12-16 y 19-00, Dom 12-16
🔧 Tecnologías y herramientas utilizadas
n8n (automatización visual)

Evolution API para integración con WhatsApp

JSON + funciones condicionales en nodos

Webhooks para entrada de mensajes

Mensajes salientes estructurados

📂 Estructura del proyecto
bash
Copiar
Editar
📦 ChatBot-n8n-wsp-Restaurant
 ┣ 📜 chatbot.json         # Exportación del flujo n8n listo para importar
 ┣ 📜 README.md            # Documentación del proyecto
 ┗ 📂 docs/                # Capturas y documentación visual (opcional)
🧪 Cómo usar este proyecto
Cloná el repositorio o descargá chatbot.json.

Ingresá a tu instancia de n8n.

Importá el flujo (Import Workflow).

Configurá el webhook con Evolution API o tu servicio de WhatsApp.

¡Listo! Tu restaurante ya tiene un asistente virtual 24/7.

📌 Requisitos
Instancia de n8n corriendo (puede ser local o en VPS)

Cuenta activa en Evolution API (o similar)

Conexión entre el webhook entrante de WhatsApp y n8n

Opcional: base de datos para guardar reservas

🛠 Posibles mejoras
Guardar reservas automáticamente en Google Sheets o Supabase

Validación de horarios según disponibilidad real

Integración con Google Calendar

Panel de administración con notificaciones en tiempo real

🧑‍💻 Autor
Alan Assel
Desarrollador Full Stack | Automatización IA | n8n lover
GitHub | LinkedIn
