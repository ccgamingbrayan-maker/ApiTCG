// ─── ELEMENTOS GLOBALES ──────────────────────────────────────────────────
const loadingOverlay = document.getElementById('loadingOverlay');

const fmtCurrency = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return '$' + parseFloat(num).toFixed(2);
};

// Garantiza URLs en alta calidad evitando miniaturas pixeladas y resolviendo rutas locales a CDN público
const getHighQualityImageUrl = (url, cardNumber, setCode) => {
  if (!url) {
    if (cardNumber && /^[A-Z]{1,3}\d{2}-\d{3}/i.test(cardNumber)) {
      return `https://www.optcgapi.com/media/static/Card_Images/${cardNumber}.jpg`;
    }
    return '';
  }

  if (url.startsWith('/images/cards/')) {
    const filename = url.replace(/^\/images\/cards\//, '');
    const cleanName = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');

    const tcgMatch = cleanName.match(/^(\d+)/);
    if (tcgMatch) {
      return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgMatch[1]}_in_1000x1000.jpg`;
    }

    if (/don/i.test(cleanName) || setCode === 'DON') {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/655914_in_1000x1000.jpg';
    }

    const num = cardNumber || cleanName;
    const opMatch = num.match(/^([A-Z]{1,3})-?(\d{2})-?(\d{3})/i);
    if (opMatch) {
      const formatted = `${opMatch[1].toUpperCase()}${opMatch[2]}-${opMatch[3]}`;
      return `https://www.optcgapi.com/media/static/Card_Images/${formatted}.jpg`;
    }

    return `https://www.optcgapi.com/media/static/Card_Images/${cleanName}.jpg`;
  }

  if (url.includes('OP05-060_p4.jpg')) {
    return 'https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/OP01-121_p2.jpg';
  }

  return url
    .replace(/_in_\d+x\d+/i, '_in_1000x1000')
    .replace(/_\d+w\./i, '_400w.');
};

// ─── GENERADOR DE BADGES PARA RAREZAS ONE PIECE TCG ───────────────────────
function getRarityBadgeHtml(rarity) {
  if (!rarity || rarity === 'N/A' || rarity === 'NULL') {
    return `<span class="rarity-badge rarity-c">COMÚN</span>`;
  }
  const r = String(rarity).toUpperCase().trim();
  if (r === 'MANGA') {
    return `<span class="rarity-badge rarity-manga"><i class="fa-solid fa-fire text-amber-300"></i> MANGA</span>`;
  }
  if (r === 'SP' || r === 'SPR') {
    return `<span class="rarity-badge rarity-sp"><i class="fa-solid fa-star text-purple-300"></i> SP</span>`;
  }
  if (r === 'L-AA' || r === 'L-PARALLEL') {
    return `<span class="rarity-badge rarity-laa"><i class="fa-solid fa-crown text-red-300"></i> LÍDER AA</span>`;
  }
  if (r === 'SEC-AA') {
    return `<span class="rarity-badge rarity-sec-aa"><i class="fa-solid fa-sparkles text-indigo-300"></i> SEC-AA</span>`;
  }
  if (r === 'SR-AA') {
    return `<span class="rarity-badge rarity-sraa"><i class="fa-solid fa-sparkles text-indigo-300"></i> SR-AA</span>`;
  }
  if (r === 'R-AA') {
    return `<span class="rarity-badge rarity-raa"><i class="fa-solid fa-sparkles text-indigo-300"></i> R-AA</span>`;
  }
  if (r === 'AA') {
    return `<span class="rarity-badge rarity-aa"><i class="fa-solid fa-sparkles text-indigo-300"></i> AA</span>`;
  }
  if (r === 'TR') {
    return `<span class="rarity-badge rarity-sec"><i class="fa-solid fa-gem text-purple-300"></i> TR</span>`;
  }
  if (r === 'L') {
    return `<span class="rarity-badge rarity-l"><i class="fa-solid fa-shield-halved text-red-300"></i> LÍDER</span>`;
  }
  if (r === 'SEC') {
    return `<span class="rarity-badge rarity-sec">SEC</span>`;
  }
  if (r === 'SR') {
    return `<span class="rarity-badge rarity-sr">SR</span>`;
  }
  if (r === 'R') {
    return `<span class="rarity-badge rarity-r">R</span>`;
  }
  if (r === 'UC') {
    return `<span class="rarity-badge rarity-uc">UC</span>`;
  }
  if (r === 'C') {
    return `<span class="rarity-badge rarity-c">C</span>`;
  }
  if (r === 'DON') {
    return `<span class="rarity-badge rarity-don"><i class="fa-solid fa-bolt text-yellow-300"></i> DON!!</span>`;
  }
  if (r === 'P' || r === 'PR') {
    return `<span class="rarity-badge rarity-p">PROMO</span>`;
  }
  return `<span class="rarity-badge rarity-c">${r}</span>`;
}

// ─── NAVEGACIÓN ENTRE SECCIONES DEL PANEL ─────────────────────────────────
const tabMarket = document.getElementById('tabMarket');
const tabCollection = document.getElementById('tabCollection');
const tabInventory = document.getElementById('tabInventory');
const tabDecks = document.getElementById('tabDecks');

const marketSection = document.getElementById('marketSection');
const localCollectionSection = document.getElementById('localCollection');
const physicalInventorySection = document.getElementById('physicalInventorySection');
const deckSection = document.getElementById('deckSection');

function switchTab(target) {
  [tabMarket, tabCollection, tabInventory, tabDecks].forEach(t => {
    t?.classList.remove('active', 'bg-sky-500/20', 'bg-purple-500/20', 'text-white');
    t?.classList.add('text-slate-400');
  });

  marketSection?.classList.add('hidden');
  localCollectionSection?.classList.add('hidden');
  physicalInventorySection?.classList.add('hidden');
  deckSection?.classList.add('hidden');

  if (target === 'marketSection') {
    tabMarket?.classList.add('active', 'bg-sky-500/20', 'text-white');
    tabMarket?.classList.remove('text-slate-400');
    marketSection?.classList.remove('hidden');
  } else if (target === 'localCollection') {
    tabCollection?.classList.add('active', 'bg-sky-500/20', 'text-white');
    tabCollection?.classList.remove('text-slate-400');
    localCollectionSection?.classList.remove('hidden');
    if (allSets.length === 0) {
      loadCollectionFolders();
    }
  } else if (target === 'physicalInventorySection') {
    tabInventory?.classList.add('active', 'bg-sky-500/20', 'text-white');
    tabInventory?.classList.remove('text-slate-400');
    physicalInventorySection?.classList.remove('hidden');
    loadPhysicalInventory();
  } else if (target === 'deckSection') {
    tabDecks?.classList.add('active', 'bg-purple-500/20', 'text-white');
    tabDecks?.classList.remove('text-slate-400');
    deckSection?.classList.remove('hidden');
    loadSavedDecksCount();
  }
}

tabMarket?.addEventListener('click', () => switchTab('marketSection'));
tabCollection?.addEventListener('click', () => switchTab('localCollection'));
tabInventory?.addEventListener('click', () => switchTab('physicalInventorySection'));
tabDecks?.addEventListener('click', () => switchTab('deckSection'));


// ─── SECCIÓN 1: CATÁLOGO Y ANÁLISIS DE MERCADO (TCGPLAYER / COLLECTR) ──────
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const searchResults = document.getElementById('searchResults');
const analysisSection = document.getElementById('analysisSection');
const imageInput = document.getElementById('imageInput');

const catalogResultsCount = document.getElementById('catalogResultsCount');
const catalogTotalBadge = document.getElementById('catalogTotalBadge');
const catalogSortSelect = document.getElementById('catalogSortSelect');
const sidebarSetSelect = document.getElementById('sidebarSetSelect');
const sidebarRarityPills = document.getElementById('sidebarRarityPills');
const btnResetFilters = document.getElementById('btnResetFilters');
const btnBackFromAnalysis = document.getElementById('btnBackFromAnalysis');

let currentCatalogCards = [];
let activeRarityFilter = 'all';
let activeSetFilter = 'all';

// Cargar catálogo inicial de cartas en formato TCGPlayer
async function loadCatalogCards(setFilter = 'all', rarityFilter = 'all') {
  loadingOverlay?.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Cargando catálogo oficial...';

  try {
    let url = '/api/cards/saved';
    const params = new URLSearchParams();
    if (setFilter && setFilter !== 'all') params.append('set', setFilter);
    if (rarityFilter && rarityFilter !== 'all') params.append('rarity', rarityFilter);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await fetch(url);
    const data = await res.json();
    loadingOverlay?.classList.add('hidden');

    if (data.success && data.data) {
      currentCatalogCards = data.data;
      if (catalogResultsCount) {
        if (setFilter !== 'all' || rarityFilter !== 'all') {
          catalogResultsCount.innerText = `Filtro: ${setFilter !== 'all' ? setFilter : ''} ${rarityFilter !== 'all' ? rarityFilter : ''}`.trim();
        } else {
          catalogResultsCount.innerText = 'Catálogo Oficial One Piece TCG';
        }
      }
      applyCatalogSortingAndRender();
    }
  } catch (err) {
    loadingOverlay?.classList.add('hidden');
    console.error('Error al cargar catálogo:', err);
  }
}

function applyCatalogSortingAndRender() {
  const sort = catalogSortSelect?.value || 'default';
  let sorted = [...currentCatalogCards];

  if (sort === 'name') {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sort === 'rarity') {
    const rarityRank = { 'MANGA': 100, 'SP': 90, 'L-AA': 80, 'SEC-AA': 75, 'SR-AA': 70, 'AA': 65, 'SEC': 60, 'SR': 50, 'DON': 45, 'R': 40, 'UC': 30, 'C': 20 };
    sorted.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
  }

  renderResults(sorted);
}

catalogSortSelect?.addEventListener('change', () => {
  applyCatalogSortingAndRender();
});

// Renderizar tarjetas en cuadrícula compacta de coleccionista (Collectr / TCGPlayer style)
function renderResults(cards) {
  if (catalogTotalBadge) {
    catalogTotalBadge.innerText = `${cards.length.toLocaleString()} cartas`;
  }
  
  resultsGrid.innerHTML = '';
  
  if (!cards || cards.length === 0) {
    resultsGrid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <i class="fa-solid fa-ghost text-4xl mb-3 text-slate-600 block"></i>
        <p class="text-sm font-medium">No se encontraron cartas con los filtros seleccionados.</p>
        <button onclick="document.getElementById('btnResetFilters')?.click()" class="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 font-semibold transition">
          Restablecer Filtros
        </button>
      </div>
    `;
    return;
  }

  // Limitar render inicial para máxima fluidez si son miles de cartas
  const displayCards = cards.slice(0, 120);

  displayCards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'group relative flex flex-col bg-slate-900 border border-slate-800 hover:border-sky-500 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-200 cursor-pointer select-none';

    const displayImg = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code);
    const imgHtml = displayImg 
      ? `<img src="${displayImg}" alt="${card.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null; this.src='https://www.optcgapi.com/media/static/Card_Images/${card.card_number}.jpg';">` 
      : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 bg-slate-950"><i class="fa-regular fa-image text-2xl"></i><span class="text-[10px]">Sin imagen</span></div>`;

    const rarityBadge = card.rarity ? getRarityBadgeHtml(card.rarity) : '';
    const dispNum = getDisplayCardNumber(card);
    const numberBadge = dispNum ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur text-slate-300 border border-slate-700/60 shadow-sm">${dispNum}</span>` : '';

    el.innerHTML = `
      <!-- Contenedor Imagen Carta con Ratio TCG -->
      <div class="relative w-full aspect-[7/10] bg-slate-950 overflow-hidden flex items-center justify-center">
        ${imgHtml}
        <div class="absolute top-1.5 right-1.5 z-10">
          ${rarityBadge}
        </div>
        <div class="absolute top-1.5 left-1.5 z-10">
          ${numberBadge}
        </div>
      </div>
      
      <!-- Metadatos de la Carta -->
      <div class="p-2.5 flex flex-col flex-1 justify-between gap-1 bg-slate-900/90">
        <div>
          <h4 class="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition truncate" title="${card.name}">${card.name}</h4>
          <p class="text-[10px] text-slate-400 truncate">${card.set_name || card.set_code || ''}</p>
        </div>
        
        <!-- Fila de Acciones -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 mt-auto">
          <button class="btn-card-analyze flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition">
            <i class="fa-solid fa-chart-line text-[10px]"></i> Analizar
          </button>
          <button class="btn-card-quick-inv text-slate-400 hover:text-indigo-400 text-xs p-1 transition" title="Registrar en inventario físico">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;

    el.querySelector('.btn-card-analyze')?.addEventListener('click', (e) => {
      e.stopPropagation();
      analyzeCard(card);
    });

    el.querySelector('.btn-card-quick-inv')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModalForCard(card);
    });

    el.addEventListener('click', () => {
      analyzeCard(card);
    });

    resultsGrid.appendChild(el);
  });
}

// Búsqueda Universal TCGPlayer / Local
searchBtn?.addEventListener('click', async () => {
  let q = (searchInput?.value || '').trim();
  q = q.replace(/_small(\.[a-z0-9]+)?/gi, '').trim();
  if (!q) return;

  // Si es un enlace directo de TCGPlayer o producto
  if (q.includes('tcgplayer.com/product/') || (q.startsWith('http') && q.includes('/product/'))) {
    analyzeCard(q);
    return;
  }

  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Buscando carta...';
  
  try {
    const localRes = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`);
    const localData = await localRes.json();
    
    if (localData.success && localData.data && localData.data.length > 0) {
      loadingOverlay.classList.add('hidden');
      analysisSection.classList.add('hidden');
      searchResults.classList.remove('hidden');
      currentCatalogCards = localData.data;
      if (catalogResultsCount) catalogResultsCount.innerText = `Resultados para: "${q}"`;
      applyCatalogSortingAndRender();
      return;
    }

    // Si es un ID de producto numérico (ej: 566953) y no estaba en DB local
    if (/^\d{5,8}$/.test(q)) {
      loadingOverlay.classList.add('hidden');
      analyzeCard(`https://www.tcgplayer.com/product/${q}`);
      return;
    }

    document.getElementById('loadingText').innerText = 'Buscando en TCGPlayer...';
    const res = await fetch(`/api/cards/tcg-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    loadingOverlay.classList.add('hidden');
    analysisSection.classList.add('hidden');
    searchResults.classList.remove('hidden');

    if (data.success && data.data.length > 0) {
      currentCatalogCards = data.data;
      if (catalogResultsCount) catalogResultsCount.innerText = `Resultados TCGPlayer para: "${q}"`;
      applyCatalogSortingAndRender();
    } else {
      alert('No se encontraron cartas con ese nombre ni en la base de datos ni en TCGPlayer.');
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    alert('Error al buscar la carta.');
    console.error(error);
  }
});

searchInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// Función para redimensionar y comprimir imágenes en el cliente (ideal para fotos de cámara de móvil)
function compressImage(file, maxDimension = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error leyendo la foto'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error decodificando la imagen'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Escáner de foto con IA (optimizado para cámara móvil)
imageInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  loadingOverlay?.classList.remove('hidden');
  const loadingText = document.getElementById('loadingText');
  if (loadingText) loadingText.innerText = 'Optimizando foto...';

  try {
    // 1. Redimensionar y comprimir en el dispositivo (reduce fotos de 15MB a ~180KB en milisegundos)
    const base64 = await compressImage(file, 1200, 0.82);

    if (loadingText) loadingText.innerText = 'Analizando carta con IA Gemini...';

    // 2. Enviar a la API con timeout para evitar que se quede congelado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch('/api/ai/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (data.success && data.searchString) {
      const cleanSearch = data.searchString.replace(/_small/gi, '').trim();
      searchInput.value = cleanSearch;
      searchBtn.click();
    } else {
      alert('No se pudo identificar la carta: ' + (data.error || 'Asegúrate de enfocar bien la carta.'));
    }
  } catch (err) {
    console.error('Error al procesar foto:', err);
    if (err.name === 'AbortError') {
      alert('El análisis tardó demasiado. Por favor, intenta de nuevo.');
    } else {
      alert('Error procesando la foto: ' + (err.message || 'Intenta de nuevo.'));
    }
  } finally {
    loadingOverlay?.classList.add('hidden');
    imageInput.value = '';
  }
});

// ─── ESCÁNER EN VIVO CON CÁMARA (DETECCIÓN AUTOMÁTICA) ───────────────────
const btnOpenScanner = document.getElementById('btnOpenScanner');
const modalLiveScanner = document.getElementById('modalLiveScanner');
const btnCloseScanner = document.getElementById('btnCloseScanner');
const btnScannerTorch = document.getElementById('btnScannerTorch');
const btnScannerUpload = document.getElementById('btnScannerUpload');
const btnTriggerScan = document.getElementById('btnTriggerScan');
const toggleAutoScan = document.getElementById('toggleAutoScan');
const scannerVideo = document.getElementById('scannerVideo');
const scannerCanvas = document.getElementById('scannerCanvas');
const scannerStatusText = document.getElementById('scannerStatusText');
const scannerStatusDot = document.getElementById('scannerStatusDot');
const scannerTargetBox = document.getElementById('scannerTargetBox');
const scannerLaser = document.getElementById('scannerLaser');

// Elementos de la tarjeta de confirmación (Modo Híbrido)
const scannerDetectionCard = document.getElementById('scannerDetectionCard');
const scannerCardThumb = document.getElementById('scannerCardThumb');
const scannerCardCodeBadge = document.getElementById('scannerCardCodeBadge');
const scannerCardRarityBadge = document.getElementById('scannerCardRarityBadge');
const scannerCardName = document.getElementById('scannerCardName');
const scannerCountdownSec = document.getElementById('scannerCountdownSec');
const btnCancelDetection = document.getElementById('btnCancelDetection');
const btnConfirmDetection = document.getElementById('btnConfirmDetection');

let scannerStream = null;
let scannerTrack = null;
let isTorchOn = false;
let isScanningActive = false;
let autoScanTimer = null;
let isAnalyzingFrame = false;
let detectionTimeout = null;
let detectionInterval = null;
let pendingSearchString = null;

// Iniciar cámara en vivo
async function startLiveScanner() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Tu navegador no soporta acceso directo a la cámara. Puedes subir una foto desde la galería.');
    imageInput?.click();
    return;
  }

  modalLiveScanner?.classList.remove('hidden');
  updateScannerStatus('Iniciando cámara...', 'amber');

  try {
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    scannerStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (scannerVideo) {
      scannerVideo.srcObject = scannerStream;
      await scannerVideo.play();
      // Asegurar que el primer fotograma esté decodificado
      if (scannerVideo.readyState < 2) {
        await new Promise(resolve => {
          scannerVideo.onloadeddata = resolve;
          setTimeout(resolve, 600);
        });
      }
    }

    scannerTrack = scannerStream.getVideoTracks()[0];
    isScanningActive = true;
    updateScannerStatus('Apunta a la carta...', 'emerald');

    // Revisar soporte de linterna
    const capabilities = scannerTrack?.getCapabilities ? scannerTrack.getCapabilities() : {};
    if (btnScannerTorch) {
      if (capabilities.torch) {
        btnScannerTorch.classList.remove('opacity-40', 'pointer-events-none');
      } else {
        btnScannerTorch.classList.add('opacity-40');
      }
    }

    scheduleNextAutoScan(1200);
  } catch (err) {
    console.error('Error al acceder a la cámara:', err);
    updateScannerStatus('Cámara no disponible', 'red');
    alert('No se pudo acceder a la cámara. Permite los permisos de cámara o selecciona una foto de la galería.');
    stopLiveScanner();
  }
}

// Detener cámara y liberar hardware
function stopLiveScanner() {
  isScanningActive = false;
  if (autoScanTimer) {
    clearTimeout(autoScanTimer);
    autoScanTimer = null;
  }
  if (detectionInterval) clearInterval(detectionInterval);
  if (detectionTimeout) clearTimeout(detectionTimeout);
  detectionInterval = null;
  detectionTimeout = null;
  pendingSearchString = null;
  scannerDetectionCard?.classList.add('hidden');
  isAnalyzingFrame = false;

  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
  scannerTrack = null;
  isTorchOn = false;

  if (scannerVideo) {
    scannerVideo.srcObject = null;
  }

  modalLiveScanner?.classList.add('hidden');
  resetTargetBoxStyles();
}

// Alternar linterna / flash
async function toggleScannerTorch() {
  if (!scannerTrack) return;
  try {
    const capabilities = scannerTrack.getCapabilities ? scannerTrack.getCapabilities() : {};
    if (!capabilities.torch) {
      alert('Tu dispositivo no soporta linterna desde el navegador.');
      return;
    }
    isTorchOn = !isTorchOn;
    await scannerTrack.applyConstraints({
      advanced: [{ torch: isTorchOn }]
    });
    if (btnScannerTorch) {
      btnScannerTorch.classList.toggle('text-yellow-400', isTorchOn);
      btnScannerTorch.classList.toggle('border-yellow-500', isTorchOn);
    }
  } catch (err) {
    console.warn('Error al activar linterna:', err);
  }
}

// Actualizar indicador de estado
function updateScannerStatus(text, color = 'emerald') {
  if (scannerStatusText) scannerStatusText.innerText = text;
  if (scannerStatusDot) {
    scannerStatusDot.className = 'w-2.5 h-2.5 rounded-full animate-pulse';
    if (color === 'emerald') scannerStatusDot.classList.add('bg-emerald-400');
    else if (color === 'amber') scannerStatusDot.classList.add('bg-amber-400');
    else if (color === 'sky') scannerStatusDot.classList.add('bg-sky-400');
    else if (color === 'red') scannerStatusDot.classList.add('bg-red-500');
  }
}

function resetTargetBoxStyles() {
  if (scannerTargetBox) {
    scannerTargetBox.classList.remove('border-emerald-400', 'shadow-[0_0_35px_rgba(52,211,153,0.7)]', 'border-red-400');
    scannerTargetBox.classList.add('border-sky-400/90', 'shadow-[0_0_35px_rgba(56,189,248,0.35)]');
  }
  if (scannerLaser) {
    scannerLaser.classList.remove('via-emerald-400', 'shadow-[0_0_12px_#34d399]');
    scannerLaser.classList.add('via-sky-400', 'shadow-[0_0_12px_#38bdf8]');
  }
}

// Mostrar Tarjeta Flotante de Confirmación Rápida (Opción 3: Modo Híbrido)
function showDetectionConfirmation(searchString, card) {
  pendingSearchString = searchString;

  // Feedback háptico
  if (navigator.vibrate) {
    navigator.vibrate([80, 50, 120]);
  }

  // Animación del marco en verde esmeralda
  if (scannerTargetBox) {
    scannerTargetBox.classList.remove('border-sky-400/90', 'shadow-[0_0_35px_rgba(56,189,248,0.35)]');
    scannerTargetBox.classList.add('border-emerald-400', 'shadow-[0_0_35px_rgba(52,211,153,0.7)]');
  }
  if (scannerLaser) {
    scannerLaser.classList.remove('via-sky-400', 'shadow-[0_0_12px_#38bdf8]');
    scannerLaser.classList.add('via-emerald-400', 'shadow-[0_0_12px_#34d399]');
  }

  const cardCode = card?.card_number || searchString;
  const cardName = card?.name || searchString;
  const cardRarity = card?.rarity || 'OP';
  const cardImg = card?.image_url || '/images/cards/OP01-013.jpg';

  if (scannerCardCodeBadge) scannerCardCodeBadge.innerText = cardCode;
  if (scannerCardRarityBadge) scannerCardRarityBadge.innerText = cardRarity;
  if (scannerCardName) scannerCardName.innerText = cardName;
  if (scannerCardThumb) {
    scannerCardThumb.src = cardImg;
    scannerCardThumb.onerror = () => {
      scannerCardThumb.src = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';
    };
  }

  updateScannerStatus(`¡Detectada: ${cardCode}!`, 'emerald');

  // Mostrar la tarjeta flotante
  scannerDetectionCard?.classList.remove('hidden');

  // Cuenta regresiva de 2 segundos antes de auto-abrir
  let secondsLeft = 2;
  if (scannerCountdownSec) scannerCountdownSec.innerText = secondsLeft;

  if (detectionInterval) clearInterval(detectionInterval);
  if (detectionTimeout) clearTimeout(detectionTimeout);

  detectionInterval = setInterval(() => {
    secondsLeft--;
    if (scannerCountdownSec) scannerCountdownSec.innerText = secondsLeft;
    if (secondsLeft <= 0) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
  }, 1000);

  detectionTimeout = setTimeout(() => {
    executeConfirmedSearch();
  }, 2200);
}

// Cancelar detección y seguir escaneando
function dismissDetection() {
  if (detectionInterval) clearInterval(detectionInterval);
  if (detectionTimeout) clearTimeout(detectionTimeout);
  detectionInterval = null;
  detectionTimeout = null;
  pendingSearchString = null;

  scannerDetectionCard?.classList.add('hidden');
  resetTargetBoxStyles();
  updateScannerStatus('Apunta a la carta...', 'emerald');

  setTimeout(() => {
    isAnalyzingFrame = false;
    if (isScanningActive && toggleAutoScan?.checked) {
      scheduleNextAutoScan(1000);
    }
  }, 300);
}

// Ejecutar búsqueda de la carta confirmada
function executeConfirmedSearch() {
  const query = pendingSearchString;
  if (detectionInterval) clearInterval(detectionInterval);
  if (detectionTimeout) clearTimeout(detectionTimeout);
  detectionInterval = null;
  detectionTimeout = null;

  if (!query) return;

  stopLiveScanner();
  if (searchInput) searchInput.value = query;
  searchBtn?.click();
}

// Extraer fotograma nítido y optimizado de la cámara
function captureTargetFrameBase64() {
  if (!scannerVideo || scannerVideo.readyState < 2) return null;
  const vw = scannerVideo.videoWidth;
  const vh = scannerVideo.videoHeight;
  if (!vw || !vh || vw <= 0 || vh <= 0) return null;

  // Tomamos el área central con margen amplio (90% para capturar la carta entera sin recortes accidentales)
  const cropRatio = 0.90;
  const sw = Math.round(vw * cropRatio);
  const sh = Math.round(vh * cropRatio);
  const sx = Math.round((vw - sw) / 2);
  const sy = Math.round((vh - sh) / 2);

  // Escalar para que el lado mayor no supere 960px (ultra ligero ~80KB-120KB)
  const maxDim = 960;
  let targetW = sw;
  let targetH = sh;
  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  if (targetW <= 0 || targetH <= 0) return null;

  scannerCanvas.width = targetW;
  scannerCanvas.height = targetH;
  const ctx = scannerCanvas.getContext('2d');
  ctx.drawImage(scannerVideo, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const dataUrl = scannerCanvas.toDataURL('image/jpeg', 0.82);
  if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 500) {
    return null;
  }
  return dataUrl;
}

// Analizar frame capturado
async function scanCurrentFrame(isManual = false) {
  if (!isScanningActive || isAnalyzingFrame || pendingSearchString) return;

  const base64 = captureTargetFrameBase64();
  if (!base64) {
    if (isManual) {
      updateScannerStatus('Cámara enfocando... mantén firme.', 'amber');
    }
    return;
  }

  isAnalyzingFrame = true;
  updateScannerStatus(isManual ? 'Analizando captura...' : 'Escaneando...', 'sky');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('/api/ai/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (data.success && data.searchString && isScanningActive) {
      const cleanResult = data.searchString.replace(/_small/gi, '').trim();

      // ¡CARTA DETECTADA! Mostrar confirmación rápida híbrida
      showDetectionConfirmation(cleanResult, data.card);
      return;
    } else {
      if (isManual) {
        updateScannerStatus('No se leyó el código. Acerca más la carta.', 'amber');
        setTimeout(() => {
          if (isScanningActive && !pendingSearchString) updateScannerStatus('Apunta a la carta...', 'emerald');
        }, 2200);
      } else {
        updateScannerStatus('Buscando código (OP##-###)...', 'emerald');
      }
    }
  } catch (err) {
    if (isManual) {
      console.warn('Error en escaneo:', err);
      updateScannerStatus('Reintentando...', 'amber');
    }
  } finally {
    if (!pendingSearchString) {
      isAnalyzingFrame = false;
      if (isScanningActive && toggleAutoScan?.checked) {
        scheduleNextAutoScan(1800);
      }
    }
  }
}

// Bucle temporizado para escaneo automático continuo
function scheduleNextAutoScan(delayMs = 2000) {
  if (autoScanTimer) clearTimeout(autoScanTimer);
  if (!isScanningActive || !toggleAutoScan?.checked || pendingSearchString) return;

  autoScanTimer = setTimeout(() => {
    if (isScanningActive && toggleAutoScan?.checked && !isAnalyzingFrame && !pendingSearchString) {
      scanCurrentFrame(false);
    } else if (isScanningActive && !pendingSearchString) {
      scheduleNextAutoScan(1500);
    }
  }, delayMs);
}

// Event Listeners del Escáner
btnOpenScanner?.addEventListener('click', () => {
  startLiveScanner();
});

btnCloseScanner?.addEventListener('click', () => {
  stopLiveScanner();
});

btnScannerTorch?.addEventListener('click', () => {
  toggleScannerTorch();
});

btnScannerUpload?.addEventListener('click', () => {
  stopLiveScanner();
  imageInput?.click();
});

btnTriggerScan?.addEventListener('click', () => {
  scanCurrentFrame(true);
});

btnCancelDetection?.addEventListener('click', (e) => {
  e.stopPropagation();
  dismissDetection();
});

btnConfirmDetection?.addEventListener('click', (e) => {
  e.stopPropagation();
  executeConfirmedSearch();
});

toggleAutoScan?.addEventListener('change', () => {
  if (toggleAutoScan.checked) {
    scheduleNextAutoScan();
  } else if (autoScanTimer) {
    clearTimeout(autoScanTimer);
    autoScanTimer = null;
    updateScannerStatus('Modo manual: pulsa el botón para capturar', 'sky');
  }
});

// Manejo de Filtros de la Barra Lateral
sidebarRarityPills?.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-rarity-pill');
  if (!btn) return;

  sidebarRarityPills.querySelectorAll('.filter-rarity-pill').forEach(p => {
    p.classList.remove('active', 'bg-sky-500/10', 'text-sky-300', 'border-sky-500/30');
    p.classList.add('bg-slate-950', 'text-slate-300', 'border-slate-800');
  });

  btn.classList.add('active', 'bg-sky-500/10', 'text-sky-300', 'border-sky-500/30');
  btn.classList.remove('bg-slate-950', 'border-slate-800');

  activeRarityFilter = btn.dataset.rarity || 'all';
  loadCatalogCards(activeSetFilter, activeRarityFilter);
});

sidebarSetSelect?.addEventListener('change', () => {
  activeSetFilter = sidebarSetSelect.value || 'all';
  loadCatalogCards(activeSetFilter, activeRarityFilter);
});

btnResetFilters?.addEventListener('click', () => {
  activeRarityFilter = 'all';
  activeSetFilter = 'all';
  if (sidebarSetSelect) sidebarSetSelect.value = 'all';
  if (searchInput) searchInput.value = '';

  sidebarRarityPills?.querySelectorAll('.filter-rarity-pill').forEach(p => {
    const isAll = p.dataset.rarity === 'all';
    p.classList.toggle('active', isAll);
    p.classList.toggle('bg-sky-500/10', isAll);
    p.classList.toggle('text-sky-300', isAll);
    p.classList.toggle('border-sky-500/30', isAll);
    p.classList.toggle('bg-slate-950', !isAll);
    p.classList.toggle('border-slate-800', !isAll);
  });

  loadCatalogCards('all', 'all');
});

// Clic en chips de búsqueda rápida en la barra lateral
document.querySelectorAll('.quick-tag-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const term = btn.getAttribute('data-search');
    if (term && searchInput && searchBtn) {
      searchInput.value = term;
      searchBtn.click();
    }
  });
});


// ─── ANÁLISIS EN VIVO DE PRECIOS TCGPLAYER ─────────────────────────────────
let currentAnalyzedCard = null;

async function analyzeCard(cardOrUrl) {
  searchResults?.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Analizando mercado y ventas...';

  let payload = {};
  if (typeof cardOrUrl === 'string') {
    payload = { url: cardOrUrl.replace(/_small(\.[a-z0-9]+)?/gi, '') };
  } else {
    payload = {
      url: (cardOrUrl.tcgplayer_url || cardOrUrl.url || '').replace(/_small(\.[a-z0-9]+)?/gi, ''),
      card_id: cardOrUrl.card_id || cardOrUrl.id,
      card_name: cardOrUrl.card_name || cardOrUrl.name,
      rarity: cardOrUrl.rarity,
      card_number: cardOrUrl.card_number,
      set_code: cardOrUrl.set_code,
      set_name: cardOrUrl.set_name,
    };
  }

  try {
    const res = await fetch('/api/cards/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    loadingOverlay.classList.add('hidden');

    if (data.success) {
      currentAnalyzedCard = data.data.card;
      renderAnalysis(data.data);
      switchTab('marketSection');
      analysisSection.classList.remove('hidden');
      window.scrollTo({ top: analysisSection.offsetTop - 30, behavior: 'smooth' });
    } else {
      alert('Error al analizar la carta: ' + data.error);
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    alert('Error de conexión al analizar la carta.');
    console.error(error);
  }
}

function renderAnalysis(data) {
  const { card, latest_prices, price_analysis, recent_sales } = data;

  document.getElementById('cardName').innerText = card.name;
  const updateBadge = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!value || value === 'N/A') {
      el.style.display = 'none';
    } else {
      el.style.display = 'inline-block';
      el.innerText = value;
    }
  };

  updateBadge('cardSet', card.set_name);
  const rarityEl = document.getElementById('cardRarity');
  if (rarityEl) {
    if (!card.rarity || card.rarity === 'N/A') {
      rarityEl.style.display = 'none';
    } else {
      rarityEl.style.display = 'inline-block';
      rarityEl.className = '';
      rarityEl.innerHTML = getRarityBadgeHtml(card.rarity);
    }
  }
  updateBadge('cardNumber', card.card_number);
  
  const cleanLink = card.tcgplayer_url.replace(/_small/gi, '');
  document.getElementById('tcgLink').href = cleanLink;

  const cardImgEl = document.getElementById('cardImage');
  const resolvedImg = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code);
  if (resolvedImg) {
    cardImgEl.src = resolvedImg;
    cardImgEl.onerror = () => {
      cardImgEl.onerror = null;
      cardImgEl.src = `https://www.optcgapi.com/media/static/Card_Images/${card.card_number}.jpg`;
    };
    document.getElementById('cardImageContainer').style.display = 'block';
  } else {
    document.getElementById('cardImageContainer').style.display = 'none';
  }

  // Métricas financieras
  document.getElementById('valSuggested').innerText = fmtCurrency(price_analysis.suggested_price);
  document.getElementById('valMarket').innerText = fmtCurrency(latest_prices?.market_price);
  document.getElementById('valLastSale').innerText = fmtCurrency(latest_prices?.last_sale_price);
  document.getElementById('valAvg7d').innerText = fmtCurrency(price_analysis.average_7d);

  // Cálculo TRM COP
  const allPrices = [
    latest_prices?.market_price,
    latest_prices?.last_sale_price,
    price_analysis.average_7d,
    ...recent_sales.map(s => s.sale_price)
  ].map(Number).filter(n => !isNaN(n) && n > 0);
  
  const highestValue = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const valSellEl = document.getElementById('valSellPrice');
  if (highestValue > 0) {
    valSellEl.innerText = "Calculando TRM...";
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(trmData => {
        const cop = trmData.rates.COP;
        const sellPriceCOP = highestValue * cop;
        valSellEl.innerText = `$${sellPriceCOP.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
      })
      .catch(() => {
        valSellEl.innerText = "Error TRM";
      });
  } else {
    valSellEl.innerText = "--";
  }

  // Estado de inventario físico
  updatePhysicalStatusForCard(card);

  // Tabla de ventas históricas
  const tbody = document.querySelector('#salesTable tbody');
  const avgEl = document.getElementById('salesAverage');
  tbody.innerHTML = '';
  if (avgEl) avgEl.innerText = '';

  if (recent_sales && recent_sales.length > 0) {
    let totalSales = 0;
    let countSales = 0;

    recent_sales.forEach(sale => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';
      
      let conditionClass = 'bg-slate-800 text-slate-300';
      if (sale.condition.includes('Near Mint')) conditionClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      else if (sale.condition.includes('Lightly')) conditionClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';

      tr.innerHTML = `
        <td class="px-4 py-2.5 text-slate-400">${sale.sale_date}</td>
        <td class="px-4 py-2.5 font-bold text-emerald-400 font-mono text-sm">${fmtCurrency(sale.sale_price)}</td>
        <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[11px] font-medium ${conditionClass}">${sale.condition}</span></td>
      `;
      tbody.appendChild(tr);

      totalSales += Number(sale.sale_price);
      countSales++;
    });

    if (countSales > 0 && avgEl) {
      const avg = totalSales / countSales;
      avgEl.innerText = `Promedio de estas ventas: ${fmtCurrency(avg)}`;
    }
  } else {
    tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-4 text-center text-slate-500">No hay ventas registradas recientemente en TCGPlayer.</td></tr>`;
  }
}

btnBackFromAnalysis?.addEventListener('click', () => {
  analysisSection?.classList.add('hidden');
  searchResults?.classList.remove('hidden');
});

async function updatePhysicalStatusForCard(card) {
  const titleEl = document.getElementById('cardInvStatusTitle');
  const subEl = document.getElementById('cardInvStatusSubtitle');
  const btnEl = document.getElementById('btnQuickAddInv');
  if (!titleEl || !btnEl) return;

  try {
    const res = await fetch(`/api/inventory/card/${card.id}`);
    const data = await res.json();
    
    if (data.success && data.data.total_copies > 0) {
      const copies = data.data.total_copies;
      const totalPaid = data.data.records.reduce((sum, r) => sum + (r.purchase_price * r.quantity), 0);
      titleEl.innerText = `¡Tienes ${copies} ${copies === 1 ? 'copia física' : 'copias físicas'} de esta carta!`;
      subEl.innerText = `Inversión total registrada: ${fmtCurrency(totalPaid)} (${data.data.records.length} registros)`;
      btnEl.innerHTML = `<i class="fa-solid fa-plus"></i> Registrar Otra Copia`;
    } else {
      titleEl.innerText = `No tienes esta carta en tu inventario físico`;
      subEl.innerText = `¿Compraste esta carta? Regístrala aquí con su cantidad y precio`;
      btnEl.innerHTML = `<i class="fa-solid fa-plus"></i> Registrar en Inventario`;
    }
  } catch {
    titleEl.innerText = `Inventario Físico`;
    subEl.innerText = `Gestiona las copias de esta carta`;
  }

  btnEl.onclick = () => {
    openModalForCard(card);
  };
}


// ─── SECCIÓN 2: EXPANSIONES Y CARPETAS ────────────────────────────────────
const foldersView = document.getElementById('foldersView');
const folderDetailView = document.getElementById('folderDetailView');
const foldersGrid = document.getElementById('foldersGrid');
const folderCardsGrid = document.getElementById('folderCardsGrid');
const folderSearchInput = document.getElementById('folderSearchInput');
const folderFilterPills = document.getElementById('folderFilterPills');
const btnBackToFolders = document.getElementById('btnBackToFolders');
const activeFolderName = document.getElementById('activeFolderName');
const activeFolderCodeBadge = document.getElementById('activeFolderCodeBadge');
const activeFolderCountBadge = document.getElementById('activeFolderCountBadge');
const activeFolderIcon = document.getElementById('activeFolderIcon');
const cardFilterInput = document.getElementById('cardFilterInput');
const totalCardsCounter = document.getElementById('totalCardsCounter');

let allSets = [];
let currentFolderCards = [];
let activeFolderFilter = 'all';

async function loadCollectionFolders() {
  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Cargando carpetas de cartas...';
  
  try {
    const res = await fetch('/api/cards/sets');
    const data = await res.json();
    loadingOverlay.classList.add('hidden');
    
    if (data.success && data.data && data.data.length > 0) {
      allSets = [
        {
          set_code: 'MANGA',
          set_name: 'Colección de Cartas Manga (Super Parallel)',
          count: 48,
          sample_image: 'https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/OP05-119_p2.jpg'
        },
        {
          set_code: 'SP',
          set_name: 'Colección Especiales (SP / SPR)',
          count: 127,
          sample_image: 'https://epuskceyfpbdljmwvcca.supabase.co/storage/v1/object/public/cards/OP01-121_p2.jpg'
        },
        ...data.data
      ];
      
      const totalCards = allSets.reduce((sum, s) => sum + (s.count || 0), 0);
      if (totalCardsCounter) {
        totalCardsCounter.innerText = `${totalCards.toLocaleString()} cartas en ${allSets.length} colecciones`;
      }
      
      foldersView.classList.remove('hidden');
      folderDetailView.classList.add('hidden');
      renderFolders();
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    console.error('Error al cargar carpetas:', error);
  }
}

function renderFolders() {
  foldersGrid.innerHTML = '';
  const searchQ = (folderSearchInput?.value || '').trim().toLowerCase();
  
  const filtered = allSets.filter(set => {
    if (activeFolderFilter === 'MANGA' && set.set_code !== 'MANGA') return false;
    if (activeFolderFilter === 'SP' && set.set_code !== 'SP') return false;
    if (activeFolderFilter === 'DON' && set.set_code !== 'DON') return false;
    if (activeFolderFilter === 'OP' && !set.set_code.startsWith('OP-')) return false;
    if (activeFolderFilter === 'ST' && !set.set_code.startsWith('ST-')) return false;
    if (activeFolderFilter === 'EB' && !set.set_code.startsWith('EB-')) return false;
    
    if (searchQ) {
      const matchCode = set.set_code.toLowerCase().includes(searchQ);
      const matchName = (set.set_name || '').toLowerCase().includes(searchQ);
      if (!matchCode && !matchName) return false;
    }
    return true;
  });
  
  if (filtered.length === 0) {
    foldersGrid.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-folder-minus text-3xl mb-2 block"></i>
        <p class="text-xs">No se encontraron conjuntos con ese filtro.</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(set => {
    const isDon = set.set_code === 'DON';
    const isManga = set.set_code === 'MANGA';
    const isSp = set.set_code === 'SP';

    const card = document.createElement('div');
    card.className = 'group bg-slate-900 border border-slate-800 hover:border-sky-500 rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition shadow-sm hover:shadow-lg';
    
    let iconColor = 'text-sky-400';
    if (isDon) iconColor = 'text-amber-400';
    if (isManga) iconColor = 'text-amber-300';
    if (isSp) iconColor = 'text-purple-400';

    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-14 rounded bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
          ${set.sample_image ? `<img src="${getHighQualityImageUrl(set.sample_image, null, set.set_code)}" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null; this.src='https://www.optcgapi.com/media/static/Card_Images/${set.set_code.replace('-', '')}-001.jpg';">` : `<i class="fa-solid fa-folder ${iconColor} flex items-center justify-center h-full"></i>`}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-black text-white group-hover:text-sky-400 transition">${set.set_code}</span>
            <span class="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">${set.count} cartas</span>
          </div>
          <p class="text-xs text-slate-300 truncate" title="${set.set_name || set.set_code}">${set.set_name || set.set_code}</p>
        </div>
      </div>
      <i class="fa-solid fa-chevron-right text-slate-600 group-hover:text-sky-400 text-xs transition pr-1"></i>
    `;
    
    card.addEventListener('click', () => openFolder(set.set_code, set.set_name, set.count));
    foldersGrid.appendChild(card);
  });
}

folderFilterPills?.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;
  folderFilterPills.querySelectorAll('.pill').forEach(p => {
    p.classList.remove('active', 'bg-sky-600', 'text-white');
    p.classList.add('bg-slate-900', 'text-slate-300');
  });
  btn.classList.add('active', 'bg-sky-600', 'text-white');
  btn.classList.remove('bg-slate-900', 'text-slate-300');
  activeFolderFilter = btn.dataset.filter || 'all';
  renderFolders();
});

folderSearchInput?.addEventListener('input', () => renderFolders());

async function openFolder(setCode, setName, count) {
  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = `Abriendo colección ${setCode}...`;
  
  try {
    let url = `/api/cards/saved?set=${encodeURIComponent(setCode)}`;
    if (setCode === 'MANGA' || setCode === 'SP') {
      url = `/api/cards/saved?rarity=${encodeURIComponent(setCode)}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    loadingOverlay.classList.add('hidden');
    
    if (!data.success || !data.data) {
      alert('Error cargando las cartas de la colección.');
      return;
    }
    
    currentFolderCards = data.data;

    activeFolderName.innerText = setName || setCode;
    activeFolderCodeBadge.innerText = setCode;
    activeFolderCountBadge.innerText = `${currentFolderCards.length} cartas`;
    
    if (cardFilterInput) cardFilterInput.value = '';
    activeFolderRarityFilter = 'all';
    document.querySelectorAll('#folderRarityFilters .pill-rarity').forEach(p => {
      p.classList.toggle('active', p.dataset.rarity === 'all');
      p.classList.toggle('bg-sky-600', p.dataset.rarity === 'all');
      p.classList.toggle('text-white', p.dataset.rarity === 'all');
    });

    renderFolderCards(currentFolderCards);
    
    foldersView.classList.add('hidden');
    folderDetailView.classList.remove('hidden');
    window.scrollTo({ top: localCollectionSection.offsetTop - 20, behavior: 'smooth' });
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    alert('Error al abrir la colección.');
  }
}

let activeFolderRarityFilter = 'all';

function applyFolderCardFilters() {
  const q = (cardFilterInput?.value || '').trim().toLowerCase();

  const filtered = currentFolderCards.filter(c => {
    if (activeFolderRarityFilter !== 'all') {
      const r = (c.rarity || '').toUpperCase();
      if (activeFolderRarityFilter === 'MANGA' && r !== 'MANGA') return false;
      if (activeFolderRarityFilter === 'SP' && r !== 'SP' && r !== 'SPR') return false;
      if (activeFolderRarityFilter === 'L-AA' && r !== 'L-AA' && r !== 'L-PARALLEL') return false;
      if (activeFolderRarityFilter === 'AA-ALL' && !r.includes('AA')) return false;
      if (activeFolderRarityFilter === 'SEC-ALL' && !r.startsWith('SEC')) return false;
      if (activeFolderRarityFilter === 'SR-ALL' && !r.startsWith('SR')) return false;
      if (activeFolderRarityFilter === 'L' && r !== 'L') return false;
    }

    if (q) {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchNum = (c.card_number || '').toLowerCase().includes(q);
      if (!matchName && !matchNum) return false;
    }
    return true;
  });

  if (activeFolderCountBadge) {
    activeFolderCountBadge.innerText = `${filtered.length} cartas`;
  }

  renderFolderCards(filtered);
}

function renderFolderCards(cards) {
  folderCardsGrid.innerHTML = '';
  if (!cards || cards.length === 0) {
    folderCardsGrid.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-ghost text-3xl mb-2 block"></i>
        <p class="text-xs">No se encontraron cartas con esos filtros.</p>
      </div>
    `;
    return;
  }
  
  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = 'group relative flex flex-col bg-slate-900 border border-slate-800 hover:border-sky-500 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition cursor-pointer select-none';
    
    const displayImg = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code);
    const imgHtml = displayImg 
      ? `<img src="${displayImg}" alt="${card.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null; this.src='https://www.optcgapi.com/media/static/Card_Images/${card.card_number}.jpg';">` 
      : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 bg-slate-950"><i class="fa-regular fa-image text-2xl"></i></div>`;
      
    el.innerHTML = `
      <div class="relative w-full aspect-[7/10] bg-slate-950 overflow-hidden flex items-center justify-center">
        ${imgHtml}
        <div class="absolute top-1.5 right-1.5 z-10">${getRarityBadgeHtml(card.rarity)}</div>
        <div class="absolute top-1.5 left-1.5 z-10"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur text-slate-300 border border-slate-700/60">${card.card_number}</span></div>
      </div>
      <div class="p-2 flex flex-col gap-1 bg-slate-900/90">
        <h4 class="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition truncate" title="${card.name}">${card.name}</h4>
      </div>
    `;
    
    el.addEventListener('click', () => {
      analyzeCard(card);
    });
    folderCardsGrid.appendChild(el);
  });
}

btnBackToFolders?.addEventListener('click', () => {
  folderDetailView.classList.add('hidden');
  foldersView.classList.remove('hidden');
});

cardFilterInput?.addEventListener('input', () => applyFolderCardFilters());

document.getElementById('folderRarityFilters')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill-rarity');
  if (!btn) return;
  document.querySelectorAll('#folderRarityFilters .pill-rarity').forEach(p => {
    p.classList.remove('active', 'bg-sky-600', 'text-white');
    p.classList.add('bg-slate-900', 'text-slate-300');
  });
  btn.classList.add('active', 'bg-sky-600', 'text-white');
  btn.classList.remove('bg-slate-900', 'text-slate-300');
  activeFolderRarityFilter = btn.dataset.rarity || 'all';
  applyFolderCardFilters();
});


// ─── SECCIÓN 3: MI INVENTARIO FÍSICO ──────────────────────────────────────
const inventoryCardsGrid = document.getElementById('inventoryCardsGrid');
const inventorySearchInput = document.getElementById('inventorySearchInput');
const statTotalCopies = document.getElementById('statTotalCopies');
const statUniqueCards = document.getElementById('statUniqueCards');
const statTotalInvestment = document.getElementById('statTotalInvestment');

let physicalInventory = [];

async function loadPhysicalInventory() {
  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Cargando inventario físico...';

  try {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    loadingOverlay.classList.add('hidden');

    if (data.success && data.data) {
      physicalInventory = data.data.items || [];
      if (statTotalCopies) statTotalCopies.innerText = data.data.total_cards;
      if (statUniqueCards) statUniqueCards.innerText = data.data.unique_cards;
      if (statTotalInvestment) statTotalInvestment.innerText = fmtCurrency(data.data.total_investment);

      renderInventoryCards(physicalInventory);
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    console.error('Error al cargar inventario físico:', error);
  }
}

// Helper para extraer y mostrar el código/número de carta (ej. EB04-007, OP16-014, DON!!) sin mostrar 'N/A'
function getDisplayCardNumber(item) {
  let num = (item.card_number || '').trim();
  if (num && num !== 'N/A') {
    if (num.toLowerCase().startsWith('don_') || num.toUpperCase() === 'DON') return 'DON!!';
    return num;
  }
  
  // Extraer de card_name e.g. (EB04-007) o (OP16-014) o (006)
  if (item.card_name) {
    const m = item.card_name.match(/\b([A-Z]{2,3}\d{2}[-_]\d{3})\b/i);
    if (m) return m[1].toUpperCase();

    const mP = item.card_name.match(/\b(P[-_]\d{3})\b/i);
    if (mP) return mP[1].toUpperCase();

    if (item.card_name.includes('DON!!')) return 'DON!!';

    const mNum = item.card_name.match(/\((\d{3})\)/);
    if (mNum && item.expansion?.code) {
      const pfx = item.expansion.code.replace('-', '');
      return `${pfx}-${mNum[1]}`;
    }

    const mShort = item.card_name.match(/\b([A-Z]{2,3}\d{2})\b/i);
    if (mShort) return mShort[1].toUpperCase();
  }
  
  // Extraer de tcgplayer_url
  if (item.tcgplayer_url) {
    const m = item.tcgplayer_url.match(/q=([A-Z]{2,3}\d{2}-\d{3})/i);
    if (m) return m[1].toUpperCase();
    if (item.tcgplayer_url.includes('don-card')) return 'DON!!';
  }

  return item.expansion?.code || 'CARD';
}

// Helper para identificar la expansión / categoría de cualquier carta
function getExpansionInfo(item) {
  if (item.rarity === 'MANGA' || (item.card_name && item.card_name.toLowerCase().includes('(manga)'))) {
    return { code: 'MANGA', name: 'Super Parallel (Manga)', icon: 'fa-fire', accentClass: 'text-orange-400', badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/20' };
  }
  if (item.rarity === 'SP' || (item.card_name && /\bSP\b/i.test(item.card_name))) {
    return { code: 'SP', name: 'Cartas Especiales (SP)', icon: 'fa-star', accentClass: 'text-yellow-400', badgeBg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' };
  }
  if (item.rarity === 'DON' || item.set_code === 'DON' || (item.card_name && item.card_name.includes('DON!!')) || (item.card_number && item.card_number.toLowerCase().startsWith('don'))) {
    return { code: 'DON', name: 'Cartas DON!! Especiales', icon: 'fa-bolt', accentClass: 'text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
  }

  let rawCode = (item.set_code || '').trim().toUpperCase();

  // Extraer de card_number e.g. EB04-002, OP16-080, ST21-006, OP12-023
  if (!rawCode && item.card_number && item.card_number !== 'N/A') {
    const m = item.card_number.match(/^([A-Z]{2,3})\s*(\d{1,2})/i);
    if (m) rawCode = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
  }

  // Extraer de card_name e.g. (EB04-007) o (OP15-EB04)
  if (!rawCode && item.card_name) {
    const m = item.card_name.match(/\b([A-Z]{2,3})\s*(\d{1,2})[-_]/i);
    if (m) rawCode = `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}`;
  }

  // Extraer de tcgplayer_url
  if (!rawCode && item.tcgplayer_url) {
    const u = item.tcgplayer_url.toLowerCase();
    if (u.includes('adventure-on-kamis-island')) rawCode = 'OP-15';
    else if (u.includes('heroines-edition')) rawCode = 'EB-03';
    else if (u.includes('memorial-collection')) rawCode = 'EB-01';
    else if (u.includes('anime-25th')) rawCode = 'EB-02';
    else if (u.includes('the-best-vol-2')) rawCode = 'PRB-02';
    else if (u.includes('the-best')) rawCode = 'PRB-01';
    else if (u.includes('promotion-cards') || u.includes('promo')) rawCode = 'PROMO';
  }

  if (rawCode.startsWith('OP') && !rawCode.startsWith('OP-')) rawCode = rawCode.replace(/^OP(\d+)/, 'OP-$1');
  else if (rawCode.startsWith('EB') && !rawCode.startsWith('EB-')) rawCode = rawCode.replace(/^EB(\d+)/, 'EB-$1');
  else if (rawCode.startsWith('ST') && !rawCode.startsWith('ST-')) rawCode = rawCode.replace(/^ST(\d+)/, 'ST-$1');
  else if (rawCode.startsWith('PRB') && !rawCode.startsWith('PRB-')) rawCode = rawCode.replace(/^PRB(\d+)/, 'PRB-$1');

  const setNames = {
    'OP-01': 'Romance Dawn',
    'OP-02': 'Paramount War',
    'OP-03': 'Pillars of Strength',
    'OP-04': 'Kingdoms of Intrigue',
    'OP-05': 'Awakening of the New Era',
    'OP-06': 'Flanks of the Conspiracy',
    'OP-07': '500 Years in the Future',
    'OP-08': 'Two Legends',
    'OP-09': 'The Four Emperors',
    'OP-10': 'Royal Blood',
    'OP-11': 'A New Era Begins',
    'OP-12': 'Legacy of the Master',
    'OP-13': 'Wings of the Captain',
    'OP-14': 'Dawn of Adventure',
    'OP-15': "Adventure on Kami's Island",
    'OP-16': 'The Great Pirate Era',
    'EB-01': 'Memorial Collection',
    'EB-02': 'Anime 25th Collection',
    'EB-03': 'Heroines Edition',
    'EB-04': 'Special Extra Booster 04',
    'PRB-01': 'The Best Vol. 1',
    'PRB-02': 'The Best Vol. 2',
    'PROMO': 'Cartas Promocionales & Packs',
  };

  if (rawCode.startsWith('OP-')) {
    const name = setNames[rawCode] || `Booster Pack ${rawCode}`;
    return { code: rawCode, name, icon: 'fa-box-open', accentClass: 'text-sky-400', badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/20' };
  }
  if (rawCode.startsWith('EB-')) {
    const name = setNames[rawCode] || `Extra Booster ${rawCode}`;
    return { code: rawCode, name, icon: 'fa-gem', accentClass: 'text-rose-400', badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
  }
  if (rawCode.startsWith('ST-')) {
    return { code: rawCode, name: `Starter Deck ${rawCode}`, icon: 'fa-layer-group', accentClass: 'text-violet-400', badgeBg: 'bg-violet-500/10 text-violet-300 border-violet-500/20' };
  }
  if (rawCode.startsWith('PRB-')) {
    const name = setNames[rawCode] || `Premium Booster ${rawCode}`;
    return { code: rawCode, name, icon: 'fa-crown', accentClass: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
  }
  if (rawCode === 'PROMO') {
    return { code: 'PROMO', name: 'Cartas Promocionales', icon: 'fa-award', accentClass: 'text-teal-400', badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
  }

  return { code: rawCode || 'OTROS', name: rawCode || 'Otras Colecciones', icon: 'fa-folder', accentClass: 'text-slate-400', badgeBg: 'bg-slate-500/10 text-slate-300 border-slate-500/20' };
}

let activeInventoryFilter = 'all';

function renderInventoryCards(items) {
  const inventorySetPills = document.getElementById('inventorySetPills');
  inventoryCardsGrid.innerHTML = '';

  const q = (inventorySearchInput?.value || '').trim().toLowerCase();

  // 1. Asignar info de expansión a cada item
  const enriched = items.map(item => ({
    ...item,
    expansion: getExpansionInfo(item)
  }));

  // 2. Generar Pills de Filtro Rápido por Expansión
  if (inventorySetPills) {
    const countsByCode = {};
    enriched.forEach(item => {
      const code = item.expansion.code;
      countsByCode[code] = (countsByCode[code] || 0) + 1;
    });

    const sortOrder = (code) => {
      if (code === 'MANGA') return 0;
      if (code === 'SP')    return 1;
      if (code === 'DON')   return 2;
      if (code.startsWith('OP-')) return 3;
      if (code.startsWith('EB-')) return 4;
      if (code.startsWith('PRB-')) return 5;
      if (code.startsWith('ST-')) return 6;
      if (code === 'PROMO') return 7;
      return 8;
    };

    const pillKeys = Object.keys(countsByCode).sort((a, b) => {
      const diff = sortOrder(a) - sortOrder(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    inventorySetPills.innerHTML = '';

    const allPill = document.createElement('button');
    allPill.className = `px-2.5 py-1 rounded text-xs font-medium transition ${activeInventoryFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'}`;
    allPill.innerText = `Todas (${items.length})`;
    allPill.addEventListener('click', () => {
      activeInventoryFilter = 'all';
      renderInventoryCards(items);
    });
    inventorySetPills.appendChild(allPill);

    pillKeys.forEach(code => {
      const pill = document.createElement('button');
      const isActive = activeInventoryFilter === code;
      pill.className = `px-2.5 py-1 rounded text-xs font-medium transition ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'}`;
      pill.innerText = `${code} (${countsByCode[code]})`;
      pill.addEventListener('click', () => {
        activeInventoryFilter = isActive ? 'all' : code;
        renderInventoryCards(items);
      });
      inventorySetPills.appendChild(pill);
    });
  }

  // 3. Filtrar por búsqueda y por pill de expansión
  const filtered = enriched.filter(item => {
    if (activeInventoryFilter !== 'all' && item.expansion.code !== activeInventoryFilter) {
      return false;
    }
    if (!q) return true;
    return (item.card_name || '').toLowerCase().includes(q) ||
           (item.card_number || '').toLowerCase().includes(q) ||
           item.expansion.code.toLowerCase().includes(q) ||
           item.expansion.name.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    inventoryCardsGrid.innerHTML = `
      <div class="text-center py-16 text-slate-500 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
        <i class="fa-solid fa-box-open text-4xl mb-3 text-slate-600 block"></i>
        <h3 class="text-sm font-bold text-slate-300 mb-1">No se encontraron cartas</h3>
        <p class="text-xs text-slate-400">Prueba con otro término de búsqueda o selecciona otra expansión.</p>
      </div>
    `;
    return;
  }

  // 4. Agrupar por expansión
  const groups = {};
  filtered.forEach(item => {
    const key = item.expansion.code;
    if (!groups[key]) {
      groups[key] = {
        info: item.expansion,
        items: []
      };
    }
    groups[key].items.push(item);
  });

  // Ordenar grupos
  const sortOrder = (code) => {
    if (code === 'MANGA') return 0;
    if (code === 'SP')    return 1;
    if (code === 'DON')   return 2;
    if (code.startsWith('OP-')) return 3;
    if (code.startsWith('EB-')) return 4;
    if (code.startsWith('PRB-')) return 5;
    if (code.startsWith('ST-')) return 6;
    if (code === 'PROMO') return 7;
    return 8;
  };

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const diff = sortOrder(a) - sortOrder(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const groupElements = [];

  sortedKeys.forEach(code => {
    const group = groups[code];
    const groupItems = group.items;
    const info = group.info;

    const groupInvestment = groupItems.reduce((sum, i) => sum + (Number(i.purchase_price) || 0) * (Number(i.quantity) || 1), 0);
    const groupCopies = groupItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

    const groupEl = document.createElement('div');
    groupEl.className = 'flex flex-col gap-0 bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-700/80';

    const header = document.createElement('button');
    header.className = 'group/hdr w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-900/90 hover:bg-slate-800/70 transition text-left cursor-pointer';
    header.innerHTML = `
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center flex-shrink-0 shadow-inner">
          <i class="fa-solid ${info.icon} ${info.accentClass} text-sm"></i>
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-black text-white tracking-wide">${info.code}</span>
            <span class="text-xs font-semibold text-slate-300 truncate max-w-[260px] sm:max-w-md">${info.name}</span>
          </div>
          <span class="text-[11px] text-slate-400 leading-tight mt-0.5">
            ${groupCopies} ${groupCopies === 1 ? 'copia' : 'copias'} en posesión · <span class="text-emerald-400 font-medium">${fmtCurrency(groupInvestment)}</span> invertido
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2.5 flex-shrink-0">
        <span class="text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${info.badgeBg}">
          ${groupItems.length} ${groupItems.length === 1 ? 'carta' : 'cartas'}
        </span>
        <i class="fa-solid fa-chevron-down ${info.accentClass} text-xs transition-transform duration-200 chev"></i>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 p-3.5 border-t border-slate-800/60 bg-slate-950/40';

    groupItems.forEach(item => {
      const cardEl = document.createElement('div');
      cardEl.className = 'group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-indigo-500 hover:shadow-indigo-500/10 transition cursor-pointer';
      
      const displayNum = getDisplayCardNumber(item);
      const displayImg = getHighQualityImageUrl(item.image_url, displayNum, item.set_code);
      const imgHtml = displayImg
        ? `<img src="${displayImg}" alt="${item.card_name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.onerror=null;this.src='https://www.optcgapi.com/media/static/Card_Images/${displayNum}.jpg';">`
        : `<div class="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950"><i class="fa-regular fa-image text-2xl"></i></div>`;
      
      cardEl.innerHTML = `
        <div class="relative w-full aspect-[7/10] bg-slate-950 overflow-hidden flex items-center justify-center">
          ${imgHtml}
          <div class="absolute top-1.5 right-1.5 z-10">${getRarityBadgeHtml(item.rarity)}</div>
          <div class="absolute top-1.5 left-1.5 z-10">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur text-slate-300 border border-slate-700/60">${displayNum}</span>
          </div>
        </div>
        <div class="p-2.5 flex flex-col flex-1 justify-between gap-1.5 bg-slate-900/90 text-xs">
          <div>
            <h4 class="font-bold text-slate-200 group-hover:text-indigo-300 transition truncate" title="${item.card_name}">${item.card_name}</h4>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
              <span>${item.condition || 'Near Mint'}</span>
              <span class="text-slate-500">${item.expansion.code}</span>
            </div>
          </div>
          <div class="flex items-center justify-between pt-1.5 border-t border-slate-800/80 mt-auto">
            <div class="flex items-center bg-slate-950 border border-slate-800 rounded-md px-1 py-0.5 font-bold text-slate-200" onclick="event.stopPropagation()">
              <button class="btn-qty-dec px-1.5 text-slate-400 hover:text-red-400 transition" title="Reducir">-</button>
              <span class="px-1 text-indigo-400 font-mono">${item.quantity}</span>
              <button class="btn-qty-inc px-1.5 text-slate-400 hover:text-emerald-400 transition" title="Aumentar">+</button>
            </div>
            <span class="font-bold text-emerald-400 font-mono text-[11px]">${fmtCurrency(item.purchase_price)}</span>
            <button class="btn-inv-delete text-slate-500 hover:text-red-400 p-1 transition" title="Eliminar de inventario" onclick="event.stopPropagation()">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;

      cardEl.querySelector('.btn-qty-inc')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateItemQuantity(item.id, item.quantity + 1);
      });
      cardEl.querySelector('.btn-qty-dec')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (item.quantity > 1) {
          await updateItemQuantity(item.id, item.quantity - 1);
        } else if (confirm(`¿Eliminar ${item.card_name} de tu inventario físico?`)) {
          await deleteInventoryItem(item.id);
        }
      });
      cardEl.querySelector('.btn-inv-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar ${item.card_name} de tu inventario físico?`)) {
          await deleteInventoryItem(item.id);
        }
      });

      cardEl.addEventListener('click', () => analyzeCard(item));
      grid.appendChild(cardEl);
    });

    let open = true;
    const chevron = header.querySelector('.chev');
    header.addEventListener('click', () => {
      open = !open;
      grid.style.display = open ? '' : 'none';
      chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
    });

    groupEl.appendChild(header);
    groupEl.appendChild(grid);
    inventoryCardsGrid.appendChild(groupEl);

    groupElements.push({
      setOpen: (state) => {
        open = state;
        grid.style.display = open ? '' : 'none';
        chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
      }
    });
  });

  // Botones de Expandir / Colapsar Todo
  const btnExpandAllInventory = document.getElementById('btnExpandAllInventory');
  const btnCollapseAllInventory = document.getElementById('btnCollapseAllInventory');

  if (btnExpandAllInventory) {
    btnExpandAllInventory.onclick = () => {
      groupElements.forEach(g => g.setOpen(true));
    };
  }
  if (btnCollapseAllInventory) {
    btnCollapseAllInventory.onclick = () => {
      groupElements.forEach(g => g.setOpen(false));
    };
  }
}

inventorySearchInput?.addEventListener('input', () => {
  renderInventoryCards(physicalInventory);
});

async function updateItemQuantity(id, newQty) {
  try {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty })
    });
    if (res.ok) {
      loadPhysicalInventory();
    }
  } catch (err) {
    console.error('Error actualizando cantidad:', err);
  }
}

async function deleteInventoryItem(id) {
  try {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadPhysicalInventory();
    }
  } catch (err) {
    console.error('Error eliminando item:', err);
  }
}


// ─── MODAL: REGISTRAR CARTA FÍSICA ────────────────────────────────────────
const modalAddPhysicalCard = document.getElementById('modalAddPhysicalCard');
const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSaveInventory = document.getElementById('btnSaveInventory');
const btnHeaderQuickAdd = document.getElementById('btnHeaderQuickAdd');

const modalCardSearchGroup = document.getElementById('modalCardSearchGroup');
const modalCardSearchInput = document.getElementById('modalCardSearchInput');
const modalCardSearchResults = document.getElementById('modalCardSearchResults');
const modalCardPreview = document.getElementById('modalCardPreview');
const modalPreviewImg = document.getElementById('modalPreviewImg');
const modalPreviewName = document.getElementById('modalPreviewName');
const modalPreviewSet = document.getElementById('modalPreviewSet');
const modalPreviewNumber = document.getElementById('modalPreviewNumber');
const modalPreviousOwnershipAlert = document.getElementById('modalPreviousOwnershipAlert');
const modalSelectedCardId = document.getElementById('modalSelectedCardId');

const modalQtyInput = document.getElementById('modalQtyInput');
const btnQtyMinus = document.getElementById('btnQtyMinus');
const btnQtyPlus = document.getElementById('btnQtyPlus');
const modalPriceInput = document.getElementById('modalPriceInput');
const modalConditionSelect = document.getElementById('modalConditionSelect');
const modalNotesInput = document.getElementById('modalNotesInput');

let modalCurrentCardUrl = '';

async function openModalForCard(card = null) {
  modalAddPhysicalCard.classList.remove('hidden');

  if (card) {
    modalCardSearchGroup.style.display = 'none';
    modalCurrentCardUrl = card.tcgplayer_url || card.url || '';

    // Si la carta no tiene un ID de base de datos (por ejemplo, viene de búsqueda en vivo TCGPlayer)
    if ((!card.id || card.id === 'undefined') && (card.tcgplayer_url || card.url)) {
      loadingOverlay.classList.remove('hidden');
      document.getElementById('loadingText').innerText = 'Registrando carta en catálogo...';
      try {
        const scrapeRes = await fetch('/api/cards/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: card.tcgplayer_url || card.url,
            card_name: card.name,
            card_number: card.card_number,
            rarity: card.rarity,
            set_code: card.set_code,
            set_name: card.set_name
          })
        });
        const scrapeData = await scrapeRes.json();
        loadingOverlay.classList.add('hidden');
        if (scrapeData.success && scrapeData.data && scrapeData.data.card) {
          card = scrapeData.data.card;
        }
      } catch (err) {
        loadingOverlay.classList.add('hidden');
        console.error('Error auto-registrando carta para inventario:', err);
      }
    }

    selectCardInModal(card);
  } else {
    modalCurrentCardUrl = '';
    modalCardSearchGroup.style.display = 'flex';
    modalCardPreview.classList.add('hidden');
    modalSelectedCardId.value = '';
    modalCardSearchInput.value = '';
    modalCardSearchResults.classList.add('hidden');
  }

  modalQtyInput.value = '1';
  modalPriceInput.value = '';
  modalNotesInput.value = '';
  modalConditionSelect.value = 'Near Mint';
}

function closeModal() {
  modalAddPhysicalCard.classList.add('hidden');
}

btnOpenAddModal?.addEventListener('click', () => openModalForCard(null));
btnHeaderQuickAdd?.addEventListener('click', () => openModalForCard(null));
btnCloseModal?.addEventListener('click', closeModal);
btnCancelModal?.addEventListener('click', closeModal);

btnQtyPlus?.addEventListener('click', () => {
  modalQtyInput.value = String(parseInt(modalQtyInput.value || '1', 10) + 1);
});

btnQtyMinus?.addEventListener('click', () => {
  const current = parseInt(modalQtyInput.value || '1', 10);
  if (current > 1) modalQtyInput.value = String(current - 1);
});

// Autocompletado en el modal
let searchDebounceTimer = null;
modalCardSearchInput?.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  clearTimeout(searchDebounceTimer);

  if (q.length < 2) {
    modalCardSearchResults.classList.add('hidden');
    return;
  }

  // Si pega una URL directa de TCGPlayer
  if (q.includes('tcgplayer.com/product/') || (q.startsWith('http') && q.includes('/product/'))) {
    modalCardSearchResults.innerHTML = `
      <div class="p-3 text-xs text-sky-400 flex items-center gap-2">
        <i class="fa-solid fa-spinner fa-spin"></i> Obteniendo información de TCGPlayer...
      </div>
    `;
    modalCardSearchResults.classList.remove('hidden');

    searchDebounceTimer = setTimeout(async () => {
      try {
        const scrapeRes = await fetch('/api/cards/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: q })
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.success && scrapeData.data?.card) {
          selectCardInModal(scrapeData.data.card);
          modalCardSearchResults.classList.add('hidden');
          modalCardSearchInput.value = `${scrapeData.data.card.name} (${scrapeData.data.card.card_number || 'PROMO'})`;
        } else {
          modalCardSearchResults.innerHTML = `
            <div class="p-3 text-xs text-rose-400">
              No se pudo obtener la carta del enlace. Verifica que sea un producto válido de TCGPlayer.
            </div>
          `;
        }
      } catch (err) {
        modalCardSearchResults.innerHTML = `
          <div class="p-3 text-xs text-rose-400">Error conectando con TCGPlayer.</div>
        `;
      }
    }, 400);
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      let cards = (data.success && data.data) ? data.data : [];

      if (cards.length === 0) {
        const tcgRes = await fetch(`/api/cards/tcg-search?q=${encodeURIComponent(q)}`);
        const tcgData = await tcgRes.json();
        if (tcgData.success && tcgData.data) {
          cards = tcgData.data;
        }
      }

      if (cards.length > 0) {
        modalCardSearchResults.innerHTML = '';
        cards.forEach(card => {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-2.5 p-2.5 hover:bg-slate-800 cursor-pointer transition';

          const displayImg = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code);
          const img = displayImg 
            ? `<img src="${displayImg}" class="w-8 h-11 object-cover rounded border border-slate-700" onerror="this.onerror=null; this.src='https://www.optcgapi.com/media/static/Card_Images/${card.card_number}.jpg';">` 
            : `<div class="w-8 h-11 bg-slate-800 rounded"></div>`;

          item.innerHTML = `
            ${img}
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-bold text-white truncate">${card.name}</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] text-slate-400">${card.card_number || 'N/A'}</span>
                ${card.rarity ? getRarityBadgeHtml(card.rarity) : ''}
              </div>
            </div>
          `;

          item.addEventListener('click', async () => {
            if ((!card.id || card.id === 'undefined') && (card.tcgplayer_url || card.url)) {
              modalCardSearchResults.innerHTML = `
                <div class="p-3 text-xs text-sky-400 flex items-center gap-2">
                  <i class="fa-solid fa-spinner fa-spin"></i> Registrando carta en catálogo...
                </div>
              `;
              try {
                const sRes = await fetch('/api/cards/scrape', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    url: card.tcgplayer_url || card.url,
                    card_name: card.name,
                    card_number: card.card_number,
                    rarity: card.rarity,
                    set_code: card.set_code,
                    set_name: card.set_name
                  })
                });
                const sData = await sRes.json();
                if (sData.success && sData.data?.card) {
                  card = sData.data.card;
                }
              } catch (e) {
                console.error(e);
              }
            }
            selectCardInModal(card);
            modalCardSearchResults.classList.add('hidden');
            modalCardSearchInput.value = `${card.name} (${card.card_number || ''})`;
          });

          modalCardSearchResults.appendChild(item);
        });
        modalCardSearchResults.classList.remove('hidden');
      } else {
        modalCardSearchResults.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
    }
  }, 250);
});

async function selectCardInModal(card) {
  if (!card) return;
  modalSelectedCardId.value = card.id || '';
  modalCurrentCardUrl = card.tcgplayer_url || card.url || modalCurrentCardUrl || '';
  modalPreviewName.innerText = card.name || 'Carta';
  modalPreviewSet.innerText = card.set_code || card.set_name || 'SET';
  modalPreviewNumber.innerText = card.card_number || 'N/A';

  const previewImgUrl = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code);
  if (previewImgUrl) {
    modalPreviewImg.src = previewImgUrl;
    modalPreviewImg.style.display = 'block';
  } else {
    modalPreviewImg.style.display = 'none';
  }

  modalCardPreview.classList.remove('hidden');

  if (card.id && card.id !== 'undefined') {
    try {
      const res = await fetch(`/api/inventory/card/${card.id}`);
      const data = await res.json();
      if (data.success && data.data.total_copies > 0) {
        const count = data.data.total_copies;
        modalPreviousOwnershipAlert.className = 'text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 mt-1';
        modalPreviousOwnershipAlert.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i> Ya tienes <strong>${count} ${count === 1 ? 'copia' : 'copias'}</strong> en tu inventario físico.
        `;
      } else {
        modalPreviousOwnershipAlert.className = 'text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 mt-1';
        modalPreviousOwnershipAlert.innerHTML = `
          <i class="fa-solid fa-sparkles"></i> Carta nueva en tu colección física.
        `;
      }
      modalPreviousOwnershipAlert.style.display = 'block';
    } catch {
      modalPreviousOwnershipAlert.style.display = 'none';
    }
  } else {
    modalPreviousOwnershipAlert.style.display = 'none';
  }
}

btnSaveInventory?.addEventListener('click', async () => {
  let cardId = modalSelectedCardId.value;
  if (!cardId || cardId === 'undefined') {
    if (modalCurrentCardUrl) {
      loadingOverlay.classList.remove('hidden');
      document.getElementById('loadingText').innerText = 'Registrando carta en catálogo...';
      try {
        const scrapeRes = await fetch('/api/cards/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: modalCurrentCardUrl })
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.success && scrapeData.data?.card?.id) {
          cardId = scrapeData.data.card.id;
          modalSelectedCardId.value = cardId;
        }
      } catch (err) {
        console.error('Error auto-scraping card on save:', err);
      }
    }
  }

  if (!cardId || cardId === 'undefined') {
    loadingOverlay.classList.add('hidden');
    alert('Por favor selecciona una carta válida de la lista o espera a que se registre.');
    return;
  }

  const quantity = parseInt(modalQtyInput.value || '1', 10);
  const purchase_price = parseFloat(modalPriceInput.value || '0');
  const condition = modalConditionSelect.value;
  const notes = modalNotesInput.value.trim();

  loadingOverlay.classList.remove('hidden');
  document.getElementById('loadingText').innerText = 'Guardando en tu inventario...';

  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: cardId,
        url: modalCurrentCardUrl || undefined,
        quantity,
        purchase_price,
        condition,
        notes
      })
    });

    const data = await res.json();
    loadingOverlay.classList.add('hidden');

    if (data.success) {
      closeModal();
      loadPhysicalInventory();
      if (currentAnalyzedCard && currentAnalyzedCard.id === cardId) {
        updatePhysicalStatusForCard(currentAnalyzedCard);
      }
      alert('¡Carta guardada exitosamente en tu inventario físico!');
    } else {
      alert('Error guardando en inventario: ' + (data.error || 'Desconocido'));
    }
  } catch (err) {
    loadingOverlay.classList.add('hidden');
    alert('Error al guardar carta física.');
    console.error(err);
  }
});


// ─── ACTUALIZACIÓN EN VIVO DE LA TRM (USD/COP) ────────────────────────────
const topbarTrmVal = document.getElementById('topbarTrmVal');

async function updateTopbarTRM() {
  if (!topbarTrmVal) return;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.rates && data.rates.COP) {
      const cop = Math.round(data.rates.COP);
      topbarTrmVal.innerText = `$${cop.toLocaleString('es-CO')} COP`;
    }
  } catch {
    topbarTrmVal.innerText = '$4,180 COP';
  }
}

// Sincronizar dinámicamente conteos reales de cada expansión desde /api/cards/sets
async function loadAndSyncSetCounts() {
  if (!sidebarSetSelect) return;
  try {
    const res = await fetch('/api/cards/sets');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      const setMap = new Map();
      let totalCards = 0;
      data.data.forEach(s => {
        setMap.set(s.set_code, s);
        totalCards += (s.count || 0);
      });

      const allOpt = sidebarSetSelect.querySelector('option[value="all"]');
      if (allOpt && totalCards > 0) {
        allOpt.innerText = `Todas las expansiones (${totalCards.toLocaleString()} cartas)`;
      }

      sidebarSetSelect.querySelectorAll('option').forEach(opt => {
        const val = opt.value;
        if (val === 'all') return;
        if (val === 'ST') {
          const stTotal = data.data.filter(s => s.set_code.startsWith('ST-')).reduce((acc, curr) => acc + curr.count, 0);
          opt.innerText = `Todos los Starter Decks (${stTotal.toLocaleString()} cartas)`;
          return;
        }
        const setInfo = setMap.get(val);
        if (setInfo && setInfo.count > 0) {
          const baseName = opt.innerText.replace(/\s*\(\d+.*\)$/, '');
          opt.innerText = `${baseName} (${setInfo.count})`;
        }
      });
    }
  } catch (err) {
    console.warn('Could not sync set counts:', err);
  }
}

// ─── SECCIÓN 4: CONSULTADOR Y CREADOR DE DECKS (PROYECTOS & INVENTARIO) ─────
const deckNameInput = document.getElementById('deckNameInput');
const deckListTextarea = document.getElementById('deckListTextarea');
const btnAnalyzeDeckSubmit = document.getElementById('btnAnalyzeDeckSubmit');
const btnLoadExampleDeck = document.getElementById('btnLoadExampleDeck');
const btnClearDeckInput = document.getElementById('btnClearDeckInput');
const btnNewDeckReset = document.getElementById('btnNewDeckReset');

const btnViewSavedDecksToggle = document.getElementById('btnViewSavedDecksToggle');
const btnCloseSavedDecks = document.getElementById('btnCloseSavedDecks');
const deckSavedContainer = document.getElementById('deckSavedContainer');
const savedDecksList = document.getElementById('savedDecksList');
const savedDecksCountBadge = document.getElementById('savedDecksCountBadge');

const deckResultsSection = document.getElementById('deckResultsSection');
const deckLeaderImg = document.getElementById('deckLeaderImg');
const deckLeaderName = document.getElementById('deckLeaderName');
const deckLeaderCode = document.getElementById('deckLeaderCode');
const deckCompletionBadge = document.getElementById('deckCompletionBadge');
const deckProgressBar = document.getElementById('deckProgressBar');
const deckProgressText = document.getElementById('deckProgressText');
const deckOwnedCount = document.getElementById('deckOwnedCount');
const deckCompleteTypesText = document.getElementById('deckCompleteTypesText');
const deckMissingCount = document.getElementById('deckMissingCount');
const deckMissingTypesText = document.getElementById('deckMissingTypesText');

const filterDeckAll = document.getElementById('filterDeckAll');
const filterDeckMissing = document.getElementById('filterDeckMissing');
const filterDeckOwned = document.getElementById('filterDeckOwned');
const countFilterAll = document.getElementById('countFilterAll');
const countFilterMissing = document.getElementById('countFilterMissing');
const countFilterOwned = document.getElementById('countFilterOwned');

const btnCopyMissingList = document.getElementById('btnCopyMissingList');
const btnSaveDeckProjectAction = document.getElementById('btnSaveDeckProjectAction');
const deckCardsListGrid = document.getElementById('deckCardsListGrid');

const USER_EXAMPLE_DECK_LIST = `1xOP09-062
4xOP17-113
4xOP17-107
4xOP17-109
2xOP12-112
4xOP17-102
2xEB04-058
4xOP17-106
2xOP14-108
4xOP17-114
1xOP17-110
4xOP16-119
4xOP17-112
4xST34-003
4xOP17-074
1xOP11-067
2xOP09-078`;

let currentDeckAnalysis = null;
let currentDeckFilter = 'all';

// Cargar contador de decks guardados
async function loadSavedDecksCount() {
  try {
    const res = await fetch('/api/decks');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      if (savedDecksCountBadge) savedDecksCountBadge.innerText = data.data.length;
    }
  } catch (err) {
    console.warn('Error al consultar decks guardados:', err);
  }
}

// Cargar y mostrar lista de decks guardados en el contenedor
async function loadAndRenderSavedDecks() {
  if (!savedDecksList) return;
  savedDecksList.innerHTML = `<div class="col-span-full py-6 text-center text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Cargando proyectos guardados...</div>`;
  
  try {
    const res = await fetch('/api/decks');
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      savedDecksList.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <i class="fa-solid fa-box-open text-2xl text-slate-600"></i>
          <p>Aún no tienes proyectos de decks guardados.</p>
          <span class="text-[11px] text-slate-600">Pega una lista arriba y haz clic en "Guardar Proyecto" para tenerla a mano.</span>
        </div>
      `;
      if (savedDecksCountBadge) savedDecksCountBadge.innerText = '0';
      return;
    }

    if (savedDecksCountBadge) savedDecksCountBadge.innerText = data.data.length;
    savedDecksList.innerHTML = '';

    data.data.forEach(deck => {
      const card = document.createElement('div');
      card.className = 'p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 flex flex-col justify-between gap-3 transition shadow-md';
      
      const leaderImg = getHighQualityImageUrl(deck.leader?.image_url, deck.leader?.card_number) || 'https://www.optcgapi.com/media/static/Card_Images/' + (deck.leader?.card_number || 'OP01-013') + '.jpg';
      const pct = deck.completion_percent || 0;
      const createdStr = deck.created_at ? new Date(deck.created_at).toLocaleDateString() : '';

      card.innerHTML = `
        <div class="flex items-start gap-3">
          <img src="${leaderImg}" class="w-12 h-16 object-cover rounded-lg border border-purple-500/30 bg-slate-900 flex-shrink-0" onerror="this.onerror=null; this.src='https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';">
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-bold text-white truncate" title="${deck.name}">${deck.name}</h4>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
              <span>${deck.leader ? deck.leader.name : 'Líder no esp.'}</span>
              <span class="text-slate-600">•</span>
              <span class="font-mono text-slate-500">${deck.leader ? deck.leader.card_number : ''}</span>
            </div>
            <div class="mt-2">
              <div class="flex items-center justify-between text-[10px] mb-1">
                <span class="text-slate-400">${deck.total_cards_owned || 0}/${deck.total_cards_needed || 0} cartas</span>
                <span class="font-bold ${pct === 100 ? 'text-emerald-400' : 'text-purple-400'}">${pct}%</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div class="h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-purple-500'}" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <span class="text-[10px] text-slate-500">${createdStr}</span>
          <div class="flex items-center gap-1.5">
            <button class="btn-load-saved-deck px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white font-medium text-[11px] transition">
              Cargar & Analizar
            </button>
            <button class="btn-delete-saved-deck p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition" title="Eliminar proyecto">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.btn-load-saved-deck')?.addEventListener('click', () => {
        if (deckNameInput) deckNameInput.value = deck.name;
        if (deckListTextarea) deckListTextarea.value = deck.raw_list;
        deckSavedContainer?.classList.add('hidden');
        runDeckAnalysis();
      });

      card.querySelector('.btn-delete-saved-deck')?.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar el proyecto "${deck.name}"?`)) return;
        try {
          const delRes = await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
          if (delRes.ok) {
            loadAndRenderSavedDecks();
            loadSavedDecksCount();
          }
        } catch (delErr) {
          console.error('Error al eliminar deck:', delErr);
        }
      });

      savedDecksList.appendChild(card);
    });
  } catch (err) {
    console.error('Error al listar decks guardados:', err);
    savedDecksList.innerHTML = `<div class="col-span-full py-4 text-center text-red-400 text-xs">Error al cargar proyectos de decks</div>`;
  }
}

// Analizar deck pegado
async function runDeckAnalysis() {
  const text = deckListTextarea?.value.trim();
  if (!text) {
    alert('Por favor ingresa o pega una lista de cartas de One Piece.');
    deckListTextarea?.focus();
    return;
  }

  const origBtnHtml = btnAnalyzeDeckSubmit?.innerHTML;
  if (btnAnalyzeDeckSubmit) {
    btnAnalyzeDeckSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analizando contra tu inventario...`;
    btnAnalyzeDeckSubmit.disabled = true;
  }

  try {
    const res = await fetch('/api/decks/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        name: deckNameInput?.value.trim() || 'Nuevo Deck'
      })
    });

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.error || 'No se pudo analizar la lista del deck');
    }

    currentDeckAnalysis = data.data;
    if (deckNameInput && !deckNameInput.value.trim()) {
      deckNameInput.value = currentDeckAnalysis.name;
    }

    renderDeckResults(currentDeckAnalysis);
    deckResultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    alert('Error al analizar deck: ' + (err.message || err));
    console.error(err);
  } finally {
    if (btnAnalyzeDeckSubmit) {
      btnAnalyzeDeckSubmit.innerHTML = origBtnHtml || '<i class="fa-solid fa-magnifying-glass-chart"></i> Consultar Disponibilidad en Inventario';
      btnAnalyzeDeckSubmit.disabled = false;
    }
  }
}

// Renderizar métricas y datos generales del deck
function renderDeckResults(analysis) {
  if (!analysis || !deckResultsSection) return;
  deckResultsSection.classList.remove('hidden');

  // Líder
  if (analysis.leader) {
    if (deckLeaderName) deckLeaderName.innerText = analysis.leader.name || 'Líder';
    if (deckLeaderCode) deckLeaderCode.innerText = analysis.leader.card_number || '';
    if (deckLeaderImg) {
      deckLeaderImg.src = getHighQualityImageUrl(analysis.leader.image_url, analysis.leader.card_number) || `https://www.optcgapi.com/media/static/Card_Images/${analysis.leader.card_number}.jpg`;
      deckLeaderImg.onerror = () => { deckLeaderImg.src = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg'; };
    }
  } else {
    if (deckLeaderName) deckLeaderName.innerText = 'Deck sin líder identificado';
    if (deckLeaderCode) deckLeaderCode.innerText = '--';
    if (deckLeaderImg) deckLeaderImg.src = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';
  }

  // Progreso y completitud
  const pct = analysis.completion_percent || 0;
  if (deckCompletionBadge) {
    deckCompletionBadge.innerText = `${pct}%`;
    deckCompletionBadge.className = `text-xs font-bold ${pct === 100 ? 'text-emerald-400' : 'text-purple-400'}`;
  }
  if (deckProgressBar) {
    deckProgressBar.style.width = `${pct}%`;
    deckProgressBar.className = pct === 100 
      ? 'bg-emerald-500 h-2.5 rounded-full transition-all duration-500' 
      : 'bg-gradient-to-r from-purple-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500';
  }
  if (deckProgressText) {
    deckProgressText.innerText = `${analysis.total_cards_owned} de ${analysis.total_cards_needed} copias en inventario físico`;
  }

  // Copias disponibles
  if (deckOwnedCount) deckOwnedCount.innerText = analysis.total_cards_owned;
  if (deckCompleteTypesText) deckCompleteTypesText.innerText = `${analysis.unique_complete_count} de ${analysis.unique_cards_count} tipos completos`;

  // Copias faltantes
  if (deckMissingCount) deckMissingCount.innerText = analysis.total_cards_missing;
  if (deckMissingTypesText) deckMissingTypesText.innerText = `${analysis.unique_missing_count} tipos incompletos`;

  // Filtros
  if (countFilterAll) countFilterAll.innerText = analysis.cards.length;
  if (countFilterMissing) countFilterMissing.innerText = analysis.cards.filter(c => c.missing > 0).length;
  if (countFilterOwned) countFilterOwned.innerText = analysis.cards.filter(c => c.is_complete).length;

  renderDeckCardsGrid();
}

// Renderizar rejilla de cartas según el filtro activo
function renderDeckCardsGrid() {
  if (!deckCardsListGrid || !currentDeckAnalysis) return;
  deckCardsListGrid.innerHTML = '';

  let list = currentDeckAnalysis.cards || [];
  if (currentDeckFilter === 'missing') {
    list = list.filter(c => c.missing > 0);
  } else if (currentDeckFilter === 'owned') {
    list = list.filter(c => c.is_complete);
  }

  if (list.length === 0) {
    deckCardsListGrid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
        <i class="fa-solid fa-check-double text-2xl text-emerald-500/70"></i>
        <p class="font-semibold text-slate-400">No hay cartas que coincidan con este filtro.</p>
      </div>
    `;
    return;
  }

  list.forEach(card => {
    const el = document.createElement('div');
    const isComplete = card.is_complete;
    const hasSome = !isComplete && card.owned > 0;
    
    let borderClass = 'border-slate-800 hover:border-slate-700';
    let statusBadgeHtml = '';

    if (isComplete) {
      borderClass = 'border-emerald-500/40 hover:border-emerald-400';
      statusBadgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1"><i class="fa-solid fa-check"></i> Completa (${card.owned}/${card.needed})</span>`;
    } else if (hasSome) {
      borderClass = 'border-amber-500/40 hover:border-amber-400';
      statusBadgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"><i class="fa-solid fa-circle-half-stroke"></i> Faltan ${card.missing} (${card.owned}/${card.needed})</span>`;
    } else {
      borderClass = 'border-red-500/40 hover:border-red-400';
      statusBadgeHtml = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1"><i class="fa-solid fa-xmark"></i> Faltan ${card.missing} (0/${card.needed})</span>`;
    }

    el.className = `group relative flex flex-col bg-slate-900/90 border ${borderClass} rounded-xl overflow-hidden shadow-sm transition hover:shadow-lg`;

    const imgUrl = getHighQualityImageUrl(card.image_url, card.card_number, card.set_code) || `https://www.optcgapi.com/media/static/Card_Images/${card.card_number}.jpg`;

    el.innerHTML = `
      <div class="relative w-full aspect-[7/10] bg-slate-950 overflow-hidden flex items-center justify-center">
        <img src="${imgUrl}" alt="${card.name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.onerror=null;this.src='https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';">
        <div class="absolute top-1.5 right-1.5 z-10">${getRarityBadgeHtml(card.rarity)}</div>
        <div class="absolute top-1.5 left-1.5 z-10">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950/85 backdrop-blur text-purple-300 border border-purple-500/40 font-mono">${card.needed}x</span>
        </div>
      </div>
      <div class="p-2.5 flex flex-col flex-1 justify-between gap-2 bg-slate-900/95 text-xs">
        <div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="font-mono text-[10px] font-bold text-slate-400">${card.card_number}</span>
            <span class="text-[10px] text-slate-500">${card.set_code || ''}</span>
          </div>
          <h4 class="font-bold text-slate-200 group-hover:text-purple-300 transition truncate text-xs" title="${card.name}">${card.name}</h4>
        </div>
        <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
          ${statusBadgeHtml}
        </div>
      </div>
    `;

    deckCardsListGrid.appendChild(el);
  });
}

// Filtros de la lista del deck
function setDeckFilter(filterName) {
  currentDeckFilter = filterName;
  [filterDeckAll, filterDeckMissing, filterDeckOwned].forEach(btn => {
    btn?.classList.remove('bg-purple-600', 'text-white');
    btn?.classList.add('bg-slate-800', 'text-slate-300');
  });

  if (filterName === 'all') {
    filterDeckAll?.classList.add('bg-purple-600', 'text-white');
    filterDeckAll?.classList.remove('bg-slate-800', 'text-slate-300');
  } else if (filterName === 'missing') {
    filterDeckMissing?.classList.add('bg-purple-600', 'text-white');
    filterDeckMissing?.classList.remove('bg-slate-800', 'text-slate-300');
  } else if (filterName === 'owned') {
    filterDeckOwned?.classList.add('bg-purple-600', 'text-white');
    filterDeckOwned?.classList.remove('bg-slate-800', 'text-slate-300');
  }

  renderDeckCardsGrid();
}

filterDeckAll?.addEventListener('click', () => setDeckFilter('all'));
filterDeckMissing?.addEventListener('click', () => setDeckFilter('missing'));
filterDeckOwned?.addEventListener('click', () => setDeckFilter('owned'));

// Copiar lista de faltantes
btnCopyMissingList?.addEventListener('click', async () => {
  if (!currentDeckAnalysis) return;
  const missingText = currentDeckAnalysis.missing_cards_text || '';
  if (!missingText.trim()) {
    alert('¡Excelente noticia! No te falta ninguna carta de este deck en tu inventario físico.');
    return;
  }

  const exportText = `Cartas faltantes para "${currentDeckAnalysis.name}":\n${missingText}`;
  try {
    await navigator.clipboard.writeText(exportText);
    const origHtml = btnCopyMissingList.innerHTML;
    btnCopyMissingList.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i> ¡Copiado al Portapapeles!`;
    setTimeout(() => {
      btnCopyMissingList.innerHTML = origHtml;
    }, 2500);
  } catch (err) {
    alert('Lista de faltantes:\n\n' + exportText);
  }
});

// Guardar proyecto de deck
btnSaveDeckProjectAction?.addEventListener('click', async () => {
  if (!currentDeckAnalysis) return;
  const origHtml = btnSaveDeckProjectAction.innerHTML;
  btnSaveDeckProjectAction.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Guardando...`;
  btnSaveDeckProjectAction.disabled = true;

  try {
    currentDeckAnalysis.name = deckNameInput?.value.trim() || currentDeckAnalysis.name;
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentDeckAnalysis)
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'No se pudo guardar el deck');
    }

    btnSaveDeckProjectAction.innerHTML = `<i class="fa-solid fa-check text-white"></i> ¡Proyecto Guardado!`;
    loadSavedDecksCount();
    setTimeout(() => {
      btnSaveDeckProjectAction.innerHTML = origHtml;
      btnSaveDeckProjectAction.disabled = false;
    }, 2500);
  } catch (err) {
    alert('Error al guardar proyecto: ' + err.message);
    btnSaveDeckProjectAction.innerHTML = origHtml;
    btnSaveDeckProjectAction.disabled = false;
  }
});

// Eventos de botones principales
btnLoadExampleDeck?.addEventListener('click', () => {
  if (deckNameInput) deckNameInput.value = 'Nico Robin OP09 (Ejemplo)';
  if (deckListTextarea) deckListTextarea.value = USER_EXAMPLE_DECK_LIST;
  deckListTextarea?.focus();
});

btnClearDeckInput?.addEventListener('click', () => {
  if (deckNameInput) deckNameInput.value = '';
  if (deckListTextarea) deckListTextarea.value = '';
  deckListTextarea?.focus();
});

btnNewDeckReset?.addEventListener('click', () => {
  if (deckNameInput) deckNameInput.value = '';
  if (deckListTextarea) deckListTextarea.value = '';
  deckResultsSection?.classList.add('hidden');
  currentDeckAnalysis = null;
  window.scrollTo({ top: deckSection?.offsetTop || 0, behavior: 'smooth' });
});

btnAnalyzeDeckSubmit?.addEventListener('click', runDeckAnalysis);

btnViewSavedDecksToggle?.addEventListener('click', () => {
  if (!deckSavedContainer) return;
  const isHidden = deckSavedContainer.classList.contains('hidden');
  if (isHidden) {
    deckSavedContainer.classList.remove('hidden');
    loadAndRenderSavedDecks();
  } else {
    deckSavedContainer.classList.add('hidden');
  }
});

// ─── EXPORTACIÓN DE LISTA EN IMAGEN (CANVAS / GRID ESTILO OPTCGSIM) ───────
const btnExportMissingImage = document.getElementById('btnExportMissingImage');
const modalDeckImageExport = document.getElementById('modalDeckImageExport');
const btnCloseDeckImageModal = document.getElementById('btnCloseDeckImageModal');
const btnImgModeMissing = document.getElementById('btnImgModeMissing');
const btnImgModeAll = document.getElementById('btnImgModeAll');
const btnImgThemeWhite = document.getElementById('btnImgThemeWhite');
const btnImgThemeDark = document.getElementById('btnImgThemeDark');
const deckImageLoadingSpinner = document.getElementById('deckImageLoadingSpinner');
const deckExportImagePreview = document.getElementById('deckExportImagePreview');
const btnActionCopyImageBlob = document.getElementById('btnActionCopyImageBlob');
const btnActionDownloadImagePng = document.getElementById('btnActionDownloadImagePng');

let currentExportCanvas = null;
let currentExportBlob = null;
let exportModeMissing = true;
let exportThemeWhite = true;

async function openDeckImageExportModal() {
  if (!currentDeckAnalysis || !currentDeckAnalysis.cards || currentDeckAnalysis.cards.length === 0) {
    alert('Primero analiza una lista de cartas de un deck para poder exportar su imagen.');
    return;
  }
  modalDeckImageExport?.classList.remove('hidden');
  await renderDeckExportImage();
}

async function renderDeckExportImage() {
  if (!deckExportImagePreview || !deckImageLoadingSpinner) return;
  deckImageLoadingSpinner.classList.remove('hidden');
  deckExportImagePreview.classList.add('hidden');

  let cardsToRender = currentDeckAnalysis.cards || [];
  if (exportModeMissing) {
    cardsToRender = cardsToRender.filter(c => c.missing > 0);
  }

  if (cardsToRender.length === 0) {
    deckImageLoadingSpinner.innerHTML = `
      <div class="text-center py-6 text-emerald-400">
        <i class="fa-solid fa-circle-check text-3xl mb-2"></i>
        <p class="font-bold text-sm">¡No te falta ninguna carta de este deck!</p>
        <p class="text-xs text-slate-400 mt-1">Puedes cambiar arriba a "Deck Completo" para ver la imagen de toda la lista.</p>
      </div>
    `;
    return;
  }

  deckImageLoadingSpinner.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin text-2xl text-purple-400 mb-2"></i>
    <span>Generando cuadrícula de ${cardsToRender.length} cartas en alta resolución...</span>
  `;

  try {
    const canvas = await generateDeckCanvasGrid(cardsToRender, {
      deckName: currentDeckAnalysis.name || 'Deck One Piece',
      isMissingMode: exportModeMissing,
      isWhiteTheme: exportThemeWhite
    });

    currentExportCanvas = canvas;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    currentExportBlob = blob;
    const dataUrl = URL.createObjectURL(blob);

    deckExportImagePreview.src = dataUrl;
    deckImageLoadingSpinner.classList.add('hidden');
    deckExportImagePreview.classList.remove('hidden');
  } catch (err) {
    console.error('Error generando imagen de deck:', err);
    deckImageLoadingSpinner.innerHTML = `<span class="text-red-400 text-xs">Error al generar imagen: ${err.message}</span>`;
  }
}

async function generateDeckCanvasGrid(cards, options = {}) {
  const {
    deckName = 'Deck One Piece',
    isMissingMode = true,
    isWhiteTheme = true
  } = options;

  const cols = 4;
  const cardW = 210;
  const cardH = 294; // Ratio aproximado 1:1.4
  const gapX = 18;
  const gapY = 16;
  const labelH = 34; // Espacio para etiqueta 'x4' en itálica debajo de la carta
  const padding = 26;
  const headerH = 76;
  const footerH = 36;

  const rows = Math.ceil(cards.length / cols);
  const totalW = padding * 2 + cols * cardW + (cols - 1) * gapX;
  const totalH = headerH + padding * 2 + rows * (cardH + labelH) + (rows - 1) * gapY + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar contexto Canvas 2D');

  // Fondo
  if (isWhiteTheme) {
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillStyle = '#090d16';
  }
  ctx.fillRect(0, 0, totalW, totalH);

  // Cabecera / Banner
  ctx.save();
  const titleColor = isWhiteTheme ? '#0f172a' : '#f8fafc';
  const subtitleColor = isWhiteTheme ? '#64748b' : '#94a3b8';

  // Título principal
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = titleColor;
  const headerTitle = isMissingMode ? `CARTAS FALTANTES: ${deckName}` : `LISTA DE DECK: ${deckName}`;
  ctx.fillText(headerTitle, padding, padding + 26);

  // Subtítulo con métricas
  const totalCardsSum = cards.reduce((acc, c) => acc + (isMissingMode ? c.missing : c.needed), 0);
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = subtitleColor;
  const subText = `${cards.length} tipos de cartas • Total: ${totalCardsSum} unidades • ${new Date().toLocaleDateString()}`;
  ctx.fillText(subText, padding, padding + 48);

  // Línea separadora
  ctx.strokeStyle = isWhiteTheme ? '#e2e8f0' : '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerH + padding - 12);
  ctx.lineTo(totalW - padding, headerH + padding - 12);
  ctx.stroke();
  ctx.restore();

  // Helper para precargar imagen con proxy anti-CORS
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fb = new Image();
        fb.crossOrigin = 'anonymous';
        fb.onload = () => resolve(fb);
        fb.onerror = () => resolve(null);
        fb.src = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';
      };
      
      let finalSrc = src;
      if (!finalSrc || finalSrc.includes('placeholder')) {
        finalSrc = 'https://www.optcgapi.com/media/static/Card_Images/OP01-013.jpg';
      } else if (finalSrc.startsWith('http')) {
        finalSrc = `/api/proxy-image?url=${encodeURIComponent(finalSrc)}`;
      }
      img.src = finalSrc;
    });
  };

  // Cargar imágenes
  const loadedImages = await Promise.all(
    cards.map(c => loadImage(getHighQualityImageUrl(c.image_url, c.card_number, c.set_code) || `https://www.optcgapi.com/media/static/Card_Images/${c.card_number}.jpg`))
  );

  // Dibujar cada carta en la cuadrícula
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const img = loadedImages[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = padding + col * (cardW + gapX);
    const y = headerH + padding + row * (cardH + labelH + gapY);

    // 1. Imagen de carta con esquinas redondeadas
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, cardW, cardH, 8);
    } else {
      ctx.rect(x, y, cardW, cardH);
    }
    ctx.clip();

    if (img) {
      ctx.drawImage(img, x, y, cardW, cardH);
    } else {
      ctx.fillStyle = isWhiteTheme ? '#f1f5f9' : '#1e293b';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = subtitleColor;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.card_number, x + cardW / 2, y + cardH / 2);
    }
    ctx.restore();

    // 2. Borde exterior de la carta
    ctx.save();
    ctx.strokeStyle = isWhiteTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, cardW, cardH, 8);
    } else {
      ctx.rect(x, y, cardW, cardH);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Etiqueta inferior idéntica a la referencia: 'x1', 'x4' en itálica elegante
    ctx.save();
    const qty = isMissingMode ? card.missing : card.needed;
    
    // Cursiva 'x4' a la izquierda
    ctx.font = 'italic bold 21px "Segoe UI", Georgia, "Times New Roman", serif';
    ctx.fillStyle = isWhiteTheme ? '#0284c7' : '#38bdf8'; // Toque azul premium
    ctx.textAlign = 'left';
    ctx.fillText(`x${qty}`, x + 4, y + cardH + 22);

    // Código de la carta a la derecha
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = isWhiteTheme ? '#64748b' : '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(card.card_number, x + cardW - 2, y + cardH + 20);
    ctx.restore();
  }

  // Footer / Pie de página
  ctx.save();
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = isWhiteTheme ? '#94a3b8' : '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('Generado con One Piece TCG Tracker • Catálogo & Precios Oficiales', totalW / 2, totalH - 14);
  ctx.restore();

  return canvas;
}

function downloadCurrentExportImage() {
  if (!currentExportCanvas) return;
  const link = document.createElement('a');
  const safeName = (currentDeckAnalysis?.name || 'deck').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const mode = exportModeMissing ? 'faltantes' : 'completo';
  link.download = `deck_${mode}_${safeName}.png`;
  link.href = currentExportCanvas.toDataURL('image/png');
  link.click();
}

btnExportMissingImage?.addEventListener('click', openDeckImageExportModal);
btnCloseDeckImageModal?.addEventListener('click', () => {
  modalDeckImageExport?.classList.add('hidden');
});

// Selector de modo: Faltantes vs Completo
btnImgModeMissing?.addEventListener('click', () => {
  exportModeMissing = true;
  btnImgModeMissing.className = 'px-2.5 py-1 rounded-md bg-purple-600 text-white font-medium transition';
  btnImgModeAll.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
  renderDeckExportImage();
});

btnImgModeAll?.addEventListener('click', () => {
  exportModeMissing = false;
  btnImgModeAll.className = 'px-2.5 py-1 rounded-md bg-purple-600 text-white font-medium transition';
  btnImgModeMissing.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
  renderDeckExportImage();
});

// Selector de tema: Blanco vs Oscuro
btnImgThemeWhite?.addEventListener('click', () => {
  exportThemeWhite = true;
  btnImgThemeWhite.className = 'px-2.5 py-1 rounded-md bg-purple-600 text-white font-medium transition';
  btnImgThemeDark.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
  renderDeckExportImage();
});

btnImgThemeDark?.addEventListener('click', () => {
  exportThemeWhite = false;
  btnImgThemeDark.className = 'px-2.5 py-1 rounded-md bg-purple-600 text-white font-medium transition';
  btnImgThemeWhite.className = 'px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
  renderDeckExportImage();
});

// Acción: Copiar imagen al portapapeles
btnActionCopyImageBlob?.addEventListener('click', async () => {
  if (!currentExportBlob) return;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': currentExportBlob })
    ]);
    const origHtml = btnActionCopyImageBlob.innerHTML;
    btnActionCopyImageBlob.innerHTML = `<i class="fa-solid fa-check text-emerald-300"></i> ¡Imagen Copiada!`;
    setTimeout(() => {
      btnActionCopyImageBlob.innerHTML = origHtml;
    }, 2500);
  } catch (err) {
    console.warn('Clipboard image copy not permitted by browser, falling back to download:', err);
    downloadCurrentExportImage();
    alert('Tu navegador no permitió copiar la imagen directamente al portapapeles por políticas de seguridad. Se ha descargado automáticamente en PNG a tu dispositivo.');
  }
});

// Acción: Descargar PNG
btnActionDownloadImagePng?.addEventListener('click', downloadCurrentExportImage);


// ─── INICIALIZACIÓN AL ABRIR LA APP ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateTopbarTRM();
  loadAndSyncSetCounts();
  loadCatalogCards('all', 'all');
  loadSavedDecksCount();
});

// Respaldo de inicialización inmediata
updateTopbarTRM();
loadAndSyncSetCounts();
loadCatalogCards('all', 'all');
loadSavedDecksCount();

