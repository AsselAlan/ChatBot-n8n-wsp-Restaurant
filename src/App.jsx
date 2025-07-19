import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// ChatBotDemo Component - Versión con SessionID
function ChatBotDemo() {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Ref for scrolling to the bottom of the chat window
  const messagesEndRef = useRef(null);

  const sugerencias = ["Quiero ver el menú", "Reservar una mesa", "¿Qué me recomendás?"];

  // ==================== SESSION ID MANAGEMENT ====================
  
  // Generate a unique session ID
  const generateSessionId = () => {
    // Crear un ID único basado en timestamp + random + browser fingerprint
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const browserFingerprint = getBrowserFingerprint();
    
    return `chat_${timestamp}_${random}_${browserFingerprint}`;
  };

  // Get browser fingerprint for more unique session ID
  const getBrowserFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas.toDataURL()
    ].join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).substr(0, 8);
  };

  // Initialize or retrieve session ID
  const initializeSessionId = () => {
    try {
      // Try to get existing session ID from localStorage
      let existingSessionId = localStorage.getItem('chatbot_session_id');
      
      // Check if session is still valid (less than 24 hours old)
      const sessionTimestamp = localStorage.getItem('chatbot_session_timestamp');
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (existingSessionId && sessionTimestamp) {
        const sessionAge = now - parseInt(sessionTimestamp);
        if (sessionAge < twentyFourHours) {
          console.log('📱 Recuperando sesión existente:', existingSessionId);
          return existingSessionId;
        } else {
          console.log('⏰ Sesión expirada, creando nueva...');
        }
      }
      
      // Generate new session ID
      const newSessionId = generateSessionId();
      
      // Save to localStorage
      localStorage.setItem('chatbot_session_id', newSessionId);
      localStorage.setItem('chatbot_session_timestamp', now.toString());
      
      console.log('🆕 Nueva sesión creada:', newSessionId);
      return newSessionId;
      
    } catch (error) {
      console.error('Error manejando sessionId:', error);
      // Fallback to session-only ID
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  // Clear session (útil para testing o logout)
  const clearSession = () => {
    try {
      localStorage.removeItem('chatbot_session_id');
      localStorage.removeItem('chatbot_session_timestamp');
      const newSessionId = initializeSessionId();
      setSessionId(newSessionId);
      setMensajes([]);
      setMostrarSugerencias(true);
      console.log('🗑️ Sesión limpiada, nueva sesión:', newSessionId);
    } catch (error) {
      console.error('Error limpiando sesión:', error);
    }
  };

  // ==================== CHAT FUNCTIONALITY ====================

  // Function to get the initial for the bot avatar
  const getBotInitial = () => {
    return "R"; // Always return R for restaurant
  };

  // Function to send a message to the N8N webhook
  const enviarMensaje = async (mensajeTexto) => {
    if (!sessionId) {
      console.error('❌ No hay sessionId disponible');
      return;
    }

    // Add user message to chat
    const userMsg = { tipo: "user", texto: mensajeTexto };
    setMensajes((prev) => [...prev, userMsg]);
    setInput(""); // Clear input field
    setMostrarSugerencias(false); // Hide suggestions after user sends a message
    setIsLoading(true); // Show loading indicator

    // URL del webhook mejorado
    const webhookUrl = "https://pruebas-n8n.pasruo.easypanel.host/webhook/chatbot-reserver";

    try {
      // Preparar payload con sessionId y metadatos adicionales
      const payload = {
        mensaje: mensajeTexto,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Metadata útil para el bot
        metadata: {
          platform: 'web',
          source: 'react_frontend',
          messageCount: mensajes.filter(m => m.tipo === 'user').length + 1
        }
      };

      console.log('📤 Enviando mensaje:', payload);

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      let respuesta = {};

      // Parse the response from the improved workflow
      try {
        let rawText = "";
        
        // Extract the text response from various possible formats
        if (typeof data === "string") {
          rawText = data;
        } else if (data.output) {
          rawText = typeof data.output === "string" ? data.output : JSON.stringify(data.output);
        } else if (data.text) {
          rawText = data.text;
        } else {
          rawText = JSON.stringify(data);
        }

        console.log("📥 Respuesta cruda:", rawText);

        // Check if the response contains JSON (either wrapped or direct)
        if (rawText.includes('"mensaje"') || rawText.includes('"link"') || rawText.includes('"reserva_guardada"')) {
          // Extract JSON from string that might contain ```json wrapper
          const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonStr.trim());
            respuesta = parsed;
            console.log("✅ Respuesta JSON parseada:", respuesta);
          } else {
            // Try to parse the whole thing as JSON
            respuesta = JSON.parse(rawText);
          }
        }
        // If it's already a proper object with mensaje
        else if (data.mensaje) {
          respuesta = data;
        }
        // Plain text response - wrap it
        else {
          respuesta = { mensaje: rawText };
        }
      } catch (err) {
        console.error("Error al parsear respuesta del webhook:", err);
        console.log("Full data object:", data);
        // Fallback - use the raw text as message
        const fallbackText = typeof data === "string" ? data : 
                           data.output || data.text || data.mensaje || 
                           "Hubo un problema con la respuesta del bot.";
        respuesta = { mensaje: fallbackText };
      }

      console.log("🤖 Respuesta procesada:", respuesta);

      // Add bot's text message
      if (respuesta.mensaje) {
        setMensajes((prev) => [...prev, { 
          tipo: "bot", 
          texto: respuesta.mensaje,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

      // Handle menu link - NEW FUNCTIONALITY
      if (respuesta.link && respuesta.linkText) {
        setMensajes((prev) => [
          ...prev,
          {
            tipo: "bot",
            texto: (
              <a
                className="chat-link menu-link"
                href={respuesta.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: "#ffc107", 
                  textDecoration: "underline",
                  fontWeight: "bold",
                  display: "inline-block",
                  marginTop: "8px",
                  padding: "8px 12px",
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 193, 7, 0.3)"
                }}
              >
                🍽️ {respuesta.linkText}
              </a>
            ),
            timestamp: new Date().toLocaleTimeString()
          },
        ]);
      }

      // Handle reservation confirmation - NEW FUNCTIONALITY
      if (respuesta.reserva_guardada && respuesta.codigo_reserva) {
        setMensajes((prev) => [
          ...prev,
          {
            tipo: "bot",
            texto: (
              <div className="reservation-confirmation" style={{
                backgroundColor: "#d4edda",
                border: "1px solid #c3e6cb",
                borderRadius: "8px",
                padding: "12px",
                marginTop: "8px"
              }}>
                <div style={{ color: "#155724", fontWeight: "bold", marginBottom: "8px" }}>
                  ✅ ¡Reserva guardada exitosamente!
                </div>
                <div style={{ color: "#155724", fontSize: "0.9em" }}>
                  Código de confirmación: <strong>{respuesta.codigo_reserva}</strong>
                </div>
              </div>
            ),
            timestamp: new Date().toLocaleTimeString()
          },
        ]);
      }

      // Handle general errors
      if (respuesta.error) {
        setMensajes((prev) => [
          ...prev,
          {
            tipo: "bot",
            texto: `❌ Error: ${respuesta.error}`,
            timestamp: new Date().toLocaleTimeString()
          },
        ]);
      }

    } catch (err) {
      console.error("Error al contactar con el servidor:", err);
      setMensajes((prev) => [
        ...prev,
        { 
          tipo: "bot", 
          texto: "❌ Error al contactar con el servidor. Intenta de nuevo más tarde.",
          timestamp: new Date().toLocaleTimeString()
        },
      ]);
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Handler for sending message via button click
  const handleSend = () => {
    if (!input.trim() || isLoading) return; // Prevent sending empty messages or during loading
    enviarMensaje(input);
  };

  // Handler for sending message via Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  // Effect to scroll to the bottom of the chat window on message update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

  // Effect to initialize session ID and set initial bot message
  useEffect(() => {
    // Initialize session ID first
    const newSessionId = initializeSessionId();
    setSessionId(newSessionId);

    // Set initial bot message
    const initialBotMessage = "¡Hola! 👋 Bienvenido a La Buena Mesa. ¿En qué puedo ayudarte hoy?";
    setMensajes([{ 
      tipo: "bot", 
      texto: initialBotMessage,
      timestamp: new Date().toLocaleTimeString()
    }]);
    setMostrarSugerencias(true);

    console.log('🚀 ChatBot inicializado con sessionId:', newSessionId);
  }, []);

  return (
    <div className="container chatbot-container">
      <div className="chatbot-header">
        <h3>🍽️ La Buena Mesa - Asistente Virtual</h3>
        <small>Reservas • Menú • Información</small>
        {/* Debug info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ fontSize: '0.7em', color: '#666', marginTop: '4px' }}>
            SessionID: {sessionId ? sessionId.substr(-12) : 'Cargando...'}
            <button 
              onClick={clearSession} 
              style={{ marginLeft: '8px', fontSize: '0.7em', padding: '2px 6px' }}
              className="btn btn-sm btn-outline-secondary"
            >
              Nueva Sesión
            </button>
          </div>
        )}
      </div>
      
      <div className="chatbot-window card p-3 mb-3">
        {mensajes.map((msg, i) => (
          <div
            key={i}
            className={`d-flex chat-msg align-items-end mb-2 ${
              msg.tipo === "user"
                ? "justify-content-start"
                : "justify-content-end"
            }`}
          >
            {msg.tipo === "user" && (
              <img
                src="https://ui-avatars.com/api/?name=U&background=6f42c1&color=fff&size=30"
                alt="User Avatar"
                className="rounded-circle me-2 chat-avatar"
              />
            )}

            <div className={`chat-msg p-2 rounded ${msg.tipo}`}>
              <div className="message-content">
                {msg.texto}
              </div>
              {msg.timestamp && (
                <div className="message-timestamp" style={{
                  fontSize: "0.7em",
                  color: "#999",
                  marginTop: "4px",
                  textAlign: msg.tipo === "user" ? "left" : "right"
                }}>
                  {msg.timestamp}
                </div>
              )}
            </div>

            {msg.tipo === "bot" && (
              <div className="bot-avatar ms-2">{getBotInitial()}</div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="d-flex justify-content-end mb-2">
            <div className="bot-avatar me-2">R</div>
            <div className="chat-msg bot p-2 rounded">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              Escribiendo...
            </div>
          </div>
        )}

        {/* Empty div for auto-scrolling */}
        <div ref={messagesEndRef} />

        {/* Sugerencias rápidas - Solo mostrar en mensaje inicial */}
        {mostrarSugerencias && mensajes.length === 1 && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {sugerencias.map((sug, i) => (
              <button
                key={i}
                className="btn btn-sm btn-outline-warning suggestion-btn"
                onClick={() => enviarMensaje(sug)}
                disabled={isLoading || !sessionId}
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chatbot-input input-group">
        <input
          type="text"
          className="form-control"
          placeholder={!sessionId ? "Inicializando..." : isLoading ? "Procesando..." : "Escribí un mensaje..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || !sessionId}
        />
        <button
          className="btn btn-warning"
          onClick={handleSend}
          disabled={!input.trim() || isLoading || !sessionId}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Enviando...
            </>
          ) : (
            "Enviar"
          )}
        </button>
      </div>

      {/* Status indicator */}
      <div className="chatbot-status">
        <small className="text-muted">
          Estado: {!sessionId ? "🔄 Inicializando..." : isLoading ? "🟡 Procesando..." : "🟢 Listo"}
        </small>
      </div>
    </div>
  );
}

// App Component - This is the main component that will be rendered
export default function App() {
  return (
    <div className="App">
      <ChatBotDemo />
    </div>
  );
}
// {
//   "nodes": [
//     {
//       "parameters": {
//         "httpMethod": "POST",
//         "path": "/chatbot-reserver",
//         "responseMode": "responseNode",
//         "options": {}
//       },
//       "id": "webhook-node",
//       "name": "Webhook Chatbot",
//       "type": "n8n-nodes-base.webhook",
//       "typeVersion": 1,
//       "position": [
//         80,
//         300
//       ],
//       "webhookId": "93fa4e3a-4008-4242-a56d-3f03e293a4a9"
//     },
//     {
//       "parameters": {
//         "conditions": {
//           "options": {
//             "caseSensitive": true,
//             "leftValue": "",
//             "typeValidation": "strict",
//             "version": 1
//           },
//           "conditions": [
//             {
//               "id": "condition1",
//               "leftValue": "={{ $json.whatsappData }}",
//               "rightValue": "",
//               "operator": {
//                 "type": "string",
//                 "operation": "exists",
//                 "singleValue": true
//               }
//             }
//           ],
//           "combinator": "and"
//         },
//         "options": {}
//       },
//       "id": "check-whatsapp",
//       "name": "Check WhatsApp",
//       "type": "n8n-nodes-base.if",
//       "typeVersion": 2,
//       "position": [
//         700,
//         300
//       ]
//     },
//     {
//       "parameters": {
//         "options": {}
//       },
//       "id": "response-node",
//       "name": "Response",
//       "type": "n8n-nodes-base.respondToWebhook",
//       "typeVersion": 1,
//       "position": [
//         1180,
//         420
//       ]
//     },
//     {
//       "parameters": {
//         "promptType": "define",
//         "text": "=Eres un agente conversacional inteligente que actúa como **asistente virtual del restaurante \"La Buena Mesa\"**, un restaurante argentino ubicado en Av. Corrientes 1234, CABA. Tu rol es brindar atención al cliente, responder consultas frecuentes y gestionar nuevas reservas de manera organizada y conversacional.\n\n### DATOS DEL RESTAURANTE:\n- 📍 Dirección: Av. Corrientes 1234, CABA, Argentina\n- 📞 Teléfono: +54 11 4555-0123\n- 🍽️ Especialidad: Cocina argentina moderna\n- 🕐 Horarios:\n  - Lunes a Viernes: 12:00–15:00 y 19:00–23:30\n  - Sábados: 12:00–16:00 y 19:00–00:00\n  - Domingos: 12:00–16:00\n  - Cerrado feriados nacionales\n- 🌐 Menú Online: https://alanassell.github.io/RestaurantPage/\n\n### FUNCIONALIDADES DEL AGENTE:\n\n**1. Información General**  \nResponde a preguntas sobre horarios, ubicación, menú, formas de pago, especialidades y políticas generales.  \n→ Siempre termina con: “¿Querés que te ayude con una reserva?” si no se inició una.\n\n**w.Informacion sobre el menu**   \n→ Comparte este link https://alanassell.github.io/RestaurantPage/.\n→ Debes compartirlo en en output debe tener la respuest y un na variable mas que sera el link \n\n**3. Gestión de Reservas**  \nGuía al cliente paso a paso para registrar una nueva reserva (sin modificar existentes):  \n  a. Solicitar nombre completo  \n  b. Solicitar número de celular con prefijo internacional (mínimo 8 dígitos) \nguardalo en una variable {{ $json.whatsappNumber }}\n  c. Solicitar fecha y hora de la reserva  \n  d. Solicitar cantidad de personas  \n  e. Generar código de reserva: `RES` + 6 caracteres aleatorios  \n  f. Confirmar la reserva mostrando todos los datos y agregando la variable `{{ $json.whatsappData }}` debe tener:\n\n📝 **Inicio de Reserva:**  \n\"¡Perfecto! Te ayudo con tu reserva 📝  \nPor favor, decime tu nombre completo.\"\n\n✅ **Confirmación Final:**  \n\"✅ ¡Reserva confirmada!  \n🆔 Número: RES38F2K  \n👤 Nombre: Juan Pérez  \n📱 Teléfono: +54 9 11 1234-5678  \n📅 Fecha/Hora: 20 de julio, 20:30 hs  \n👥 Personas: 4\n\n📱 Te enviaremos confirmación por WhatsApp Tambien. ¡Te esperamos! 🍽️\"  \n---\n\n**4. Comunicación y Estilo**  \n- Usa emojis relevantes (🍽️📞📅📍👥)  \n- Sé profesional, amable y directo  \n- No repitas información innecesaria  \n- Valida el formato de teléfono y fecha si es confuso  \n- Si hay dudas, propone opciones o pide confirmar\n\n**5. Restricciones Técnicas**\n- No confirmar disponibilidad en tiempo real: siempre decir \"sujeto a disponibilidad\"\n- No modificar ni cancelar reservas\n- No confirmar pagos ni procesar adelantos\n- No brindar información sobre alérgenos → derivar al teléfono del restaurante\n\n**6. Respuestas modelo (formato dinámico):**\n\n🕐 **Consulta por horarios:**  \n\"Nuestros horarios son:  \n📅 Lun–Vie: 12:00–15:00 y 19:00–23:30  \n📅 Sábados: 12:00–16:00 y 19:00–00:00  \n📅 Domingos: 12:00–16:00  \n¿Te gustaría hacer una reserva? 🍽️\"\n\n📍 **Ubicación:**  \n\"Estamos en Av. Corrientes 1234, CABA, a 2 cuadras del subte B (Estación Pellegrini).  \nHay estacionamiento en el edificio y acceso para personas con movilidad reducida.\"\n\n\nMENSAJE USUARIO: {{ $json.body.mensaje }}",
//         "options": {}
//       },
//       "type": "@n8n/n8n-nodes-langchain.agent",
//       "typeVersion": 2,
//       "position": [
//         280,
//         300
//       ],
//       "id": "ef6a4732-0fd9-435d-a661-1199f41c0e71",
//       "name": "AI Agent"
//     },
//     {
//       "parameters": {
//         "model": {
//           "__rl": true,
//           "mode": "list",
//           "value": "gpt-4.1-mini"
//         },
//         "options": {}
//       },
//       "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
//       "typeVersion": 1.2,
//       "position": [
//         240,
//         500
//       ],
//       "id": "65f340e1-e401-4273-b704-39ca4f4dcc85",
//       "name": "OpenAI Chat Model",
//       "credentials": {
//         "openAiApi": {
//           "id": "w4CTSA72Gh7lqWWy",
//           "name": "OpenAi account"
//         }
//       }
//     },a
//     {
//       "parameters": {
//         "resource": "messages-api",
//         "instanceName": "Alan Assel Bussines",
//         "remoteJid": "= {{ $json.whatsappNumber }}@s.whatsapp.net",
//         "messageText": "={{ $json.whatsappData }}",
//         "options_message": {}
//       },
//       "type": "n8n-nodes-evolution-api.evolutionApi",
//       "typeVersion": 1,
//       "position": [
//         1160,
//         100
//       ],
//       "id": "9419ebd2-c682-4e5a-bff8-d9e5cbb43636",
//       "name": "Enviar texto",
//       "credentials": {
//         "evolutionApi": {
//           "id": "X3OMhvz8jfBGNEZR",
//           "name": "Evolution account"
//         }
//       }
//     },
//     {
//       "parameters": {
//         "sessionIdType": "customKey",
//         "sessionKey": "={{ $json.headers['x-forwarded-server'] }}"
//       },
//       "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
//       "typeVersion": 1.3,
//       "position": [
//         360,
//         520
//       ],
//       "id": "b7a472f8-64cc-4829-9f58-b5ed0f03fd4e",
//       "name": "Simple Memory"
//     }
//   ],
//   "connections": {
//     "Webhook Chatbot": {
//       "main": [
//         [
//           {
//             "node": "AI Agent",
//             "type": "main",
//             "index": 0
//           }
//         ]
//       ]
//     },
//     "Check WhatsApp": {
//       "main": [
//         [
//           {
//             "node": "Enviar texto",
//             "type": "main",
//             "index": 0
//           }
//         ],
//         [
//           {
//             "node": "Response",
//             "type": "main",
//             "index": 0
//           }
//         ]
//       ]
//     },
//     "AI Agent": {
//       "main": [
//         [
//           {
//             "node": "Check WhatsApp",
//             "type": "main",
//             "index": 0
//           }
//         ]
//       ]
//     },
//     "OpenAI Chat Model": {
//       "ai_languageModel": [
//         [
//           {
//             "node": "AI Agent",
//             "type": "ai_languageModel",
//             "index": 0
//           }
//         ]
//       ]
//     },
//     "Simple Memory": {
//       "ai_memory": [
//         [
//           {
//             "node": "AI Agent",
//             "type": "ai_memory",
//             "index": 0
//           }
//         ]
//       ]
//     }
//   },
//   "pinData": {
//     "Webhook Chatbot": [
//       {
//         "headers": {
//           "host": "pruebas-n8n.pasruo.easypanel.host",
//           "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
//           "content-length": "33",
//           "accept": "*/*",
//           "accept-encoding": "gzip, deflate, br, zstd",
//           "accept-language": "es-ES,es;q=0.9,en;q=0.8,as;q=0.7",
//           "content-type": "application/json",
//           "origin": "http://localhost:5173",
//           "priority": "u=1, i",
//           "referer": "http://localhost:5173/",
//           "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
//           "sec-ch-ua-mobile": "?0",
//           "sec-ch-ua-platform": "\"Windows\"",
//           "sec-fetch-dest": "empty",
//           "sec-fetch-mode": "cors",
//           "sec-fetch-site": "cross-site",
//           "x-forwarded-for": "190.19.114.98",
//           "x-forwarded-host": "pruebas-n8n.pasruo.easypanel.host",
//           "x-forwarded-port": "443",
//           "x-forwarded-proto": "https",
//           "x-forwarded-server": "d299bab0c57e",
//           "x-real-ip": "190.19.114.98"
//         },
//         "params": {},
//         "query": {},
//         "body": {
//           "mensaje": "Quiero ver el menú"
//         },
//         "webhookUrl": "https://pruebas-n8n.pasruo.easypanel.host/webhook/chatbot-reserver",
//         "executionMode": "production"
//       }
//     ]
//   },
//   "meta": {
//     "templateCredsSetupCompleted": true,
//     "instanceId": "c476b7076a5413d7d9a36aa35fef93a10b60c4bca2cbb8480acc5dfefcbbee9f"
//   }
// }