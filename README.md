# MIPRES Frontend

Interfaz React (Vite) para el panel de gestion MIPRES. Consume el backend NestJS y replica los flujos existentes: autenticacion JWT, generacion de token diario y los formularios de Entrega, Reporte y Facturacion con almacenamiento local de bitacoras.

## Configuracion rapida

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Copia las variables de entorno y ajusta la URL del backend si es necesario:
   ```bash
   cp .env.example .env
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

Para compilar la version de produccion:
```bash
npm run build
```

## Caracteristicas

- Tema oscuro responsive con Bootstrap 5 y componentes optimizados para formularios extensos.
- Manejo de estado con React y `localStorage` para conservar JWT, token MIPRES, estadisticas y bitacora diaria.
- Panel de alertas y respuesta estructurada para cada peticion HTTP.
- Exportacion local (JSON) de los envios realizados durante el dia.

## Variables de entorno

- `VITE_API_BASE_URL`: URL base del backend (`http://localhost:3001/api` por defecto).

## Requisitos

- Node.js >= 18
- Backend NestJS disponible en la URL configurada en `VITE_API_BASE_URL`.
