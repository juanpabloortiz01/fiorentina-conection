// State Management
let currentInstance = '';
let isCheckingStatus = false;
let isFetchingQr = false;
let qrCountdownTimer = null;
let statusPollInterval = null;
const QR_LIFETIME_SECONDS = 40;
let remainingSeconds = QR_LIFETIME_SECONDS;

// DOM Elements
const statusPill = document.getElementById('statusPill');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

const qrSection = document.getElementById('qrSection');
const connectedSection = document.getElementById('connectedSection');

const qrImage = document.getElementById('qrImage');
const qrLoader = document.getElementById('qrLoader');
const qrExpired = document.getElementById('qrExpired');
const progressBar = document.getElementById('progressBar');

const pairingCodeWrapper = document.getElementById('pairingCodeWrapper');
const pairingCodeValue = document.getElementById('pairingCodeValue');

const btnRefresh = document.getElementById('btnRefresh');
const btnRefreshExpired = document.getElementById('btnRefreshExpired');
const btnLogout = document.getElementById('btnLogout');
const btnCopyInstance = document.getElementById('btnCopyInstance');

const footerInstanceId = document.getElementById('footerInstanceId');
const connectedInstanceName = document.getElementById('connectedInstanceName');
const toastEl = document.getElementById('toast');

// Show toast message
function showToast(message, duration = 2500) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, duration);
}

// Copy to clipboard
btnCopyInstance.addEventListener('click', async () => {
  if (!currentInstance) return;
  try {
    await navigator.clipboard.writeText(currentInstance);
    showToast('ID de instancia copiado');
  } catch (err) {
    showToast('Error al copiar');
  }
});

// Update UI Connection Status
function setStatus(state) {
  statusPill.className = 'connection-pill';

  if (state === 'open') {
    statusPill.classList.add('online');
    statusLabel.textContent = 'Conectado';
    showConnectedView();
  } else if (state === 'connecting') {
    statusPill.classList.add('waiting');
    statusLabel.textContent = 'Vinculando...';
  } else if (state === 'close') {
    statusPill.classList.add('waiting');
    statusLabel.textContent = 'Esperando escaneo';
    showQrView();
  } else {
    statusPill.classList.add('error');
    statusLabel.textContent = 'Desconectado';
  }
}

function showConnectedView() {
  qrSection.classList.remove('active');
  connectedSection.classList.add('active');
  stopQrCountdown();
}

function showQrView() {
  connectedSection.classList.remove('active');
  qrSection.classList.add('active');
}

// Start QR countdown
function startQrCountdown() {
  stopQrCountdown();
  remainingSeconds = QR_LIFETIME_SECONDS;
  progressBar.style.width = '100%';

  qrCountdownTimer = setInterval(() => {
    remainingSeconds--;
    const percentage = Math.max(0, (remainingSeconds / QR_LIFETIME_SECONDS) * 100);
    progressBar.style.width = `${percentage}%`;

    if (remainingSeconds <= 0) {
      stopQrCountdown();
      // Auto refresh QR when expired
      fetchQrCode();
    }
  }, 1000);
}

function stopQrCountdown() {
  if (qrCountdownTimer) {
    clearInterval(qrCountdownTimer);
    qrCountdownTimer = null;
  }
}

// Fetch QR Code from backend
async function fetchQrCode() {
  if (isFetchingQr) return;
  isFetchingQr = true;

  qrLoader.classList.remove('hidden');
  qrExpired.classList.add('hidden');
  qrImage.classList.add('hidden');

  try {
    const res = await fetch('/api/connect');
    const data = await res.json();

    if (data.success && data.base64) {
      qrImage.src = data.base64;
      qrImage.onload = () => {
        qrLoader.classList.add('hidden');
        qrImage.classList.remove('hidden');
        startQrCountdown();
      };

      if (data.pairingCode) {
        pairingCodeValue.textContent = data.pairingCode;
        pairingCodeWrapper.classList.remove('hidden');
      } else {
        pairingCodeWrapper.classList.add('hidden');
      }
    } else {
      // If no base64 was returned, check if already connected
      await checkStatus();
    }
  } catch (err) {
    console.error('Error al obtener QR:', err);
    qrLoader.classList.add('hidden');
    qrExpired.classList.remove('hidden');
  } finally {
    isFetchingQr = false;
  }
}

// Check Connection Status
async function checkStatus() {
  if (isCheckingStatus) return;
  isCheckingStatus = true;

  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.success) {
      setStatus(data.state);

      // If instance is closed and no QR is loaded, load one
      if (data.state === 'close' && qrImage.classList.contains('hidden') && !isFetchingQr) {
        fetchQrCode();
      }
    } else {
      setStatus('error');
    }
  } catch (err) {
    console.error('Error al verificar estado:', err);
    setStatus('error');
  } finally {
    isCheckingStatus = false;
  }
}

// Disconnect Instance
btnLogout.addEventListener('click', async () => {
  const confirmLogout = confirm('¿Estás seguro de que deseas desvincular esta cuenta de WhatsApp?');
  if (!confirmLogout) return;

  try {
    btnLogout.disabled = true;
    btnLogout.textContent = 'Desvinculando...';

    const res = await fetch('/api/disconnect', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast('Sesión cerrada correctamente');
      setTimeout(() => {
        checkStatus();
        fetchQrCode();
      }, 1500);
    } else {
      showToast('Error al cerrar sesión');
    }
  } catch (err) {
    showToast('Error en la solicitud');
  } finally {
    btnLogout.disabled = false;
    btnLogout.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>Desvincular Instancia</span>
    `;
  }
});

// Event Listeners for Refresh buttons
btnRefresh.addEventListener('click', () => {
  fetchQrCode();
  showToast('Actualizando código QR...');
});

btnRefreshExpired.addEventListener('click', () => {
  fetchQrCode();
});

// Init Application
async function init() {
  try {
    const res = await fetch('/api/info');
    const info = await res.json();
    currentInstance = info.instanceName;
    footerInstanceId.textContent = currentInstance;
    connectedInstanceName.textContent = currentInstance;
  } catch (err) {
    console.error('No se pudo obtener información de la instancia:', err);
  }

  // Initial checks
  await checkStatus();
  fetchQrCode();

  // Periodic polling every 3.5s
  statusPollInterval = setInterval(checkStatus, 3500);
}

init();
