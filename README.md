# 🖤 Evolution API QR Connection Portal

Portal web minimalista en blanco y negro diseñado para vincular instancias de WhatsApp a través de **Evolution API** alojada en Easypanel.

## ✨ Características

- **Diseño Ultra-Minimalista**: Monocromático (B&W), tipografía moderna (*Plus Jakarta Sans*), micro-interacciones sutiles y modo oscuro de alto contraste.
- **Detección Automática de Estado**:
  - `Esperando escaneo` con código QR renderizado en tiempo real.
  - Barra de progreso que actualiza el QR antes de que expire.
  - `Conectado`: Pantalla de confirmación con detalles y opción para desvincular.
- **Seguro**: Las credenciales (`EVOLUTION_API_KEY`) se mantienen en el backend mediante variables de entorno en `.env`, sin exponerse en el cliente.
- **Cero dependencias pesadas**: Corre con el motor nativo de Node.js v18+.

---

## 🚀 Inicio Rápido

### 1. Variables de entorno (`.env`)
El archivo `.env` ya se encuentra configurado con tus credenciales:
```env
EVOLUTION_API_URL=https://evoapi.novaautomat.site
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
INSTANCE_NAME=quos_6754767c-276c-4abd-af33-8611062f271d
PORT=3000
```

### 2. Iniciar el servidor
Puedes hacer doble clic en `start.bat` o ejecutar en tu terminal:
```bash
node server.js
```

### 3. Abrir en el navegador
Abre tu navegador en:
```
http://localhost:3000
```
