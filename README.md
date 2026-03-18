# Telegram AI Assistant

Un asistente personal de inteligencia artificial completo, diseñado para funcionar a través de Telegram y preparado para el despliegue en un VPS usando Dokploy o Docker Compose.

## Características 🌟
- **Interacción por Telegram**: Recibe mensajes de texto y notas de voz.
- **Transcripción de audios**: Usa Whisper (`gpt-4o` base) para traducir audios a texto automáticamente.
- **Respuestas Inteligentes**: Conectado a la API de OpenAI (recomendado `gpt-4o-mini` como modelo rápido, ligero y barato).
- **Memoria Conversacional Persistente**: Uso de SQLite ultra-rápido (`better-sqlite3`).
- **Contexto Eficiente e Inteligente**:
  - Recuerda de manera instantánea los N últimos mensajes.
  - Genera **resúmenes automatizados en segundo plano** del historial cuando la ventana de conversación crece, evitando enviar miles de tokens inútiles y recortando costes.
  - Extrae y **almacena hechos permanentes, gustos y preferencias** de la persona conversando (ej. "me llamo Juan") para utilizarlos de manera proactiva en el futuro.
- **Seguro**: Restringe el uso del bot a una lista blanca de ID(s) de usuario.

## Requisitos
- Node.js 20+
- Un Bot de Telegram (Obtenido desde `BotFather`)
- Una clave de API de OpenAI

## Ejecución en Local 💻

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configuración de variables de entorno**:
   Copia `.env.example` a `.env` y rellena con tus credenciales.
   ```bash
   cp .env.example .env
   ```
   
   Asegúrate de llenar:
   - `TELEGRAM_BOT_TOKEN`: El token mandado por BotFather.
   - `TELEGRAM_ALLOWED_USER_IDS`: Tu(s) ID numérico de Telegram (para que nadie más pueda conversar con el bot). 
   - `OPENAI_API_KEY`: Tu token de OpenAI.

3. **Ejecutar modo desarrollo**:
   ```bash
   npm run dev
   ```

## Persistencia con SQLite en un VPS (Dokploy / Docker) ☁️

La base de datos (mensajes, resúmenes, recuerdos) se guarda en un archivo SQLite ubicado por defecto en `data/database.sqlite`.

Para asegurar de que **no pierdes nada de información** cada vez que actualices tu bot o despliegues desde GitHub (redeploy) en tu VPS usando Docker o Dokploy:

1. **La carpeta `data/` se monta en un volumen persistente**:
   El proyecto ha sido preparado con un `Dockerfile` y un `docker-compose.yml`. Al observar el `docker-compose.yml`, verás la directiva `volumes: - assistant_data:/app/data`.
   
2. **Despliegue con Dokploy**:
   - Crea un nuevo servicio en Dokploy del tipo **Docker Compose** o conectado a tu repositorio Git con **Dockerfile**.
   - Dokploy preserva la creación del volumen mapeado. Todo archivo (el `.sqlite`) guardado en la carpeta `/app/data` dentro del contenedor residirá físicamente en el disco duro del VPS fuera del ciclo de vida del contenedor.
   - Cuando Dokploy construya una nueva versión y tire abajo el contenedor antiguo, el volumen `assistant_data` seguirá existiendo. Al levantarse de nuevo, los nuevos contenedores se enlazarán inmediatamente al antiguo volumen montando tu historial de conversaciones como si nada hubiera pasado.

## Estructura
- `/src/services/memory.ts`: Gestión inteligente y resumen recursivo del historial.
- `/src/db/queries.ts`: Interfaz limpia con la base de datos `better-sqlite3`.
- `Dockerfile` / `docker-compose.yml`: Preparados para VPS.

## Comandos que entiende tu bot 🤖
- `/start` - Inicializar y comenzar.
- `/help` - Ver ayuda.
- `/status` - Revisar que está en línea.
- `/memory` - Ver todo lo que el bot ha recordado permanentemente sobre ti.
- `/clear` - Borrar todo el historial y la memoria. Empezar de cero.
