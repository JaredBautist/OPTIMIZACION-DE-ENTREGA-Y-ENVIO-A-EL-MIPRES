# MIPRES con Microservicios

Suite de microservicios que moderniza el flujo operativo de MIPRES. Incluye un backend NestJS que centraliza la autenticación JWT y el proxy hacia los servicios oficiales de MIPRES, junto con un frontend React (Vite + Bootstrap 5) que ofrece el panel operativo para generar tokens, registrar entregas, reportes y facturación diaria.

## Arquitectura

| Servicio            | Descripción                                                                 | Tecnologías principales                    | Puerto por defecto |
|---------------------|------------------------------------------------------------------------------|--------------------------------------------|--------------------|
| `nest-backend`      | API que expone login JWT, health-check y los endpoints `/mipres/*`. Encamina y valida solicitudes contra los servicios oficiales de MIPRES. | NestJS 11, Axios, JWT, Throttler | `3001`             |
| `mipres-frontend`   | Panel web responsive para operadores. Maneja autenticación, formularios de Entrega/Reporte/Facturación, persistencia local y descarga de bitácoras. | React 19, Vite 7, Bootstrap 5              | `5173` (Vite)      |

## Requisitos previos

- Node.js 18 o superior (recomendado 20 LTS).
- npm 9+ (incluido con Node 18+).
- Acceso a los servicios MIPRES (URLs oficiales definidas por el Ministerio de Salud).

## Puesta en marcha rápida

1. Clona el repositorio y posicionate en la carpeta raíz `mipress`:
   ```bash
   git clone https://github.com/JaredBautist/MIPRES-CON-MICROSERVICIOS.git
   cd MIPRES-CON-MICROSERVICIOS/mipress
   ```
2. Configura entornos (ver secciones siguientes) copiando cada `.env.example` a `.env`.
3. Instala dependencias y arranca cada servicio en terminales separadas:
   ```bash
   # Backend NestJS
   cd nest-backend
   npm install
   npm run start:dev

   # Frontend React
   cd ../mipres-frontend
   npm install
   npm run dev
   ```
4. Abre el navegador en [http://localhost:5173](http://localhost:5173) y asegúrate de que el backend esté accesible en [http://localhost:3001/api/health](http://localhost:3001/api/health).

## Variables de entorno

### Backend (`nest-backend/.env`)

| Variable                 | Descripción                                                                                           | Valor por defecto (`.env.example`)                                 |
|--------------------------|-------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| `PORT`                   | Puerto de escucha del servidor NestJS.                                                                | `3001`                                                             |
| `JWT_SECRET`             | Clave para firmar los JWT usados por el frontend. Cambia este valor en producción.                    | `change-me`                                                        |
| `MIPRES_BASE_URL`        | URL base para las operaciones de generación de token, entrega y reporte.                              | `https://wsmipres.sispro.gov.co/WSSUMMIPRESNOPBS`                  |
| `MIPRES_FAC_BASE_URL`    | URL base para las operaciones de facturación.                                                         | `https://wsmipres.sispro.gov.co/WSFACMIPRESNOPBS`                  |
| `MIPRES_HTTP_TIMEOUT_MS` | Timeout máximo (ms) al consumir los servicios oficiales de MIPRES.                                    | `45000`                                                            |

### Frontend (`mipres-frontend/.env`)

| Variable              | Descripción                                             | Valor por defecto (`.env.example`) |
|-----------------------|---------------------------------------------------------|------------------------------------|
| `VITE_API_BASE_URL`   | URL base para consumir el backend NestJS (`/api`).      | `http://localhost:3001/api`        |

## API expuesta por el backend

> Todos los endpoints (excepto `/api/health` y `/api/login`) requieren encabezado `Authorization: Bearer <JWT>` emitido por el endpoint de login.

| Método | Ruta                | Descripción                                                                                                      |
|--------|---------------------|------------------------------------------------------------------------------------------------------------------|
| `POST` | `/api/login`        | Genera un JWT válido por 24h. Actualmente acepta cualquier combinación de `username`/`password` (validación pendiente). |
| `GET`  | `/api/health`       | Health-check simple: estado, timestamp y versión.                                                                |
| `POST` | `/api/mipres/token` | Proxy a `GenerarToken` de MIPRES. Solicita `nit` y `token` maestro para recuperar el token diario oficial.       |
| `PUT`  | `/api/mipres/entrega` | Registra entregas (`Entrega` o `EntregaAmbito`) usando los datos del formulario y el token obtenido.             |
| `PUT`  | `/api/mipres/reporte` | Registra reporte de entrega (`ReporteEntrega`). Requiere ID, estado, causa y valor entregado.                    |
| `PUT`  | `/api/mipres/facturacion` | Registra facturación (`Facturacion`). Requiere datos de prescripción, EPS, valores facturados, etc.              |

El servicio aplica:

- **`ValidationPipe` global** con `whitelist` y `forbidNonWhitelisted`, asegurando payloads estrictos según los DTO.
- **`@nestjs/throttler`** limitado a 100 solicitudes cada 15 minutos por IP para proteger el backend de abuso.
- Normalización y registro de cabeceras/respuestas de la API oficial para facilitar depuración desde el frontend.

## Funcionalidad del frontend

- Autenticación básica: solicita `username` y `password`, almacena el JWT en `localStorage` y renueva la sesión automáticamente si existe un token válido.
- Gestión del token MIPRES diario: permite guardar el token activo y su expiración, alertando al usuario cuando es necesario renovarlo.
- Formularios con pestañas para Entrega, Reporte y Facturación, con validación ligera y precarga de valores recurrentes.
- Consola de respuestas con formato JSON, badges de estado HTTP y pila de notificaciones.
- Seguimiento de actividad: contador de envíos del día, último ID procesado y bitácora descargable en JSON (opcionalmente filtrada solo por fallos).
- Interfaz responsive en tema oscuro, optimizada para sesiones largas y con soporte de atajos visuales mediante iconografía Font Awesome.

## Flujo operativo recomendado

1. **Inicio de sesión:** el operador ingresa credenciales en el frontend. Se obtiene un JWT del backend (`/api/login`). El backend no valida contra un directorio externo; agrega tu propia lógica si necesitas seguridad real.
2. **Generación de token diario:** con el JWT activo, se ejecuta `/api/mipres/token` para obtener el token oficial de MIPRES usando `nit` y token maestro.
3. **Operaciones diarias:** el token oficial se utiliza para enviar entregas, reportes y facturaciones. El backend inyecta el usuario (`username`) en la ruta requerida por MIPRES.
4. **Monitoreo y bitácora:** el frontend persiste cada respuesta localmente. Al cierre de la jornada se puede exportar un reporte JSON para auditoría.

## Scripts útiles

```bash
# Backend
npm run start:dev     # Recarga en caliente
npm run lint          # ESLint con autofix
npm run test          # Jest (unit tests)
npm run build         # Compilación a dist/

# Frontend
npm run dev           # Servidor Vite (HMR)
npm run build         # Build de producción en dist/
npm run preview       # Previsualizar build de dist/
npm run lint          # ESLint con la configuración del proyecto
```

## Estructura de carpetas

```
mipress/
├── mipres-frontend/      # SPA en React + Vite
│   ├── public/           # Recursos estáticos
│   └── src/              # Componentes, estilos y lógica del panel
└── nest-backend/         # API NestJS
    ├── src/
    │   ├── auth/         # Login JWT, estrategia y guardia
    │   ├── mipres/       # DTOs, controlador y servicio proxy a MIPRES
    │   └── app.*         # Bootstrap y health-check
    └── test/             # Pruebas de ejemplo generadas por Nest CLI
```

## Planes de despliegue (en pausa)

> Aún no hay despliegue productivo; estas ideas quedan en backlog para cuando toque preparar infraestructura.

- Migrar los secretos (`JWT_SECRET`, credenciales MIPRES) a un gestor seguro como Azure Key Vault, AWS Secrets Manager o variables cifradas del orquestador.
- Colocar el backend detrás de HTTPS cuando se exponga `/api/login` y revisar políticas de CORS para entornos externos.
- Ajustar el límite del `ThrottlerModule` según métricas reales y, si es necesario, añadir observabilidad (logs centralizados, APM).
- Empaquetar ambos servicios con Docker y habilitar pipelines de build/deploy antes de pasar a entornos de prueba o producción.
- Evaluar persistencia central para la bitácora (ej. base de datos) si se requiere histórico compartido en lugar de depender de `localStorage`.

---

¿Necesitas automatizar despliegues o agregar más microservicios? Crea un issue o abre un PR para seguir expandiendo la plataforma.
