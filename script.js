// ==========================================
// CONFIGURACIÓN GLOBAL - SINCRONIZACIÓN
// ==========================================
function limpiarUrl(url) {
  if (!url) return '';
  return url.toString().trim().replace(/\s+/g, '').replace(/\/+$/, '');
}

const CONFIG = {
  syncUrl: limpiarUrl(localStorage.getItem('syncUrl') || ''),
  syncInterval: null,
  lastSync: localStorage.getItem('lastSync') || null,
  isOnline: navigator.onLine,
  deviceId: localStorage.getItem('deviceId') || generarDeviceId()
};

// Datos locales - Cargar desde localStorage o usar datos iniciales del backup
let lotes = [];
let compras = [];
let ventas = [];
let abonos = [];
let cobros = [];

// Variables temporales
let productosLoteTemp = [];
let productosCompraTemp = [];
let productosVentaTemp = [];
let loteSeleccionadoId = null;
let compraSeleccionadaId = null;
let ventaSeleccionadaId = null;
let abonoSeleccionadoId = null;
let cobroSeleccionadoId = null;
let productosSeleccionados = [];

// ==========================================
// INICIALIZACIÓN CON DATOS DEL BACKUP
// ==========================================
window.onload = function() {
  // Cargar tema guardado
  cargarTema();
  
  // Cargar datos desde localStorage o usar datos del backup si no hay datos guardados
  const lotesGuardados = localStorage.getItem('lotes');
  const comprasGuardadas = localStorage.getItem('compras');
  const ventasGuardadas = localStorage.getItem('ventas');
  const abonosGuardados = localStorage.getItem('abonos');
  const cobrosGuardados = localStorage.getItem('cobros');

  if (lotesGuardados) {
    lotes = JSON.parse(lotesGuardados);
    compras = JSON.parse(comprasGuardadas || '[]');
    ventas = JSON.parse(ventasGuardadas || '[]');
    abonos = JSON.parse(abonosGuardados || '[]');
    cobros = JSON.parse(cobrosGuardados || '[]');
  } else {
    // Primera carga - usar datos del backup (data.js)
    console.log('Cargando datos iniciales del backup...');
    lotes = JSON.parse(JSON.stringify(initialLotes || []));
    ventas = JSON.parse(JSON.stringify(initialVentas || []));
    compras = [];
    abonos = [];
    cobros = [];
    saveLocalData();
  }

  window.addEventListener('online', () => {
    CONFIG.isOnline = true;
    updateSyncStatus('online');
  });
  window.addEventListener('offline', () => {
    CONFIG.isOnline = false;
    updateSyncStatus('offline');
  });
  
  if (CONFIG.syncUrl && localStorage.getItem('syncAuto') !== 'false') {
    iniciarSyncAutomatico();
  }
  
  updateSyncStatus(CONFIG.isOnline ? (CONFIG.syncUrl ? 'synced' : 'online') : 'offline');
  showSection('lotes');
  updateResumen();
  renderRecordatorios();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('Error SW:', err));
  }
};

function generarDeviceId() {
  const id = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', id);
  return id;
}

// ==========================================
// THEME / TEMA CLARO-OSCURO
// ==========================================
function cargarTema() {
  const temaGuardado = localStorage.getItem('tema') || 'light';
  if (temaGuardado === 'dark') {
    document.documentElement.classList.add('dark');
    actualizarIconoTema(true);
  } else {
    document.documentElement.classList.remove('dark');
    actualizarIconoTema(false);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('tema', 'light');
    actualizarIconoTema(false);
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('tema', 'dark');
    actualizarIconoTema(true);
  }
}

function actualizarIconoTema(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    if (isDark) {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    } else {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    }
  }
}

// ==========================================
// BÚSQUEDA GLOBAL DE CLIENTES
// ==========================================
function buscarClienteGlobal() {
  const busqueda = document.getElementById('buscadorGlobal').value.trim().toUpperCase();
  const resultadosDiv = document.getElementById('resultadosBusquedaGlobal');
  
  if (busqueda.length < 2) {
    resultadosDiv.classList.add('hidden');
    return;
  }
  
  // Buscar en ventas por nombre de cliente o ID
  const resultados = ventas.filter(v => 
    v.cliente.toUpperCase().includes(busqueda) || 
    v.id.toUpperCase().includes(busqueda)
  );
  
  if (resultados.length === 0) {
    resultadosDiv.innerHTML = '<p class="text-gray-500 text-center py-2">No se encontraron clientes</p>';
    resultadosDiv.classList.remove('hidden');
    return;
  }
  
  resultadosDiv.innerHTML = resultados.map(v => {
    const diasRestantes = Math.ceil((calcularProximaFechaCobro(v) - new Date()) / (1000 * 60 * 60 * 24));
    const alertaClass = diasRestantes < 0 ? 'bg-red-100 dark:bg-red-900/20 border-red-300' : 
                       diasRestantes <= 7 ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300' : 
                       'bg-gray-50 dark:bg-slate-700 border-gray-200';
    
    const frecuenciaText = v.frecuenciaPago === 'semanal' ? ' (Semanal)' : 
                          v.frecuenciaPago === 'quincenal' ? ' (Quincenal)' : 
                          v.frecuenciaPago === 'personalizado' ? ' (Personalizado)' : '';
    
    return `
      <div class="p-3 ${alertaClass} rounded-xl border cursor-pointer hover:shadow-md transition-shadow" onclick="verDetalleVenta('${v.id}'); limpiarBusqueda();">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold text-gray-800 dark:text-white">${v.cliente}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${v.id} | ${v.telefono || 'Sin teléfono'}</p>
          </div>
          <div class="text-right">
            <p class="text-xs ${v.estado === 'PENDIENTE' ? 'text-orange-600 font-bold' : 'text-green-600'}">${v.estado}</p>
            <p class="text-sm font-bold text-gray-800 dark:text-white">C$${(parseFloat(v.saldo) || 0).toLocaleString()}</p>
          </div>
        </div>
        <div class="mt-2 flex justify-between text-xs">
          <span class="${diasRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
            Próximo: ${formatFecha(v.proximaFechaCobro)} ${diasRestantes < 0 ? '(Vencido)' : ''}${frecuenciaText}
          </span>
          <span class="text-gray-500 dark:text-gray-400">Cuota: C$${(parseFloat(v.cuotaMensual) || 0).toLocaleString()}</span>
        </div>
        <div class="mt-2 flex gap-2">
          <button onclick="event.stopPropagation(); registrarCobroRapido('${v.id}')" class="flex-1 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
            + Cobro
          </button>
          <button onclick="event.stopPropagation(); verDetalleVenta('${v.id}')" class="flex-1 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50">
            Ver
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  resultadosDiv.classList.remove('hidden');
}

function limpiarBusqueda() {
  document.getElementById('buscadorGlobal').value = '';
  document.getElementById('resultadosBusquedaGlobal').classList.add('hidden');
}

function registrarCobroRapido(ventaId) {
  limpiarBusqueda();
  showForm('cobro');
  setTimeout(() => {
    seleccionarVentaCobroDirecto(ventaId);
  }, 100);
}

// ==========================================
// RECORDATORIOS DE COBRO CON FRECUENCIA
// ==========================================
function toggleRecordatorios() {
  const lista = document.getElementById('listaRecordatorios');
  lista.classList.toggle('hidden');
}

function calcularProximaFechaCobro(venta) {
  if (!venta.proximaFechaCobro) return new Date();
  return new Date(venta.proximaFechaCobro);
}

function renderRecordatorios() {
  const hoy = new Date();
  const proximosDias = 7; // Próximos 7 días
  
  const recordatorios = ventas
    .filter(v => v.estado === 'PENDIENTE')
    .map(v => {
      const proximoCobro = calcularProximaFechaCobro(v);
      const diasRestantes = Math.ceil((proximoCobro - hoy) / (1000 * 60 * 60 * 24));
      return { ...v, diasRestantes, proximoCobro };
    })
    .filter(v => v.diasRestantes <= proximosDias)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  
  document.getElementById('countRecordatorios').textContent = recordatorios.length;
  
  const container = document.getElementById('listaRecordatorios');
  
  if (recordatorios.length === 0) {
    container.innerHTML = '<p class="text-center text-sm opacity-80">No hay cobros próximos</p>';
    return;
  }
  
  container.innerHTML = recordatorios.map(v => {
    const alertaClass = v.diasRestantes < 0 ? 'bg-red-600' : 
                       v.diasRestantes === 0 ? 'bg-yellow-500' : 'bg-white/20';
    const textoAlerta = v.diasRestantes < 0 ? `Vencido ${Math.abs(v.diasRestantes)} días` :
                        v.diasRestantes === 0 ? '¡Hoy!' : 
                        `En ${v.diasRestantes} días`;
    
    const frecuenciaLabel = v.frecuenciaPago === 'semanal' ? ' (Sem)' : 
                           v.frecuenciaPago === 'quincenal' ? ' (Qnc)' : 
                           v.frecuenciaPago === 'personalizado' ? ' (Per)' : '';
    
    return `
      <div class="flex items-center justify-between p-2 ${alertaClass} rounded-lg cursor-pointer hover:bg-white/30" onclick="verDetalleVenta('${v.id}')">
        <div class="flex-1">
          <p class="font-bold text-sm">${v.cliente}</p>
          <p class="text-xs opacity-90">Cuota: C$${(parseFloat(v.cuotaMensual) || 0).toLocaleString()}${frecuenciaLabel}</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold">${textoAlerta}</p>
          <p class="text-xs">Saldo: C$${(parseFloat(v.saldo) || 0).toLocaleString()}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// SINCRONIZACIÓN
// ==========================================
function mostrarConfigSync() {
  document.getElementById('syncUrl').value = CONFIG.syncUrl || '';
  document.getElementById('syncAuto').checked = localStorage.getItem('syncAuto') !== 'false';
  const estado = !CONFIG.syncUrl ? 'No configurado' :
    !CONFIG.isOnline ? 'Sin conexión' :
    CONFIG.lastSync ? `Última: ${new Date(CONFIG.lastSync).toLocaleTimeString()}` : 'Pendiente';
  document.getElementById('estadoSync').textContent = estado;
  document.getElementById('modalConfigSync').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function guardarConfigSync() {
  let url = document.getElementById('syncUrl').value;
  url = limpiarUrl(url);
  if (!url) {
    alert('Ingresa la URL de la Web App de Google Apps Script');
    return;
  }
  if (!url.includes('script.google.com/macros/s/')) {
    alert('URL inválida. Debe ser: https://script.google.com/macros/s/XXXX/exec');
    return;
  }
  CONFIG.syncUrl = url;
  localStorage.setItem('syncUrl', url);
  localStorage.setItem('syncAuto', document.getElementById('syncAuto').checked);
  if (document.getElementById('syncAuto').checked) {
    iniciarSyncAutomatico();
  }
  cerrarModal('modalConfigSync');
  probarConexion().then(ok => {
    if (ok) {
      sincronizarAhora();
      showToast('✅ Conectado');
    } else {
      showToast('⚠️ URL guardada. Probar sincronización manual.');
    }
  });
}

async function probarConexion() {
  try {
    const response = await fetch(CONFIG.syncUrl + '?test=1', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

function iniciarSyncAutomatico() {
  detenerSyncAutomatico();
  CONFIG.syncInterval = setInterval(sincronizarAhora, 300000);
}

function detenerSyncAutomatico() {
  if (CONFIG.syncInterval) {
    clearInterval(CONFIG.syncInterval);
    CONFIG.syncInterval = null;
  }
}

async function sincronizarAhora() {
  const url = limpiarUrl(CONFIG.syncUrl);
  if (!url) {
    showToast('⚠️ Configura la URL primero (botón Configurar)');
    return;
  }
  if (!CONFIG.isOnline) {
    showToast('📴 Sin conexión a internet');
    return;
  }
  
  document.getElementById('syncIndicator').classList.remove('hidden');
  updateSyncStatus('syncing');
  
  try {
    const cleanData = (arr) => arr.map(item => {
      const clean = {};
      Object.keys(item).forEach(key => {
        if (key === 'productos' && typeof item[key] === 'object') {
          clean[key] = JSON.stringify(item[key]);
        } else {
          clean[key] = item[key];
        }
      });
      return clean;
    });

    const datosParaEnviar = {
      lotes: cleanData(lotes),
      compras: cleanData(compras),
      ventas: cleanData(ventas),
      abonos: abonos,
      cobros: cobros,
      deviceId: CONFIG.deviceId,
      lastModified: Date.now()
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaEnviar),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const resultado = await response.json();
      
      if (resultado.success) {
        await procesarRespuestaExitosa(resultado);
        return;
      } else {
        throw new Error(resultado.error || 'Error del servidor');
      }
      
    } catch (corsError) {
      showToast('🔄 Intentando modo alternativo...');
      
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosParaEnviar)
      });
      
      CONFIG.lastSync = new Date().toISOString();
      localStorage.setItem('lastSync', CONFIG.lastSync);
      updateSyncStatus('synced');
      showToast('✅ Datos guardados (modo silencioso)');
    }
  } catch (error) {
    console.error('❌ Error total:', error);
    updateSyncStatus('error');
    let mensaje = '❌ Error de sincronización';
    if (error.name === 'AbortError') {
      mensaje = '⏱️ Tiempo agotado. Intenta de nuevo.';
    } else if (error.message.includes('Failed to fetch')) {
      mensaje = '❌ Error de conexión. Verifica la URL en Configurar.';
    } else {
      mensaje = '❌ ' + error.message.substring(0, 60);
    }
    showToast(mensaje);
  } finally {
    document.getElementById('syncIndicator').classList.add('hidden');
  }
}

async function procesarRespuestaExitosa(resultado) {
  const parseProductos = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (!item) return null;
      try {
        let productos = item.productos;
        if (typeof productos === 'string') {
          productos = JSON.parse(productos);
        }
        return { ...item, productos: productos || [] };
      } catch (e) {
        return { ...item, productos: [] };
      }
    }).filter(Boolean);
  };
  
  if (resultado.data) {
    if (resultado.data.lotes) lotes = parseProductos(resultado.data.lotes);
    if (resultado.data.compras) compras = parseProductos(resultado.data.compras);
    if (resultado.data.ventas) ventas = parseProductos(resultado.data.ventas);
    if (resultado.data.abonos) abonos = resultado.data.abonos || [];
    if (resultado.data.cobros) cobros = resultado.data.cobros || [];
    saveLocalData();
    renderCurrentSection();
    updateResumen();
    renderRecordatorios();
  }
  
  CONFIG.lastSync = new Date().toISOString();
  localStorage.setItem('lastSync', CONFIG.lastSync);
  updateSyncStatus('synced');
  showToast('✅ Sincronizado con Google Sheets');
}

function updateSyncStatus(status) {
  const indicator = document.getElementById('syncStatus');
  const configs = {
    online: { color: 'pink', text: 'En línea' },
    offline: { color: 'red', text: 'Sin conexión' },
    syncing: { color: 'yellow', text: 'Sincronizando...', pulse: true },
    synced: { color: 'blue', text: 'Sincronizado' },
    error: { color: 'orange', text: 'Error de conexión' }
  };
  const cfg = configs[status] || configs.offline;
  const pulseClass = cfg.pulse ? 'animate-pulse' : '';
  indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-${cfg.color}-500 ${pulseClass}"></span> <span class="text-${cfg.color}-600 dark:text-${cfg.color}-400 text-sm">${cfg.text}</span>`;
}

// ==========================================
// IMPORTAR/EXPORTAR DATOS
// ==========================================
function exportarDatos() {
  const datos = { lotes, compras, ventas, abonos, cobros, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-control-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('✅ Datos exportados');
}

function mostrarImportar() {
  document.getElementById('modalImportar').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function procesarImportacion() {
  const fileInput = document.getElementById('importFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Selecciona un archivo JSON');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const datos = JSON.parse(e.target.result);
      
      if (!confirm('¿Reemplazar TODOS los datos? Asegúrate de haber exportado una copia primero.')) return;
      
      // Validar que el archivo tenga la estructura correcta
      if (!datos.lotes || !Array.isArray(datos.lotes)) {
        alert('El archivo no tiene el formato correcto. Faltan lotes.');
        return;
      }
      
      // Normalizar datos del backup
      lotes = (datos.lotes || []).map(normalizarLote);
      compras = (datos.compras || []).map(normalizarCompra);
      ventas = (datos.ventas || []).map(normalizarVenta);
      abonos = (datos.abonos || []).map(normalizarAbono);
      cobros = (datos.cobros || []).map(normalizarCobro);
      
      saveLocalData();
      renderCurrentSection();
      updateResumen();
      renderRecordatorios();
      cerrarModal('modalImportar');
      showToast('✅ Datos importados correctamente');
    } catch (error) {
      alert('Error al importar: ' + error.message);
      console.error(error);
    }
  };
  reader.readAsText(file);
}

// Normalización de datos (strings a números)
function normalizarLote(l) {
  return {
    ...l,
    id: (l.id || '').toString().trim(),
    totalInicial: parseFloat(l.totalInicial) || 0,
    abonado: parseFloat(l.abonado) || 0,
    saldoPendiente: parseFloat(l.saldoPendiente) || 0,
    estado: (l.estado || 'PENDIENTE').toString().trim(),
    lastModified: l.lastModified || Date.now()
  };
}

function normalizarCompra(c) {
  return {
    ...c,
    id: (c.id || '').toString().trim(),
    lastModified: c.lastModified || Date.now()
  };
}

function normalizarVenta(v) {
  return {
    ...v,
    id: (v.id || '').toString().trim(),
    precioTotal: parseFloat(v.precioTotal) || 0,
    prima: parseFloat(v.prima) || 0,
    saldo: parseFloat(v.saldo) || 0,
    pagado: parseFloat(v.pagado) || 0,
    cuotaMensual: parseFloat(v.cuotaMensual) || 0,
    meses: parseInt(v.meses) || 12,
    estado: (v.estado || 'PENDIENTE').toString().trim(),
    frecuenciaPago: v.frecuenciaPago || 'mensual',
    fechasPersonalizadas: v.fechasPersonalizadas || [],
    lastModified: v.lastModified || Date.now()
  };
}

function normalizarAbono(a) {
  return {
    ...a,
    id: (a.id || '').toString().trim(),
    loteId: (a.loteId || '').toString().trim(),
    monto: parseFloat(a.monto) || 0,
    saldoDespues: parseFloat(a.saldoDespues) || 0,
    lastModified: a.lastModified || Date.now()
  };
}

function normalizarCobro(c) {
  return {
    ...c,
    id: (c.id || '').toString().trim(),
    ventaId: (c.ventaId || '').toString().trim(),
    monto: parseFloat(c.monto) || 0,
    lastModified: c.lastModified || Date.now()
  };
}

// ==========================================
// DATOS LOCALES
// ==========================================
function saveLocalData() {
  try {
    localStorage.setItem('lotes', JSON.stringify(lotes));
    localStorage.setItem('compras', JSON.stringify(compras));
    localStorage.setItem('ventas', JSON.stringify(ventas));
    localStorage.setItem('abonos', JSON.stringify(abonos));
    localStorage.setItem('cobros', JSON.stringify(cobros));
    updateResumen();
    renderRecordatorios();
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
    showToast('❌ Error al guardar datos. Espacio lleno?');
  }
}

function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, l) => sum + (parseFloat(l.saldoPendiente) || 0), 0);
  const totalCompras = compras.reduce((sum, c) => {
    const stock = c.productos?.filter(p => !p.vendido).reduce((s, p) =>
      s + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0) || 0;
    return sum + stock;
  }, 0);
  const clientesDeben = ventas.reduce((sum, v) => sum + (parseFloat(v.saldo) || 0), 0);
  const gananciaEstimada = ventas.reduce((sum, v) => {
    const costo = v.productos?.reduce((c, p) => {
      const precioCosto = parseFloat(p.precioCarmen) || parseFloat(p.precioCompra) || 0;
      return c + (precioCosto * (parseInt(p.cantidad) || 1));
    }, 0) || 0;
    return sum + ((parseFloat(v.precioTotal) || 0) - costo);
  }, 0);
  
  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('totalCompras').textContent = `C$${totalCompras.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('countLotes').textContent = lotes.filter(l => l.estado === 'PENDIENTE').length;
  document.getElementById('countCompras').textContent = compras.length;
  document.getElementById('countVentas').textContent = ventas.filter(v => v.estado === 'PENDIENTE').length;
  
  const totalStock = [...lotes, ...compras].reduce((sum, item) =>
    sum + (item.productos?.filter(p => !p.vendido).length || 0), 0);
  document.getElementById('countStock').textContent = totalStock;
  
  // Actualizar contadores en finanzas
  document.getElementById('countAbonos').textContent = abonos.length;
  document.getElementById('countCobros').textContent = cobros.length;
}

// ==========================================
// NAVEGACIÓN
// ==========================================
function showSection(section) {
  ['lotes', 'compras', 'ventas', 'finanzas'].forEach(s => {
    document.getElementById(`section${s.charAt(0).toUpperCase() + s.slice(1)}`).classList.add('hidden');
  });
  document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`).classList.remove('hidden');
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-pink-600', 'text-white');
    btn.classList.add('bg-white', 'dark:bg-slate-800');
    if (btn.dataset.section === section) {
      btn.classList.remove('bg-white', 'dark:bg-slate-800');
      btn.classList.add('bg-pink-600', 'text-white');
    }
  });
  
  if (section === 'lotes') renderLotes();
  else if (section === 'compras') renderCompras();
  else if (section === 'ventas') renderVentas();
  else if (section === 'finanzas') { renderAbonos(); renderCobros(); }
}

function renderCurrentSection() {
  const sections = ['lotes', 'compras', 'ventas', 'finanzas'];
  for (let s of sections) {
    if (!document.getElementById(`section${s.charAt(0).toUpperCase() + s.slice(1)}`).classList.contains('hidden')) {
      if (s === 'lotes') renderLotes();
      else if (s === 'compras') renderCompras();
      else if (s === 'ventas') renderVentas();
      else if (s === 'finanzas') { renderAbonos(); renderCobros(); }
      break;
    }
  }
}

function hideForms() {
  document.getElementById('formOverlay').classList.add('hidden');
  ['formLote', 'formCompra', 'formVenta', 'formAbono', 'formCobro',
   'selectorProductos', 'modalConfigSync', 'modalImportar', 'modalQRSync',
   'modalDetalleLote', 'modalDetalleCompra', 'modalDetalleVenta',
   'modalDetalleAbono', 'modalDetalleCobro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function cerrarModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
  document.getElementById('formOverlay').classList.add('hidden');
}

// ==========================================
// LOTES - CRUD COMPLETO
// ==========================================
function showForm(type, editId = null) {
  hideForms();
  document.getElementById('formOverlay').classList.remove('hidden');
  
  if (type === 'lote') {
    const form = document.getElementById('formLote');
    form.classList.remove('hidden');
    const btnEliminar = document.getElementById('btnEliminarLote');
    
    if (editId) {
      const lote = lotes.find(l => l.id === editId);
      if (!lote) return;
      
      document.getElementById('tituloFormLote').textContent = 'Editar Lote';
      document.getElementById('loteEditId').value = editId;
      document.getElementById('loteId').value = lote.id;
      document.getElementById('loteId').disabled = true;
      document.getElementById('loteFecha').value = lote.fechaRecepcion;
      document.getElementById('loteFechaLimite').value = lote.fechaLimite;
      
      productosLoteTemp = JSON.parse(JSON.stringify(lote.productos || []));
      renderProductosLote();
      
      const opcionesPagado = document.getElementById('opcionesLotePagado');
      if (lote.estado === 'PAGADO') {
        opcionesPagado.classList.remove('hidden');
        document.getElementById('reabrirLote').checked = false;
      } else {
        opcionesPagado.classList.add('hidden');
      }
      
      btnEliminar.classList.remove('hidden');
      loteSeleccionadoId = editId;
    } else {
      document.getElementById('tituloFormLote').textContent = 'Nuevo Lote';
      document.getElementById('loteEditId').value = '';
      document.getElementById('loteId').value = '';
      document.getElementById('loteId').disabled = false;
      document.getElementById('loteFecha').valueAsDate = new Date();
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() + 2);
      document.getElementById('loteFechaLimite').valueAsDate = fechaLimite;
      productosLoteTemp = [];
      renderProductosLote();
      document.getElementById('opcionesLotePagado').classList.add('hidden');
      btnEliminar.classList.add('hidden');
      loteSeleccionadoId = null;
    }
  } else if (type === 'compra') {
    const form = document.getElementById('formCompra');
    form.classList.remove('hidden');
    const btnEliminar = document.getElementById('btnEliminarCompra');
    
    if (editId) {
      const compra = compras.find(c => c.id === editId);
      if (!compra) return;
      
      document.getElementById('tituloFormCompra').textContent = 'Editar Compra';
      document.getElementById('compraEditId').value = editId;
      document.getElementById('compraId').value = compra.id;
      document.getElementById('compraId').disabled = true;
      document.getElementById('compraFecha').value = compra.fecha;
      document.getElementById('compraProveedor').value = compra.proveedor || '';
      
      productosCompraTemp = JSON.parse(JSON.stringify(compra.productos || []));
      renderProductosCompra();
      btnEliminar.classList.remove('hidden');
      compraSeleccionadaId = editId;
    } else {
      document.getElementById('tituloFormCompra').textContent = 'Nueva Compra';
      document.getElementById('compraEditId').value = '';
      document.getElementById('compraId').value = '';
      document.getElementById('compraId').disabled = false;
      document.getElementById('compraFecha').valueAsDate = new Date();
      document.getElementById('compraProveedor').value = '';
      productosCompraTemp = [];
      renderProductosCompra();
      btnEliminar.classList.add('hidden');
      compraSeleccionadaId = null;
    }
  } else if (type === 'venta') {
    const form = document.getElementById('formVenta');
    form.classList.remove('hidden');
    const btnEliminar = document.getElementById('btnEliminarVenta');
    
    if (editId) {
      const venta = ventas.find(v => v.id === editId);
      if (!venta) return;
      
      document.getElementById('tituloFormVenta').textContent = 'Editar Venta';
      document.getElementById('ventaEditId').value = editId;
      document.getElementById('ventaId').value = venta.id;
      document.getElementById('ventaId').disabled = true;
      document.getElementById('ventaCliente').value = venta.cliente;
      document.getElementById('ventaTelefono').value = venta.telefono || '';
      document.getElementById('ventaFecha').value = venta.fecha;
      document.getElementById('ventaPrima').value = venta.prima || 0;
      document.getElementById('ventaMeses').value = venta.meses || 12;
      document.getElementById('ventaTipoPago').value = venta.tipoPago || 'credito';
      document.getElementById('ventaFrecuencia').value = venta.frecuenciaPago || 'mensual';
      
      productosVentaTemp = JSON.parse(JSON.stringify(venta.productos || []));
      renderProductosVenta();
      
      // Mostrar/ocultar campos según tipo de pago
      cambiarTipoPago();
      
      // Cargar fechas personalizadas si existen
      if (venta.frecuenciaPago === 'personalizado' && venta.fechasPersonalizadas) {
        document.getElementById('ventaFechasPersonalizadas').value = venta.fechasPersonalizadas.join(',');
        document.getElementById('contenedorFechasPersonalizadas').classList.remove('hidden');
      }
      
      const opcionesPagada = document.getElementById('opcionesVentaPagada');
      if (venta.estado === 'PAGADO') {
        opcionesPagada.classList.remove('hidden');
        document.getElementById('reactivarVenta').checked = false;
      } else {
        opcionesPagada.classList.add('hidden');
      }
      
      btnEliminar.classList.remove('hidden');
      ventaSeleccionadaId = editId;
    } else {
      document.getElementById('tituloFormVenta').textContent = 'Nueva Venta';
      document.getElementById('ventaEditId').value = '';
      document.getElementById('ventaId').value = '';
      document.getElementById('ventaId').disabled = false;
      document.getElementById('ventaFecha').valueAsDate = new Date();
      document.getElementById('ventaMeses').value = '12';
      document.getElementById('ventaTipoPago').value = 'credito';
      document.getElementById('ventaFrecuencia').value = 'mensual';
      productosVentaTemp = [];
      renderProductosVenta();
      document.getElementById('opcionesVentaPagada').classList.add('hidden');
      btnEliminar.classList.add('hidden');
      ventaSeleccionadaId = null;
      
      // Resetear visibilidad de campos
      document.getElementById('contenedorMeses').classList.remove('hidden');
      document.getElementById('contenedorFrecuencia').classList.remove('hidden');
      document.getElementById('contenedorFechasPersonalizadas').classList.add('hidden');
      document.getElementById('labelCuota').textContent = 'Cuota Mensual';
    }
  } else if (type === 'abono') {
    document.getElementById('formAbono').classList.remove('hidden');
    document.getElementById('tituloFormAbono').textContent = 'Abonar a Carmen';
    cargarSelectLotes();
    document.getElementById('btnEliminarAbono').classList.add('hidden');
    abonoSeleccionadoId = null;
    document.getElementById('abonoEditId').value = '';
    document.getElementById('abonoFecha').valueAsDate = new Date();
    document.getElementById('abonoMonto').value = '';
    document.getElementById('abonoNotas').value = '';
    document.getElementById('infoLoteAbono').classList.add('hidden');
  } else if (type === 'cobro') {
    document.getElementById('formCobro').classList.remove('hidden');
    document.getElementById('tituloFormCobro').textContent = 'Cobrar a Cliente';
    document.getElementById('btnEliminarCobro').classList.add('hidden');
    cobroSeleccionadoId = null;
    document.getElementById('cobroEditId').value = '';
    document.getElementById('cobroFecha').valueAsDate = new Date();
    document.getElementById('cobroMonto').value = '';
    document.getElementById('cobroNotas').value = '';
    document.getElementById('cobroBusqueda').value = '';
    document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
    document.getElementById('infoVentaCobro').classList.add('hidden');
  }
}

function cambiarTipoPago() {
  const tipoPago = document.getElementById('ventaTipoPago').value;
  const contenedorMeses = document.getElementById('contenedorMeses');
  const contenedorFrecuencia = document.getElementById('contenedorFrecuencia');
  const labelCuota = document.getElementById('labelCuota');
  
  if (tipoPago === 'cash') {
    contenedorMeses.classList.add('hidden');
    contenedorFrecuencia.classList.add('hidden');
    document.getElementById('ventaPrima').value = document.getElementById('previewTotalVenta').textContent.replace(/[^0-9.]/g, '');
    labelCuota.textContent = 'Pago Único';
    calcularVenta();
  } else {
    contenedorMeses.classList.remove('hidden');
    contenedorFrecuencia.classList.remove('hidden');
    labelCuota.textContent = 'Cuota';
    calcularVenta();
  }
}

function cambiarFrecuenciaPago() {
  const frecuencia = document.getElementById('ventaFrecuencia').value;
  const contenedorFechas = document.getElementById('contenedorFechasPersonalizadas');
  const labelCuota = document.getElementById('labelCuota');
  
  if (frecuencia === 'personalizado') {
    contenedorFechas.classList.remove('hidden');
  } else {
    contenedorFechas.classList.add('hidden');
  }
  
  if (frecuencia === 'semanal') {
    labelCuota.textContent = 'Cuota Semanal';
  } else if (frecuencia === 'quincenal') {
    labelCuota.textContent = 'Cuota Quincenal';
  } else {
    labelCuota.textContent = 'Cuota Mensual';
  }
  
  calcularVenta();
}

function eliminarLote() {
  if (!loteSeleccionadoId) return;
  const lote = lotes.find(l => l.id === loteSeleccionadoId);
  if (!lote) return;
  if (!confirm(`¿Eliminar lote ${lote.id} permanentemente?\n\n⚠️ Esto también eliminará todos los abonos asociados a este lote.`)) return;
  
  abonos = abonos.filter(a => a.loteId !== loteSeleccionadoId);
  lotes = lotes.filter(l => l.id !== loteSeleccionadoId);
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderLotes();
  showToast(`Lote ${lote.id} eliminado`);
}

function eliminarCompra() {
  if (!compraSeleccionadaId) return;
  const compra = compras.find(c => c.id === compraSeleccionadaId);
  if (!compra) return;
  if (!confirm(`¿Eliminar compra ${compra.id} permanentemente?`)) return;
  
  compras = compras.filter(c => c.id !== compraSeleccionadaId);
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCompras();
  showToast(`Compra ${compra.id} eliminada`);
}

function eliminarVenta() {
  if (!ventaSeleccionadaId) return;
  const venta = ventas.find(v => v.id === ventaSeleccionadaId);
  if (!venta) return;
  if (!confirm(`¿Eliminar venta ${venta.id} permanentemente?\n\n⚠️ Esto también eliminará todos los cobros asociados a esta venta y liberará los productos en stock.`)) return;
  
  cobros = cobros.filter(c => c.ventaId !== ventaSeleccionadaId);
  
  venta.productos?.forEach(pv => {
    if (pv.sourceType === 'lote' && pv.sourceId) {
      const lote = lotes.find(l => l.id === pv.sourceId);
      if (lote) {
        const prod = lote.productos?.find(p => p.nombre === pv.nombre && p.vendido);
        if (prod) prod.vendido = false;
      }
    } else if (pv.sourceType === 'compra' && pv.sourceId) {
      const compra = compras.find(c => c.id === pv.sourceId);
      if (compra) {
        const prod = compra.productos?.find(p => p.nombre === pv.nombre && p.vendido);
        if (prod) prod.vendido = false;
      }
    }
  });
  
  ventas = ventas.filter(v => v.id !== ventaSeleccionadaId);
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderVentas();
  renderRecordatorios();
  showToast(`Venta ${venta.id} eliminada`);
}

// ==========================================
// PRODUCTOS LOTE
// ==========================================
function agregarProductoLote() {
  productosLoteTemp.push({
    id: Date.now() + Math.random(),
    nombre: '',
    cantidad: 1,
    precioCarmen: 0,
    vendido: false
  });
  renderProductosLote();
}

function renderProductosLote() {
  const container = document.getElementById('productosLoteContainer');
  let total = 0;
  
  container.innerHTML = productosLoteTemp.map((prod, idx) => {
    total += (parseFloat(prod.precioCarmen) || 0) * (parseInt(prod.cantidad) || 1);
    return `
      <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
        <div class="flex-1">
          <input type="text" placeholder="Nombre del producto" value="${prod.nombre}" 
            onchange="actualizarProductoLote(${idx}, 'nombre', this.value)" 
            class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2">
          <div class="flex gap-2">
            <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1" 
              onchange="actualizarProductoLote(${idx}, 'cantidad', parseInt(this.value)||1)" 
              class="w-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
            <input type="number" placeholder="Precio Carmen" value="${prod.precioCarmen || ''}" min="0" step="0.01" 
              onchange="actualizarProductoLote(${idx}, 'precioCarmen', parseFloat(this.value)||0)" 
              class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          </div>
        </div>
        <button onclick="eliminarProductoLote(${idx})" class="text-red-500 hover:text-red-700 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  document.getElementById('previewTotalLote').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function actualizarProductoLote(idx, campo, valor) {
  productosLoteTemp[idx][campo] = valor;
  if (campo === 'cantidad' || campo === 'precioCarmen') renderProductosLote();
}

function eliminarProductoLote(idx) {
  productosLoteTemp.splice(idx, 1);
  renderProductosLote();
}

function guardarLote() {
  const editId = document.getElementById('loteEditId').value;
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const fechaLimite = document.getElementById('loteFechaLimite').value;
  
  if (!id || !fecha || !fechaLimite) {
    alert('Completa todos los campos obligatorios');
    return;
  }
  
  const productosValidos = productosLoteTemp.filter(p => p.nombre && parseFloat(p.precioCarmen) > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto válido');
    return;
  }
  
  const totalInicial = productosValidos.reduce((sum, p) =>
    sum + (parseFloat(p.precioCarmen) * parseInt(p.cantidad)), 0);
  
  if (editId) {
    const lote = lotes.find(l => l.id === editId);
    if (!lote) return;
    
    const reabrir = document.getElementById('reabrirLote').checked;
    const productosVendidos = lote.productos?.filter(p => p.vendido) || [];
    const nuevosProductos = productosValidos.filter(np => 
      !productosVendidos.some(vp => vp.nombre === np.nombre && vp.cantidad === np.cantidad)
    );
    
    lote.fechaRecepcion = fecha;
    lote.fechaLimite = fechaLimite;
    lote.productos = [...productosVendidos, ...nuevosProductos];
    
    if (reabrir && lote.estado === 'PAGADO') {
      const nuevoTotal = nuevosProductos.reduce((sum, p) => 
        sum + (parseFloat(p.precioCarmen) * parseInt(p.cantidad)), 0);
      lote.totalInicial = (parseFloat(lote.totalInicial) || 0) + nuevoTotal;
      lote.saldoPendiente = (parseFloat(lote.saldoPendiente) || 0) + nuevoTotal;
      lote.estado = 'PENDIENTE';
      showToast('Lote reabierto con nuevos productos');
    } else {
      lote.totalInicial = totalInicial;
      lote.saldoPendiente = totalInicial - (parseFloat(lote.abonado) || 0);
      if (lote.saldoPendiente <= 0) lote.estado = 'PAGADO';
    }
    
    lote.lastModified = Date.now();
    showToast('Lote actualizado');
  } else {
    if (lotes.some(l => l.id === id)) {
      alert('Ya existe un lote con este ID');
      return;
    }
    
    lotes.push({
      id,
      fechaRecepcion: fecha,
      fechaLimite,
      totalInicial,
      abonado: 0,
      saldoPendiente: totalInicial,
      estado: 'PENDIENTE',
      productos: productosValidos,
      lastModified: Date.now()
    });
    showToast('Lote creado exitosamente');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderLotes();
}

function renderLotes() {
  const container = document.getElementById('listaLotes');
  const filtro = document.getElementById('filtroLotes').value;
  
  let lotesFiltrados = lotes;
  if (filtro === 'pendientes') lotesFiltrados = lotes.filter(l => l.estado === 'PENDIENTE');
  else if (filtro === 'pagados') lotesFiltrados = lotes.filter(l => l.estado === 'PAGADO');
  
  if (lotesFiltrados.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay lotes</p>';
    return;
  }
  
  const lotesOrdenados = [...lotesFiltrados].sort((a, b) =>
    new Date(a.fechaLimite) - new Date(b.fechaLimite));
  
  container.innerHTML = lotesOrdenados.map(lote => {
    const isPending = lote.estado === 'PENDIENTE';
    const progress = lote.totalInicial > 0 ?
      ((lote.totalInicial - lote.saldoPendiente) / lote.totalInicial * 100) : 0;
    const diasRestantes = Math.ceil((new Date(lote.fechaLimite) - new Date()) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ${lote.id}
              ${diasRestantes <= 7 && isPending ? '<span class="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">¡Urgente!</span>' : ''}
              ${!isPending ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Pagado</span>' : ''}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Recibido: ${formatFecha(lote.fechaRecepcion)}</p>
            <p class="text-xs ${diasRestantes < 0 && isPending ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Límite: ${formatFecha(lote.fechaLimite)} ${diasRestantes < 0 && isPending ? '(Vencido)' : ''}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="text-xl font-bold ${isPending ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
              C$${(parseFloat(lote.saldoPendiente) || 0).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso: ${progress.toFixed(1)}%</span>
            <span class="text-gray-600 dark:text-gray-400">${lote.productos?.filter(p => p.vendido).length || 0}/${lote.productos?.length || 0} vendidos</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-red-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleLote('${lote.id}')" class="flex-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 py-2 rounded-xl text-sm font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('lote', '${lote.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleLote(loteId) {
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return;
  
  loteSeleccionadoId = loteId;
  document.getElementById('tituloDetalleLote').textContent = `Detalle ${lote.id}`;
  
  const productosHtml = lote.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl ${p.vendido ? 'opacity-60' : ''}">
      <div>
        <p class="font-medium text-gray-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${(parseFloat(p.precioCarmen) || 0).toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${((parseFloat(p.precioCarmen) || 0) * parseInt(p.cantidad)).toLocaleString()}</p>
        ${p.vendido ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Vendido</span>' : '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Stock</span>'}
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const abonosLote = abonos.filter(a => a.loteId === loteId);
  const abonosHtml = abonosLote.length > 0 ? abonosLote.map(a => `
    <div class="flex justify-between items-center p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-sm cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900/40" onclick="verDetalleAbono('${a.id}')">
      <div>
        <p class="font-medium text-pink-800 dark:text-pink-300">${formatFecha(a.fecha)}</p>
        <p class="text-xs text-pink-600 dark:text-pink-400">${a.metodo} ${a.notas ? '- ' + a.notas : ''}</p>
      </div>
      <p class="font-bold text-pink-800 dark:text-pink-300">C$${(parseFloat(a.monto) || 0).toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-center">Sin abonos</p>';
  
  document.getElementById('contenidoDetalleLote').innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl">
        <p class="text-xs text-pink-600 dark:text-pink-400">Total Inicial</p>
        <p class="text-lg font-bold text-pink-800 dark:text-pink-300">C$${(parseFloat(lote.totalInicial) || 0).toLocaleString()}</p>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
        <p class="text-xs text-red-600 dark:text-red-400">Saldo Pendiente</p>
        <p class="text-lg font-bold text-red-800 dark:text-red-300">C$${(parseFloat(lote.saldoPendiente) || 0).toLocaleString()}</p>
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos (${lote.productos?.length || 0})</h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">${productosHtml}</div>
    </div>
    
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Historial de Abonos (${abonosLote.length})</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${abonosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleLote').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarLoteDesdeModal() {
  cerrarModal('modalDetalleLote');
  showForm('lote', loteSeleccionadoId);
}

// ==========================================
// COMPRAS - CRUD COMPLETO
// ==========================================
function agregarProductoCompra() {
  productosCompraTemp.push({
    id: Date.now() + Math.random(),
    nombre: '',
    cantidad: 1,
    precioCompra: 0,
    vendido: false
  });
  renderProductosCompra();
}

function renderProductosCompra() {
  const container = document.getElementById('productosCompraContainer');
  let total = 0;
  
  container.innerHTML = productosCompraTemp.map((prod, idx) => {
    total += (parseFloat(prod.precioCompra) || 0) * (parseInt(prod.cantidad) || 1);
    return `
      <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
        <div class="flex-1">
          <input type="text" placeholder="Nombre del producto" value="${prod.nombre}" 
            onchange="actualizarProductoCompra(${idx}, 'nombre', this.value)" 
            class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2">
          <div class="flex gap-2">
            <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1" 
              onchange="actualizarProductoCompra(${idx}, 'cantidad', parseInt(this.value)||1)" 
              class="w-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
            <input type="number" placeholder="Precio Compra" value="${prod.precioCompra || ''}" min="0" step="0.01" 
              onchange="actualizarProductoCompra(${idx}, 'precioCompra', parseFloat(this.value)||0)" 
              class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white">
          </div>
        </div>
        <button onclick="eliminarProductoCompra(${idx})" class="text-red-500 hover:text-red-700 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  document.getElementById('previewTotalCompra').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function actualizarProductoCompra(idx, campo, valor) {
  productosCompraTemp[idx][campo] = valor;
  if (campo === 'cantidad' || campo === 'precioCompra') renderProductosCompra();
}

function eliminarProductoCompra(idx) {
  productosCompraTemp.splice(idx, 1);
  renderProductosCompra();
}

function guardarCompra() {
  const editId = document.getElementById('compraEditId').value;
  const id = document.getElementById('compraId').value.trim().toUpperCase();
  const fecha = document.getElementById('compraFecha').value;
  const proveedor = document.getElementById('compraProveedor').value.trim();
  
  if (!id || !fecha) {
    alert('Completa los campos obligatorios');
    return;
  }
  
  const productosValidos = productosCompraTemp.filter(p => p.nombre && parseFloat(p.precioCompra) > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto válido');
    return;
  }
  
  if (editId) {
    const compra = compras.find(c => c.id === editId);
    if (compra) {
      compra.fecha = fecha;
      compra.proveedor = proveedor;
      compra.productos = productosValidos;
      compra.lastModified = Date.now();
      showToast('Compra actualizada');
    }
  } else {
    if (compras.some(c => c.id === id)) {
      alert('Ya existe una compra con este ID');
      return;
    }
    
    compras.push({
      id,
      fecha,
      proveedor,
      productos: productosValidos,
      lastModified: Date.now()
    });
    showToast('Compra registrada');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCompras();
}

function renderCompras() {
  const container = document.getElementById('listaCompras');
  const filtro = document.getElementById('filtroCompras').value;
  
  let comprasFiltradas = compras;
  if (filtro === 'stock') {
    comprasFiltradas = compras.filter(c => c.productos?.some(p => !p.vendido));
  } else if (filtro === 'vendidos') {
    comprasFiltradas = compras.filter(c => c.productos?.every(p => p.vendido));
  }
  
  if (comprasFiltradas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay compras</p>';
    return;
  }
  
  container.innerHTML = comprasFiltradas.map(compra => {
    const totalProductos = compra.productos?.length || 0;
    const vendidos = compra.productos?.filter(p => p.vendido).length || 0;
    const enStock = totalProductos - vendidos;
    const totalValor = compra.productos?.reduce((sum, p) =>
      sum + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0) || 0;
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-purple-200 dark:border-purple-800">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white">${compra.id}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(compra.fecha)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${compra.proveedor || 'Sin proveedor'}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p class="text-lg font-bold text-purple-600 dark:text-purple-400">C$${totalValor.toLocaleString()}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">${enStock} en stock</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">${vendidos} vendidos</span>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleCompra('${compra.id}')" class="flex-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('compra', '${compra.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleCompra(compraId) {
  const compra = compras.find(c => c.id === compraId);
  if (!compra) return;
  
  compraSeleccionadaId = compraId;
  document.getElementById('tituloDetalleCompra').textContent = `Detalle ${compra.id}`;
  
  const productosHtml = compra.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl ${p.vendido ? 'opacity-60' : ''}">
      <div>
        <p class="font-medium text-gray-800 dark:text-white ${p.vendido ? 'line-through' : ''}">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${(parseFloat(p.precioCompra) || 0).toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${((parseFloat(p.precioCompra) || 0) * parseInt(p.cantidad)).toLocaleString()}</p>
        ${p.vendido ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Vendido</span>' : '<span class="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Stock</span>'}
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  document.getElementById('contenidoDetalleCompra').innerHTML = `
    <div class="mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">Fecha: <span class="font-medium text-gray-800 dark:text-white">${formatFecha(compra.fecha)}</span></p>
      <p class="text-sm text-gray-600 dark:text-gray-400">Proveedor: <span class="font-medium text-gray-800 dark:text-white">${compra.proveedor || 'N/A'}</span></p>
    </div>
    
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos</h4>
      <div class="space-y-2 max-h-96 overflow-y-auto">${productosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleCompra').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarCompraDesdeModal() {
  cerrarModal('modalDetalleCompra');
  showForm('compra', compraSeleccionadaId);
}

// ==========================================
// VENTAS - CRUD COMPLETO CON FRECUENCIA
// ==========================================
function mostrarSelectorProductos(tipo) {
  document.getElementById('selectorProductos').classList.remove('hidden');
  document.getElementById('tituloSelectorProductos').textContent =
    tipo === 'lotes' ? 'Productos de Lotes' : 'Productos de Compras';
  
  const lista = document.getElementById('listaSelectorProductos');
  productosSeleccionados = [];
  
  if (tipo === 'lotes') {
    const productosDisponibles = [];
    lotes.forEach(lote => {
      lote.productos?.forEach((prod, idx) => {
        if (!prod.vendido) {
          productosDisponibles.push({
            ...prod,
            loteId: lote.id,
            source: 'lote',
            uniqueId: `${lote.id}_${idx}`
          });
        }
      });
    });
    
    lista.innerHTML = productosDisponibles.map(p => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600">
        <input type="checkbox" value="${p.uniqueId}" onchange="toggleProductoSeleccionado('${p.uniqueId}', '${encodeURIComponent(JSON.stringify(p)).replace(/'/g, "\\'")}')" class="w-5 h-5 text-green-600 rounded">
        <div class="flex-1">
          <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${p.loteId} | Costo: C$${(parseFloat(p.precioCarmen) || 0).toLocaleString()}</p>
        </div>
        <span class="text-sm font-bold text-gray-600 dark:text-gray-400">×${p.cantidad}</span>
      </label>
    `).join('');
    
    if (productosDisponibles.length === 0) {
      lista.innerHTML = '<p class="text-gray-500 text-center py-4">No hay productos disponibles en lotes</p>';
    }
  } else {
    const productosDisponibles = [];
    compras.forEach(compra => {
      compra.productos?.forEach((prod, idx) => {
        if (!prod.vendido) {
          productosDisponibles.push({
            ...prod,
            compraId: compra.id,
            source: 'compra',
            uniqueId: `${compra.id}_${idx}`
          });
        }
      });
    });
    
    lista.innerHTML = productosDisponibles.map(p => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600">
        <input type="checkbox" value="${p.uniqueId}" onchange="toggleProductoSeleccionado('${p.uniqueId}', '${encodeURIComponent(JSON.stringify(p)).replace(/'/g, "\\'")}')" class="w-5 h-5 text-green-600 rounded">
        <div class="flex-1">
          <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${p.compraId} | Costo: C$${(parseFloat(p.precioCompra) || 0).toLocaleString()}</p>
        </div>
        <span class="text-sm font-bold text-gray-600 dark:text-gray-400">×${p.cantidad}</span>
      </label>
    `).join('');
    
    if (productosDisponibles.length === 0) {
      lista.innerHTML = '<p class="text-gray-500 text-center py-4">No hay productos disponibles en compras</p>';
    }
  }
}

function toggleProductoSeleccionado(uniqueId, productoEncoded) {
  const idx = productosSeleccionados.findIndex(p => p.uniqueId === uniqueId);
  if (idx > -1) {
    productosSeleccionados.splice(idx, 1);
  } else {
    try {
      const p = JSON.parse(decodeURIComponent(productoEncoded));
      productosSeleccionados.push({...p, uniqueId});
    } catch(e) {
      console.error('Error parseando producto:', e);
    }
  }
}

function cerrarSelectorProductos() {
  document.getElementById('selectorProductos').classList.add('hidden');
}

function confirmarSeleccionProductos() {
  productosSeleccionados.forEach(p => {
    productosVentaTemp.push({
      id: Date.now() + Math.random(),
      nombre: p.nombre,
      cantidad: p.cantidad,
      precioCarmen: parseFloat(p.precioCarmen) || 0,
      precioCompra: parseFloat(p.precioCompra) || 0,
      precioVenta: 0,
      sourceId: p.loteId || p.compraId,
      sourceType: p.source
    });
  });
  renderProductosVenta();
  calcularVenta();
  cerrarSelectorProductos();
}

function agregarProductoVentaManual() {
  productosVentaTemp.push({
    id: Date.now() + Math.random(),
    nombre: '',
    cantidad: 1,
    precioCarmen: 0,
    precioCompra: 0,
    precioVenta: 0,
    sourceType: 'manual'
  });
  renderProductosVenta();
}

function renderProductosVenta() {
  const container = document.getElementById('productosVentaContainer');
  
  container.innerHTML = productosVentaTemp.map((prod, idx) => `
    <div class="flex gap-2 items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
      <div class="flex-1">
        <input type="text" placeholder="Producto" value="${prod.nombre}" 
          onchange="actualizarProductoVenta(${idx}, 'nombre', this.value)" 
          class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white mb-2" 
          ${prod.sourceType !== 'manual' ? 'readonly' : ''}>
        <div class="flex gap-2">
          <input type="number" placeholder="Cant" value="${prod.cantidad}" min="1" 
            onchange="actualizarProductoVenta(${idx}, 'cantidad', parseInt(this.value)||1)" 
            class="w-16 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white" 
            ${prod.sourceType !== 'manual' ? 'readonly' : ''}>
          <input type="number" placeholder="Costo" value="${prod.precioCarmen || prod.precioCompra || ''}" min="0" step="0.01" 
            class="w-24 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-gray-400" readonly>
          <input type="number" placeholder="Precio Venta" value="${prod.precioVenta || ''}" min="0" step="0.01" 
            onchange="actualizarProductoVenta(${idx}, 'precioVenta', parseFloat(this.value)||0); calcularVenta();" 
            class="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-600 dark:text-white bg-green-50 dark:bg-green-900/20">
        </div>
      </div>
      <button onclick="eliminarProductoVenta(${idx})" class="text-red-500 hover:text-red-700 p-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>
  `).join('');
  
  calcularVenta();
}

function actualizarProductoVenta(idx, campo, valor) {
  productosVentaTemp[idx][campo] = valor;
}

function eliminarProductoVenta(idx) {
  productosVentaTemp.splice(idx, 1);
  renderProductosVenta();
}

function calcularVenta() {
  const total = productosVentaTemp.reduce((sum, p) =>
    sum + ((parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1)), 0);
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const tipoPago = document.getElementById('ventaTipoPago').value;
  
  if (tipoPago === 'cash') {
    document.getElementById('previewTotalVenta').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
    document.getElementById('previewSaldoVenta').textContent = `C$0.00`;
    document.getElementById('previewCuotaVenta').textContent = `C$0.00`;
    return;
  }
  
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  const saldo = Math.max(0, total - prima);
  const cuota = saldo > 0 && meses > 0 ? saldo / meses : 0;
  
  document.getElementById('previewTotalVenta').textContent = `C$${total.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('previewSaldoVenta').textContent = `C$${saldo.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
  document.getElementById('previewCuotaVenta').textContent = `C$${cuota.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
}

function calcularProximaFecha(fechaBase, frecuencia, fechasPersonalizadas = []) {
  const fecha = new Date(fechaBase);
  const hoy = new Date();
  
  switch(frecuencia) {
    case 'semanal':
      fecha.setDate(fecha.getDate() + 7);
      break;
    case 'quincenal':
      fecha.setDate(fecha.getDate() + 15);
      break;
    case 'personalizado':
      if (fechasPersonalizadas.length > 0) {
        const diaActual = fecha.getDate();
        const mesActual = fecha.getMonth();
        const añoActual = fecha.getFullYear();
        
        // Ordenar fechas
        const fechasOrdenadas = [...fechasPersonalizadas].sort((a, b) => a - b);
        
        // Buscar la siguiente fecha
        let siguienteFecha = fechasOrdenadas.find(d => d > diaActual);
        
        if (siguienteFecha) {
          fecha.setDate(siguienteFecha);
        } else {
          // Ir al primer día del mes siguiente
          fecha.setMonth(mesActual + 1);
          fecha.setDate(fechasOrdenadas[0]);
        }
      } else {
        fecha.setMonth(fecha.getMonth() + 1);
      }
      break;
    case 'mensual':
    default:
      fecha.setMonth(fecha.getMonth() + 1);
      break;
  }
  
  return fecha;
}

function guardarVenta() {
  const editId = document.getElementById('ventaEditId').value;
  const id = document.getElementById('ventaId').value.trim().toUpperCase();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const telefono = document.getElementById('ventaTelefono').value.trim();
  const fecha = document.getElementById('ventaFecha').value;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const tipoPago = document.getElementById('ventaTipoPago').value;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 12;
  const frecuencia = document.getElementById('ventaFrecuencia').value;
  const fechasPersonalizadasStr = document.getElementById('ventaFechasPersonalizadas').value;
  
  if (!id || !cliente || !fecha) {
    alert('Completa los campos obligatorios');
    return;
  }
  
  const productosValidos = productosVentaTemp.filter(p => p.nombre && parseFloat(p.precioVenta) > 0);
  if (productosValidos.length === 0) {
    alert('Agrega al menos un producto con precio de venta');
    return;
  }
  
  const precioTotal = productosValidos.reduce((sum, p) =>
    sum + (parseFloat(p.precioVenta) * parseInt(p.cantidad)), 0);
  
  if (tipoPago === 'credito' && prima > precioTotal) {
    alert('La prima no puede ser mayor que el total');
    return;
  }
  
  // Procesar fechas personalizadas
  let fechasPersonalizadas = [];
  if (frecuencia === 'personalizado' && fechasPersonalizadasStr) {
    fechasPersonalizadas = fechasPersonalizadasStr.split(',').map(f => parseInt(f.trim())).filter(f => !isNaN(f) && f >= 1 && f <= 31);
  }
  
  if (editId) {
    const ventaAnterior = ventas.find(v => v.id === editId);
    if (ventaAnterior) {
      ventaAnterior.productos?.forEach(pv => {
        if (pv.sourceType === 'lote' && pv.sourceId) {
          const lote = lotes.find(l => l.id === pv.sourceId);
          if (lote) {
            const prod = lote.productos?.find(p => p.nombre === pv.nombre && p.vendido);
            if (prod) prod.vendido = false;
          }
        } else if (pv.sourceType === 'compra' && pv.sourceId) {
          const compra = compras.find(c => c.id === pv.sourceId);
          if (compra) {
            const prod = compra.productos?.find(p => p.nombre === pv.nombre && p.vendido);
            if (prod) prod.vendido = false;
          }
        }
      });
    }
  }
  
  productosValidos.forEach(pv => {
    if (pv.sourceType === 'lote' && pv.sourceId) {
      const lote = lotes.find(l => l.id === pv.sourceId);
      if (lote) {
        const prod = lote.productos?.find(p => p.nombre === pv.nombre && !p.vendido);
        if (prod) prod.vendido = true;
      }
    } else if (pv.sourceType === 'compra' && pv.sourceId) {
      const compra = compras.find(c => c.id === pv.sourceId);
      if (compra) {
        const prod = compra.productos?.find(p => p.nombre === pv.nombre && !p.vendido);
        if (prod) prod.vendido = true;
      }
    }
  });
  
  let saldo, cuotaMensual, estado, proximaFecha;
  
  if (tipoPago === 'cash') {
    saldo = 0;
    cuotaMensual = 0;
    estado = 'PAGADO';
    proximaFecha = fecha;
  } else {
    saldo = precioTotal - prima;
    cuotaMensual = saldo > 0 && meses > 0 ? saldo / meses : 0;
    estado = saldo <= 0 ? 'PAGADO' : 'PENDIENTE';
    const fechaBase = new Date(fecha);
    const fechaProx = calcularProximaFecha(fechaBase, frecuencia, fechasPersonalizadas);
    proximaFecha = fechaProx.toISOString().split('T')[0];
  }
  
  if (editId) {
    const venta = ventas.find(v => v.id === editId);
    if (venta) {
      const reactivar = document.getElementById('reactivarVenta').checked;
      
      if (reactivar && venta.estado === 'PAGADO') {
        const nuevoId = id + '_EXT';
        
        ventas.push({
          id: nuevoId,
          cliente,
          telefono,
          fecha,
          productos: productosValidos,
          precioTotal,
          prima,
          saldo,
          meses,
          cuotaMensual,
          pagado: prima,
          estado,
          proximaFechaCobro: proximaFecha,
          tipoPago,
          frecuenciaPago: frecuencia,
          fechasPersonalizadas,
          ventaOriginal: editId,
          lastModified: Date.now()
        });
        showToast('Nueva venta creada para cliente existente');
      } else {
        venta.cliente = cliente;
        venta.telefono = telefono;
        venta.fecha = fecha;
        venta.productos = productosValidos;
        venta.precioTotal = precioTotal;
        venta.prima = prima;
        venta.meses = meses;
        venta.tipoPago = tipoPago;
        venta.frecuenciaPago = frecuencia;
        venta.fechasPersonalizadas = fechasPersonalizadas;
        venta.saldo = tipoPago === 'cash' ? 0 : (precioTotal - venta.pagado);
        venta.cuotaMensual = cuotaMensual;
        venta.estado = tipoPago === 'cash' ? 'PAGADO' : (venta.saldo <= 0 ? 'PAGADO' : 'PENDIENTE');
        venta.proximaFechaCobro = proximaFecha;
        venta.lastModified = Date.now();
        showToast('Venta actualizada');
      }
    }
  } else {
    if (ventas.some(v => v.id === id)) {
      alert('Ya existe una venta con este ID');
      return;
    }
    
    ventas.push({
      id,
      cliente,
      telefono,
      fecha,
      productos: productosValidos,
      precioTotal,
      prima,
      saldo,
      meses,
      cuotaMensual,
      pagado: prima,
      estado,
      proximaFechaCobro: proximaFecha,
      tipoPago,
      frecuenciaPago: frecuencia,
      fechasPersonalizadas,
      lastModified: Date.now()
    });
    showToast('Venta registrada exitosamente');
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderVentas();
  renderRecordatorios();
}

function renderVentas() {
  const container = document.getElementById('listaVentas');
  const filtro = document.getElementById('filtroVentas').value;
  
  let ventasFiltradas = ventas;
  if (filtro === 'pendientes') ventasFiltradas = ventas.filter(v => v.estado === 'PENDIENTE');
  else if (filtro === 'pagados') ventasFiltradas = ventas.filter(v => v.estado === 'PAGADO');
  
  if (ventasFiltradas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay ventas</p>';
    return;
  }
  
  const ventasOrdenadas = [...ventasFiltradas].sort((a, b) =>
    new Date(a.proximaFechaCobro) - new Date(b.proximaFechaCobro));
  
  container.innerHTML = ventasOrdenadas.map(venta => {
    const isPending = venta.estado === 'PENDIENTE';
    const progress = venta.precioTotal > 0 ?
      ((venta.precioTotal - venta.saldo) / venta.precioTotal * 100) : 0;
    const proximoCobro = calcularProximaFechaCobro(venta);
    const diasRestantes = Math.ceil((proximoCobro - new Date()) / (1000 * 60 * 60 * 24));
    
    const frecuenciaLabel = venta.frecuenciaPago === 'semanal' ? ' • Semanal' : 
                           venta.frecuenciaPago === 'quincenal' ? ' • Quincenal' : 
                           venta.frecuenciaPago === 'personalizado' ? ' • Personalizado' : '';
    
    const tipoPagoLabel = venta.tipoPago === 'cash' ? ' 💵 Cash' : '';
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border ${isPending ? 'border-orange-200 dark:border-orange-800' : 'border-green-200 dark:border-green-800'}">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ${venta.cliente}
              ${!isPending ? '<span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Pagado</span>' : ''}
              ${venta.ventaOriginal ? '<span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Extensión</span>' : ''}
              ${tipoPagoLabel ? `<span class="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full">${tipoPagoLabel}</span>` : ''}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${venta.id} | ${venta.telefono || 'Sin teléfono'}</p>
            ${isPending && venta.tipoPago !== 'cash' ? `<p class="text-xs ${diasRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
              Próximo cobro: ${formatFecha(venta.proximaFechaCobro)} ${diasRestantes < 0 ? '(Atrasado)' : ''}${frecuenciaLabel}
            </p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="text-xl font-bold ${isPending ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}">
              C$${(parseFloat(venta.saldo) || 0).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-600 dark:text-gray-400">Progreso: ${progress.toFixed(1)}%</span>
            <span class="text-gray-600 dark:text-gray-400">Cuota: C$${(parseFloat(venta.cuotaMensual) || 0).toLocaleString()}</span>
          </div>
          <div class="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${isPending ? 'bg-orange-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="verDetalleVenta('${venta.id}')" class="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-2 rounded-xl text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50">
            Ver Detalle
          </button>
          <button onclick="showForm('venta', '${venta.id}')" class="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Editar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function verDetalleVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  ventaSeleccionadaId = ventaId;
  document.getElementById('tituloDetalleVenta').textContent = venta.cliente;
  
  const productosHtml = venta.productos?.map(p => `
    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
      <div>
        <p class="font-medium text-gray-800 dark:text-white">${p.nombre}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${p.cantidad} × C$${(parseFloat(p.precioVenta) || 0).toLocaleString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-gray-800 dark:text-white">C$${((parseFloat(p.precioVenta) || 0) * parseInt(p.cantidad)).toLocaleString()}</p>
        <p class="text-xs text-green-600">Costo: C$${(parseFloat(p.precioCarmen) || parseFloat(p.precioCompra) || 0).toLocaleString()}</p>
      </div>
    </div>
  `).join('') || '<p class="text-gray-500 text-center">Sin productos</p>';
  
  const frecuenciaText = venta.frecuenciaPago === 'semanal' ? 'Semanal (cada 7 días)' : 
                        venta.frecuenciaPago === 'quincenal' ? 'Quincenal (cada 15 días)' : 
                        venta.frecuenciaPago === 'personalizado' ? 'Personalizado: días ' + (venta.fechasPersonalizadas?.join(', ') || '') : 
                        'Mensual';
  
  const tipoPagoText = venta.tipoPago === 'cash' ? 'Cash/Contado' : 'Crédito';
  
  const cobrosVenta = cobros.filter(c => c.ventaId === ventaId);
  const cobrosHtml = cobrosVenta.length > 0 ? cobrosVenta.map(c => `
    <div class="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40" onclick="verDetalleCobro('${c.id}')">
      <div>
        <p class="font-medium text-green-800 dark:text-green-300">${formatFecha(c.fecha)}</p>
        <p class="text-xs text-green-600 dark:text-green-400">${c.metodo} ${c.notas ? '- ' + c.notas : ''}</p>
      </div>
      <p class="font-bold text-green-800 dark:text-green-300">C$${(parseFloat(c.monto) || 0).toLocaleString()}</p>
    </div>
  `).join('') : '<p class="text-gray-500 text-center">Sin cobros registrados</p>';
  
  document.getElementById('contenidoDetalleVenta').innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
        <p class="text-xs text-green-600 dark:text-green-400">Total Venta</p>
        <p class="text-lg font-bold text-green-800 dark:text-green-300">C$${(parseFloat(venta.precioTotal) || 0).toLocaleString()}</p>
      </div>
      <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
        <p class="text-xs text-orange-600 dark:text-orange-400">Saldo Pendiente</p>
        <p class="text-lg font-bold text-orange-800 dark:text-orange-300">C$${(parseFloat(venta.saldo) || 0).toLocaleString()}</p>
      </div>
    </div>
    
    <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl mb-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Información del Crédito</p>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-600 dark:text-gray-400">Tipo:</span> <span class="font-medium text-gray-800 dark:text-white">${tipoPagoText}</span></div>
        <div><span class="text-gray-600 dark:text-gray-400">Frecuencia:</span> <span class="font-medium text-gray-800 dark:text-white">${frecuenciaText}</span></div>
        ${venta.tipoPago !== 'cash' ? `
        <div><span class="text-gray-600 dark:text-gray-400">Meses:</span> <span class="font-medium text-gray-800 dark:text-white">${venta.meses}</span></div>
        <div><span class="text-gray-600 dark:text-gray-400">Cuota:</span> <span class="font-medium text-gray-800 dark:text-white">C$${(parseFloat(venta.cuotaMensual) || 0).toLocaleString()}</span></div>
        ` : ''}
        <div><span class="text-gray-600 dark:text-gray-400">Prima:</span> <span class="font-medium text-gray-800 dark:text-white">C$${(parseFloat(venta.prima) || 0).toLocaleString()}</span></div>
        ${venta.tipoPago !== 'cash' ? `<div><span class="text-gray-600 dark:text-gray-400">Próximo:</span> <span class="font-medium text-gray-800 dark:text-white">${formatFecha(venta.proximaFechaCobro)}</span></div>` : ''}
      </div>
    </div>
    
    <div class="mb-4">
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Productos Vendidos</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${productosHtml}</div>
    </div>
    
    <div>
      <h4 class="font-bold text-gray-800 dark:text-white mb-2">Historial de Cobros (${cobrosVenta.length})</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${cobrosHtml}</div>
    </div>
  `;
  
  document.getElementById('modalDetalleVenta').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarVentaDesdeModal() {
  cerrarModal('modalDetalleVenta');
  showForm('venta', ventaSeleccionadaId);
}

function registrarCobroDesdeVenta() {
  cerrarModal('modalDetalleVenta');
  showForm('cobro');
  setTimeout(() => {
    seleccionarVentaCobroDirecto(ventaSeleccionadaId);
  }, 100);
}

// ==========================================
// PDF Y WHATSAPP - FORMATOS ESTANDARIZADOS
// ==========================================
function generarMensajeRecibo(datos, tipo) {
  // Formato estandarizado para ambos (PDF y WhatsApp)
  let mensaje = `🦋 *ELECTRODOMÉSTICOS Y VARIEDADES KAREN* 🦋\n\n`;
  
  if (tipo === 'venta') {
    mensaje += `📋 *RECIBO DE VENTA*\n\n`;
    mensaje += `*ID:* ${datos.id}\n`;
    mensaje += `*Cliente:* ${datos.cliente}\n`;
    mensaje += `*Fecha:* ${formatFecha(datos.fecha)}\n`;
    mensaje += `*Teléfono:* ${datos.telefono || 'N/A'}\n\n`;
    mensaje += `*PRODUCTOS:*\n`;
    
    datos.productos.forEach((p, i) => {
      const subtotal = (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
      mensaje += `${i+1}. ${p.nombre} x${p.cantidad} - C$${subtotal.toLocaleString()}\n`;
    });
    
    const tipoPagoText = datos.tipoPago === 'cash' ? 'Cash/Contado' : 'Crédito';
    const frecuenciaText = datos.frecuenciaPago === 'semanal' ? 'Semanal' : 
                          datos.frecuenciaPago === 'quincenal' ? 'Quincenal' : 
                          datos.frecuenciaPago === 'personalizado' ? 'Personalizado' : 'Mensual';
    
    mensaje += `\n*TOTAL:* C$${(parseFloat(datos.precioTotal) || 0).toLocaleString()}`;
    mensaje += `\n*TIPO DE PAGO:* ${tipoPagoText}`;
    
    if (datos.tipoPago !== 'cash') {
      mensaje += `\n*PRIMA:* C$${(parseFloat(datos.prima) || 0).toLocaleString()}`;
      mensaje += `\n*SALDO:* C$${(parseFloat(datos.saldo) || 0).toLocaleString()}`;
      mensaje += `\n*CUOTA (${frecuenciaText}):* C$${(parseFloat(datos.cuotaMensual) || 0).toLocaleString()}`;
      mensaje += `\n*MESES:* ${datos.meses}`;
      if (datos.frecuenciaPago === 'personalizado' && datos.fechasPersonalizadas) {
        mensaje += `\n*FECHAS DE PAGO:* ${datos.fechasPersonalizadas.join(', ')} de cada mes`;
      }
    }
    
    mensaje += `\n\n🌹 ¡Gracias por su compra! 🌹`;
  } else if (tipo === 'abono') {
    const lote = datos.lote || {};
    mensaje += `📋 *RECIBO DE ABONO*\n\n`;
    mensaje += `*ID Abono:* ${datos.id}\n`;
    mensaje += `*Lote:* ${datos.loteId}\n`;
    mensaje += `*Fecha:* ${formatFecha(datos.fecha)}\n`;
    mensaje += `*Método:* ${datos.metodo}\n\n`;
    mensaje += `💰 *MONTO ABONADO: C$${(parseFloat(datos.monto) || 0).toLocaleString()}*\n\n`;
    mensaje += `*Estado del Lote:*\n`;
    mensaje += `Total: C$${(parseFloat(lote.totalInicial) || 0).toLocaleString()}\n`;
    mensaje += `Abonado: C$${(parseFloat(lote.abonado) || 0).toLocaleString()}\n`;
    mensaje += `Saldo: C$${(parseFloat(lote.saldoPendiente) || 0).toLocaleString()}\n`;
    
    if (datos.notas) {
      mensaje += `\n*Notas:* ${datos.notas}`;
    }
    
    mensaje += `\n\n❤️ ¡Gracias por darme crédito! ❤️`;
  } else if (tipo === 'cobro') {
    const venta = datos.venta || {};
    mensaje += `📋 *RECIBO DE COBRO*\n\n`;
    mensaje += `*ID Cobro:* ${datos.id}\n`;
    mensaje += `*Venta:* ${datos.ventaId}\n`;
    mensaje += `*Cliente:* ${venta.cliente || 'N/A'}\n`;
    mensaje += `*Fecha:* ${formatFecha(datos.fecha)}\n`;
    mensaje += `*Método:* ${datos.metodo}\n\n`;
    mensaje += `💚 *MONTO COBRADO: C$${(parseFloat(datos.monto) || 0).toLocaleString()}*\n\n`;
    mensaje += `*Estado de la Cuenta:*\n`;
    mensaje += `Total Venta: C$${(parseFloat(venta.precioTotal) || 0).toLocaleString()}\n`;
    mensaje += `Total Pagado: C$${(parseFloat(venta.pagado) || 0).toLocaleString()}\n`;
    mensaje += `Saldo Pendiente: C$${(parseFloat(venta.saldo) || 0).toLocaleString()}\n`;
    
    if (datos.notas) {
      mensaje += `\n*Notas:* ${datos.notas}`;
    }
    
    mensaje += `\n\n🌹 ¡Gracias por su pago! 🌹`;
  }
  
  mensaje += `\n\n_ELECTRODOMÉSTICOS Y VARIEDADES KAREN_`;
  return mensaje;
}

async function generarPDFVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) {
    showToast('❌ Venta no encontrada');
    return;
  }
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración de colores según tema
    const colorPrimario = [236, 72, 153]; // Rosa
    const colorTexto = [0, 0, 0];
    
    doc.setFontSize(18);
    doc.setTextColor(...colorPrimario);
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 20, null, null, 'center');
    
    doc.setFontSize(10);
    doc.setTextColor(...colorTexto);
    doc.text('Recibo de Venta', 105, 28, null, null, 'center');
    
    doc.setFontSize(12);
    let y = 45;
    doc.text(`ID: ${venta.id}`, 20, y);
    y += 10;
    doc.text(`Cliente: ${venta.cliente}`, 20, y);
    y += 10;
    doc.text(`Fecha: ${formatFecha(venta.fecha)}`, 20, y);
    y += 10;
    doc.text(`Teléfono: ${venta.telefono || 'N/A'}`, 20, y);
    y += 15;
    
    doc.text('PRODUCTOS:', 20, y);
    y += 10;
    
    venta.productos.forEach((p, i) => {
      const subtotal = (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
      doc.text(`${i+1}. ${p.nombre} x${p.cantidad} - C$${subtotal.toLocaleString()}`, 25, y);
      y += 8;
    });
    
    y += 5;
    doc.line(20, y, 190, y);
    y += 10;
    
    const tipoPagoText = venta.tipoPago === 'cash' ? 'Cash/Contado' : 'Crédito';
    doc.text(`Tipo de Pago: ${tipoPagoText}`, 20, y);
    y += 10;
    doc.text(`Total: C$${(venta.precioTotal).toLocaleString()}`, 20, y);
    
    if (venta.tipoPago !== 'cash') {
      y += 10;
      doc.text(`Prima: C$${(venta.prima).toLocaleString()}`, 20, y);
      y += 10;
      doc.text(`Saldo: C$${(venta.saldo).toLocaleString()}`, 20, y);
      y += 10;
      doc.text(`Cuota: C$${(venta.cuotaMensual).toLocaleString()}`, 20, y);
      y += 10;
      doc.text(`Meses: ${venta.meses}`, 20, y);
      
      const frecuenciaText = venta.frecuenciaPago === 'semanal' ? 'Semanal' : 
                            venta.frecuenciaPago === 'quincenal' ? 'Quincenal' : 
                            venta.frecuenciaPago === 'personalizado' ? 'Personalizado' : 'Mensual';
      y += 10;
      doc.text(`Frecuencia: ${frecuenciaText}`, 20, y);
      
      if (venta.frecuenciaPago === 'personalizado' && venta.fechasPersonalizadas) {
        y += 10;
        doc.text(`Fechas: ${venta.fechasPersonalizadas.join(', ')} de cada mes`, 20, y);
      }
    }
    
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(...colorPrimario);
    doc.text('¡Gracias por su compra!', 105, y, null, null, 'center');
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, y + 8, null, null, 'center');
    
    doc.save(`Recibo_Venta_${venta.id}_${venta.cliente.replace(/\s+/g, '_')}.pdf`);
    showToast('✅ PDF generado');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('❌ Error al generar PDF');
  }
}

function enviarWhatsAppVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) {
    showToast('❌ Venta no encontrada');
    return;
  }
  
  const mensaje = generarMensajeRecibo(venta, 'venta');
  
  const telefono = venta.telefono?.replace(/[^0-9]/g, '') || '';
  const url = telefono 
    ? `https://wa.me/505${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
}

async function generarPDFAbono(abonoId) {
  const abono = abonos.find(a => a.id === abonoId);
  if (!abono) {
    showToast('❌ Abono no encontrado');
    return;
  }
  
  const lote = lotes.find(l => l.id === abono.loteId);
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(236, 72, 153);
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 20, null, null, 'center');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Recibo de Abono a Lote', 105, 28, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`ID Abono: ${abono.id}`, 20, 45);
    doc.text(`Lote: ${abono.loteId}`, 20, 55);
    doc.text(`Fecha: ${formatFecha(abono.fecha)}`, 20, 65);
    doc.text(`Método: ${abono.metodo}`, 20, 75);
    
    doc.setFontSize(16);
    doc.setTextColor(236, 72, 153);
    doc.text(`MONTO ABONADO: C$${(parseFloat(abono.monto) || 0).toLocaleString()}`, 105, 95, null, null, 'center');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Lote: C$${(parseFloat(lote?.totalInicial) || 0).toLocaleString()}`, 20, 115);
    doc.text(`Total Abonado: C$${(parseFloat(lote?.abonado) || 0).toLocaleString()}`, 20, 125);
    doc.text(`Saldo Pendiente: C$${(parseFloat(lote?.saldoPendiente) || 0).toLocaleString()}`, 20, 135);
    
    if (abono.notas) {
      doc.text(`Notas: ${abono.notas}`, 20, 150);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(236, 72, 153);
    doc.text('¡Gracias por su abono!', 105, 175, null, null, 'center');
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 183, null, null, 'center');
    
    doc.save(`Recibo_Abono_${abono.id}_Lote${abono.loteId}.pdf`);
    showToast('✅ PDF de abono generado');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('❌ Error al generar PDF');
  }
}

function enviarWhatsAppAbono(abonoId) {
  const abono = abonos.find(a => a.id === abonoId);
  if (!abono) {
    showToast('❌ Abono no encontrado');
    return;
  }
  
  const lote = lotes.find(l => l.id === abono.loteId);
  const mensaje = generarMensajeRecibo({...abono, lote}, 'abono');
  
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
}

async function generarPDFCobro(cobroId) {
  const cobro = cobros.find(c => c.id === cobroId);
  if (!cobro) {
    showToast('❌ Cobro no encontrado');
    return;
  }
  
  const venta = ventas.find(v => v.id === cobro.ventaId);
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(236, 72, 153);
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 20, null, null, 'center');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Recibo de Cobro', 105, 28, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`ID Cobro: ${cobro.id}`, 20, 45);
    doc.text(`Venta: ${cobro.ventaId}`, 20, 55);
    doc.text(`Cliente: ${venta?.cliente || 'N/A'}`, 20, 65);
    doc.text(`Fecha: ${formatFecha(cobro.fecha)}`, 20, 75);
    doc.text(`Método: ${cobro.metodo}`, 20, 85);
    
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94);
    doc.text(`MONTO COBRADO: C$${(parseFloat(cobro.monto) || 0).toLocaleString()}`, 105, 105, null, null, 'center');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Venta: C$${(parseFloat(venta?.precioTotal) || 0).toLocaleString()}`, 20, 125);
    doc.text(`Total Pagado: C$${(parseFloat(venta?.pagado) || 0).toLocaleString()}`, 20, 135);
    doc.text(`Saldo Pendiente: C$${(parseFloat(venta?.saldo) || 0).toLocaleString()}`, 20, 145);
    
    if (cobro.notas) {
      doc.text(`Notas: ${cobro.notas}`, 20, 160);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(236, 72, 153);
    doc.text('¡Gracias por su pago!', 105, 185, null, null, 'center');
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 193, null, null, 'center');
    
    doc.save(`Recibo_Cobro_${cobro.id}_Venta${cobro.ventaId}.pdf`);
    showToast('✅ PDF de cobro generado');
  } catch (error) {
    console.error('Error generando PDF:', error);
    showToast('❌ Error al generar PDF');
  }
}

function enviarWhatsAppCobro(cobroId) {
  const cobro = cobros.find(c => c.id === cobroId);
  if (!cobro) {
    showToast('❌ Cobro no encontrado');
    return;
  }
  
  const venta = ventas.find(v => v.id === cobro.ventaId);
  const mensaje = generarMensajeRecibo({...cobro, venta}, 'cobro');
  
  const telefono = venta?.telefono?.replace(/[^0-9]/g, '') || '';
  const url = telefono 
    ? `https://wa.me/505${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
}

// ==========================================
// VER DETALLE - ABONOS Y COBROS
// ==========================================
function verDetalleAbono(abonoId) {
  const abono = abonos.find(a => a.id === abonoId);
  if (!abono) return;
  
  abonoSeleccionadoId = abonoId;
  const lote = lotes.find(l => l.id === abono.loteId);
  
  document.getElementById('tituloDetalleAbono').textContent = `Abono ${abono.id}`;
  
  document.getElementById('contenidoDetalleAbono').innerHTML = `
    <div class="space-y-3">
      <div class="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-xl">
        <p class="text-sm text-pink-600 dark:text-pink-400">Lote</p>
        <p class="font-bold text-gray-800 dark:text-white">${abono.loteId}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
          <p class="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
          <p class="font-medium text-gray-800 dark:text-white">${formatFecha(abono.fecha)}</p>
        </div>
        <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
          <p class="text-xs text-gray-500 dark:text-gray-400">Método</p>
          <p class="font-medium text-gray-800 dark:text-white">${abono.metodo}</p>
        </div>
      </div>
      <div class="bg-pink-100 dark:bg-pink-900/40 p-4 rounded-xl text-center">
        <p class="text-xs text-pink-600 dark:text-pink-400">Monto Abonado</p>
        <p class="text-2xl font-bold text-pink-700 dark:text-pink-300">C$${(parseFloat(abono.monto) || 0).toLocaleString()}</p>
      </div>
      ${abono.notas ? `<div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl"><p class="text-xs text-gray-500 dark:text-gray-400">Notas</p><p class="text-sm text-gray-800 dark:text-white">${abono.notas}</p></div>` : ''}
      <div class="border-t pt-3">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Estado del Lote</p>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Total:</span>
            <span class="font-medium">C$${(parseFloat(lote?.totalInicial) || 0).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Abonado:</span>
            <span class="font-medium text-green-600">C$${(parseFloat(lote?.abonado) || 0).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Saldo:</span>
            <span class="font-medium text-red-600">C$${(parseFloat(lote?.saldoPendiente) || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalDetalleAbono').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function verDetalleCobro(cobroId) {
  const cobro = cobros.find(c => c.id === cobroId);
  if (!cobro) return;
  
  cobroSeleccionadoId = cobroId;
  const venta = ventas.find(v => v.id === cobro.ventaId);
  
  document.getElementById('tituloDetalleCobro').textContent = `Cobro ${cobro.id}`;
  
  const frecuenciaText = venta?.frecuenciaPago === 'semanal' ? 'Semanal' : 
                        venta?.frecuenciaPago === 'quincenal' ? 'Quincenal' : 
                        venta?.frecuenciaPago === 'personalizado' ? 'Personalizado' : 'Mensual';
  
  document.getElementById('contenidoDetalleCobro').innerHTML = `
    <div class="space-y-3">
      <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
        <p class="text-sm text-green-600 dark:text-green-400">Cliente</p>
        <p class="font-bold text-gray-800 dark:text-white">${venta?.cliente || 'N/A'}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
          <p class="text-xs text-gray-500 dark:text-gray-400">Venta</p>
          <p class="font-medium text-gray-800 dark:text-white">${cobro.ventaId}</p>
        </div>
        <div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
          <p class="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
          <p class="font-medium text-gray-800 dark:text-white">${formatFecha(cobro.fecha)}</p>
        </div>
      </div>
      <div class="bg-green-100 dark:bg-green-900/40 p-4 rounded-xl text-center">
        <p class="text-xs text-green-600 dark:text-green-400">Monto Cobrado</p>
        <p class="text-2xl font-bold text-green-700 dark:text-green-300">C$${(parseFloat(cobro.monto) || 0).toLocaleString()}</p>
      </div>
      ${cobro.notas ? `<div class="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl"><p class="text-xs text-gray-500 dark:text-gray-400">Notas</p><p class="text-sm text-gray-800 dark:text-white">${cobro.notas}</p></div>` : ''}
      <div class="border-t pt-3">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Estado de la Venta</p>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Total:</span>
            <span class="font-medium">C$${(parseFloat(venta?.precioTotal) || 0).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Pagado:</span>
            <span class="font-medium text-green-600">C$${(parseFloat(venta?.pagado) || 0).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Saldo:</span>
            <span class="font-medium text-orange-600">C$${(parseFloat(venta?.saldo) || 0).toLocaleString()}</span>
          </div>
          ${venta?.tipoPago !== 'cash' ? `
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Frecuencia:</span>
            <span class="font-medium">${frecuenciaText}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalDetalleCobro').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

function editarAbonoDesdeModal() {
  cerrarModal('modalDetalleAbono');
  editarAbono(abonoSeleccionadoId);
}

function editarCobroDesdeModal() {
  cerrarModal('modalDetalleCobro');
  editarCobro(cobroSeleccionadoId);
}

// ==========================================
// ABONOS - CRUD COMPLETO CON EDICIÓN INDIVIDUAL
// ==========================================
function cargarSelectLotes() {
  const select = document.getElementById('abonoLoteId');
  select.innerHTML = '<option value="">Seleccione un lote...</option>';
  lotes.filter(l => l.estado === 'PENDIENTE').forEach(l => {
    select.innerHTML += `<option value="${l.id}">${l.id} - Saldo: C$${(parseFloat(l.saldoPendiente) || 0).toLocaleString()}</option>`;
  });
}

function mostrarInfoLoteAbono() {
  const loteId = document.getElementById('abonoLoteId').value;
  const infoDiv = document.getElementById('infoLoteAbono');
  
  if (!loteId) {
    infoDiv.classList.add('hidden');
    return;
  }
  
  const lote = lotes.find(l => l.id === loteId);
  if (lote) {
    infoDiv.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Total:</span>
          <span class="font-bold text-pink-800 dark:text-pink-300">C$${(parseFloat(lote.totalInicial) || 0).toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Abonado:</span>
          <span class="font-bold text-green-600 dark:text-green-400">C$${(parseFloat(lote.abonado) || 0).toLocaleString()}</span>
        </div>
        <div class="flex justify-between border-t border-pink-200 dark:border-pink-800 pt-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo:</span>
          <span class="font-bold text-red-600 dark:text-red-400">C$${(parseFloat(lote.saldoPendiente) || 0).toLocaleString()}</span>
        </div>
      </div>
    `;
    infoDiv.classList.remove('hidden');
  }
}

function editarAbono(abonoId) {
  const abono = abonos.find(a => a.id === abonoId);
  if (!abono) return;
  
  abonoSeleccionadoId = abonoId;
  document.getElementById('formAbono').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
  document.getElementById('tituloFormAbono').textContent = 'Editar Abono';
  document.getElementById('abonoEditId').value = abonoId;
  
  cargarSelectLotes();
  document.getElementById('abonoLoteId').value = abono.loteId;
  mostrarInfoLoteAbono();
  
  document.getElementById('abonoFecha').value = abono.fecha;
  document.getElementById('abonoMonto').value = abono.monto;
  document.getElementById('abonoMetodo').value = abono.metodo;
  document.getElementById('abonoNotas').value = abono.notas || '';
  document.getElementById('btnEliminarAbono').classList.remove('hidden');
}

function guardarAbono() {
  const editId = document.getElementById('abonoEditId').value;
  const loteId = document.getElementById('abonoLoteId').value;
  const fecha = document.getElementById('abonoFecha').value;
  const monto = parseFloat(document.getElementById('abonoMonto').value) || 0;
  const metodo = document.getElementById('abonoMetodo').value;
  const notas = document.getElementById('abonoNotas').value.trim();
  
  if (!loteId || !fecha || monto <= 0) {
    alert('Complete todos los campos obligatorios');
    return;
  }
  
  const lote = lotes.find(l => l.id === loteId);
  if (!lote) return;
  
  if (editId) {
    // EDITAR ABONO EXISTENTE
    const abono = abonos.find(a => a.id === editId);
    if (abono) {
      // Revertir el abono anterior del lote
      lote.abonado = Math.max(0, (parseFloat(lote.abonado) || 0) - (parseFloat(abono.monto) || 0));
      lote.saldoPendiente = (parseFloat(lote.totalInicial) || 0) - (parseFloat(lote.abonado) || 0);
      
      // Validar nuevo monto
      if (monto > lote.saldoPendiente) {
        // Restaurar el abono anterior
        lote.abonado = (parseFloat(lote.abonado) || 0) + (parseFloat(abono.monto) || 0);
        lote.saldoPendiente = (parseFloat(lote.totalInicial) || 0) - (parseFloat(lote.abonado) || 0);
        alert(`El monto no puede superar el saldo disponible (C$${lote.saldoPendiente.toLocaleString()})`);
        return;
      }
      
      // Actualizar abono
      abono.loteId = loteId;
      abono.fecha = fecha;
      abono.monto = monto;
      abono.metodo = metodo;
      abono.notas = notas;
      abono.saldoDespues = (parseFloat(lote.saldoPendiente) || 0) - monto;
      abono.lastModified = Date.now();
      
      // Aplicar nuevo abono al lote
      lote.abonado = (parseFloat(lote.abonado) || 0) + monto;
      lote.saldoPendiente = (parseFloat(lote.totalInicial) || 0) - (parseFloat(lote.abonado) || 0);
      
      if (lote.saldoPendiente <= 0) {
        lote.estado = 'PAGADO';
        lote.fechaPagoTotal = fecha;
      } else {
        lote.estado = 'PENDIENTE';
        delete lote.fechaPagoTotal;
      }
      lote.lastModified = Date.now();
      showToast('Abono actualizado correctamente');
    }
  } else {
    // NUEVO ABONO
    if (monto > lote.saldoPendiente) {
      alert(`El monto no puede superar el saldo (C$${(parseFloat(lote.saldoPendiente) || 0).toLocaleString()})`);
      return;
    }
    
    abonos.push({
      id: Date.now().toString(),
      loteId,
      fecha,
      monto,
      metodo,
      notas,
      saldoDespues: (parseFloat(lote.saldoPendiente) || 0) - monto,
      lastModified: Date.now()
    });
    
    lote.abonado = (parseFloat(lote.abonado) || 0) + monto;
    lote.saldoPendiente = (parseFloat(lote.saldoPendiente) || 0) - monto;
    if (lote.saldoPendiente <= 0) {
      lote.estado = 'PAGADO';
      lote.fechaPagoTotal = fecha;
    }
    lote.lastModified = Date.now();
    showToast(`Abono de C$${monto.toLocaleString()} registrado`);
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderAbonos();
}

function eliminarAbono() {
  if (!abonoSeleccionadoId) return;
  const abono = abonos.find(a => a.id === abonoSeleccionadoId);
  if (!abono) return;
  
  if (!confirm(`¿Eliminar este abono de C$${(parseFloat(abono.monto) || 0).toLocaleString()}?\n\n⚠️ El saldo del lote ${abono.loteId} se actualizará automáticamente.`)) return;
  
  const lote = lotes.find(l => l.id === abono.loteId);
  if (lote) {
    // Revertir el abono del lote
    lote.abonado = Math.max(0, (parseFloat(lote.abonado) || 0) - (parseFloat(abono.monto) || 0));
    lote.saldoPendiente = (parseFloat(lote.totalInicial) || 0) - (parseFloat(lote.abonado) || 0);
    if (lote.saldoPendiente > 0) {
      lote.estado = 'PENDIENTE';
      delete lote.fechaPagoTotal;
    }
    lote.lastModified = Date.now();
  }
  
  // Eliminar SOLO este abono
  abonos = abonos.filter(a => a.id !== abonoSeleccionadoId);
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderAbonos();
  showToast('Abono eliminado correctamente');
}

function renderAbonos() {
  const container = document.getElementById('listaAbonos');
  if (abonos.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay abonos registrados</p>';
    return;
  }
  const abonosOrdenados = [...abonos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  container.innerHTML = abonosOrdenados.map(abono => `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-pink-200 dark:border-pink-800 cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-900/20" onclick="verDetalleAbono('${abono.id}')">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-gray-800 dark:text-white">${abono.loteId}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(abono.fecha)} | ${abono.metodo}</p>
          ${abono.notas ? `<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${abono.notas}</p>` : ''}
        </div>
        <p class="text-lg font-bold text-pink-600 dark:text-pink-400">C$${(parseFloat(abono.monto) || 0).toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

// ==========================================
// COBROS - CRUD COMPLETO CON EDICIÓN INDIVIDUAL
// ==========================================
function buscarVentaCobro() {
  const busqueda = document.getElementById('cobroBusqueda').value.trim().toUpperCase();
  const resultadosDiv = document.getElementById('resultadosBusquedaCobro');
  
  if (busqueda.length < 2) {
    resultadosDiv.classList.add('hidden');
    return;
  }
  
  const resultados = ventas.filter(v =>
    v.estado === 'PENDIENTE' &&
    (v.id.toUpperCase().includes(busqueda) || v.cliente.toUpperCase().includes(busqueda))
  );
  
  if (resultados.length === 0) {
    resultadosDiv.innerHTML = '<p class="text-gray-500 text-center py-2">No se encontraron ventas pendientes</p>';
    resultadosDiv.classList.remove('hidden');
    return;
  }
  
  resultadosDiv.innerHTML = resultados.map(v => `
    <div onclick="seleccionarVentaCobro('${v.id}')" class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
      <p class="font-bold text-gray-800 dark:text-white">${v.cliente}</p>
      <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>${v.id}</span>
        <span>Saldo: C$${(parseFloat(v.saldo) || 0).toLocaleString()}</span>
      </div>
    </div>
  `).join('');
  
  resultadosDiv.classList.remove('hidden');
}

function seleccionarVentaCobro(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  document.getElementById('cobroVentaId').value = ventaId;
  document.getElementById('resultadosBusquedaCobro').classList.add('hidden');
  
  const infoDiv = document.getElementById('infoVentaCobro');
  infoDiv.innerHTML = `
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente:</span>
        <span class="text-sm font-bold text-gray-800 dark:text-white">${venta.cliente}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">Total:</span>
        <span class="text-sm font-medium text-gray-800 dark:text-white">C$${(parseFloat(venta.precioTotal) || 0).toLocaleString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">Pagado:</span>
        <span class="text-sm font-medium text-green-600 dark:text-green-400">C$${(parseFloat(venta.pagado) || 0).toLocaleString()}</span>
      </div>
      <div class="flex justify-between border-t border-green-200 dark:border-green-800 pt-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo:</span>
        <span class="text-sm font-bold text-orange-600 dark:text-orange-400">C$${(parseFloat(venta.saldo) || 0).toLocaleString()}</span>
      </div>
    </div>
  `;
  infoDiv.classList.remove('hidden');
}

function seleccionarVentaCobroDirecto(ventaId) {
  document.getElementById('cobroBusqueda').value = ventaId;
  buscarVentaCobro();
  setTimeout(() => {
    seleccionarVentaCobro(ventaId);
  }, 100);
}

function editarCobro(cobroId) {
  const cobro = cobros.find(c => c.id === cobroId);
  if (!cobro) return;
  
  cobroSeleccionadoId = cobroId;
  document.getElementById('formCobro').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
  document.getElementById('tituloFormCobro').textContent = 'Editar Cobro';
  document.getElementById('cobroEditId').value = cobroId;
  document.getElementById('cobroFecha').value = cobro.fecha;
  document.getElementById('cobroMonto').value = cobro.monto;
  document.getElementById('cobroMetodo').value = cobro.metodo;
  document.getElementById('cobroNotas').value = cobro.notas || '';
  
  // Seleccionar venta
  document.getElementById('cobroVentaId').value = cobro.ventaId;
  seleccionarVentaCobro(cobro.ventaId);
  
  document.getElementById('btnEliminarCobro').classList.remove('hidden');
}

function guardarCobro() {
  const editId = document.getElementById('cobroEditId').value;
  const ventaId = document.getElementById('cobroVentaId').value;
  const fecha = document.getElementById('cobroFecha').value;
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;
  const metodo = document.getElementById('cobroMetodo').value;
  const notas = document.getElementById('cobroNotas').value.trim();
  
  if (!ventaId || !fecha || monto <= 0) {
    alert('Complete todos los campos obligatorios');
    return;
  }
  
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) return;
  
  if (editId) {
    // EDITAR COBRO EXISTENTE
    const cobro = cobros.find(c => c.id === editId);
    if (cobro) {
      // Revertir el cobro anterior de la venta
      venta.pagado = Math.max(0, (parseFloat(venta.pagado) || 0) - (parseFloat(cobro.monto) || 0));
      venta.saldo = (parseFloat(venta.precioTotal) || 0) - (parseFloat(venta.pagado) || 0);
      
      // Validar nuevo monto
      if (monto > venta.saldo) {
        // Restaurar el cobro anterior
        venta.pagado = (parseFloat(venta.pagado) || 0) + (parseFloat(cobro.monto) || 0);
        venta.saldo = (parseFloat(venta.precioTotal) || 0) - (parseFloat(venta.pagado) || 0);
        alert(`El monto no puede superar el saldo disponible (C$${venta.saldo.toLocaleString()})`);
        return;
      }
      
      // Actualizar cobro
      cobro.ventaId = ventaId;
      cobro.fecha = fecha;
      cobro.monto = monto;
      cobro.metodo = metodo;
      cobro.notas = notas;
      cobro.lastModified = Date.now();
      
      // Aplicar nuevo cobro a la venta
      venta.pagado = (parseFloat(venta.pagado) || 0) + monto;
      venta.saldo = (parseFloat(venta.precioTotal) || 0) - (parseFloat(venta.pagado) || 0);
      
      if (venta.saldo <= 0) {
        venta.estado = 'PAGADO';
        venta.fechaPagoTotal = fecha;
      } else {
        venta.estado = 'PENDIENTE';
        delete venta.fechaPagoTotal;
      }
      venta.lastModified = Date.now();
      showToast('Cobro actualizado correctamente');
    }
  } else {
    // NUEVO COBRO
    if (monto > venta.saldo) {
      alert(`El monto no puede superar el saldo (C$${(parseFloat(venta.saldo) || 0).toLocaleString()})`);
      return;
    }
    
    cobros.push({
      id: Date.now().toString(),
      ventaId,
      fecha,
      monto,
      metodo,
      notas,
      lastModified: Date.now()
    });
    
    venta.pagado = (parseFloat(venta.pagado) || 0) + monto;
    venta.saldo = (parseFloat(venta.saldo) || 0) - monto;
    
    // Actualizar próxima fecha de cobro según frecuencia
    if (venta.tipoPago !== 'cash' && venta.saldo > 0) {
      const fechaBase = new Date(fecha);
      const proximaFecha = calcularProximaFecha(fechaBase, venta.frecuenciaPago, venta.fechasPersonalizadas || []);
      venta.proximaFechaCobro = proximaFecha.toISOString().split('T')[0];
    }
    
    if (venta.saldo <= 0) {
      venta.estado = 'PAGADO';
      venta.fechaPagoTotal = fecha;
    }
    venta.lastModified = Date.now();
    showToast(`Cobro de C$${monto.toLocaleString()} registrado`);
  }
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCobros();
  renderRecordatorios();
}

function eliminarCobro() {
  if (!cobroSeleccionadoId) return;
  const cobro = cobros.find(c => c.id === cobroSeleccionadoId);
  if (!cobro) return;
  
  if (!confirm(`¿Eliminar este cobro de C$${(parseFloat(cobro.monto) || 0).toLocaleString()}?\n\n⚠️ El saldo de la venta se actualizará automáticamente.`)) return;
  
  const venta = ventas.find(v => v.id === cobro.ventaId);
  if (venta) {
    // Revertir el cobro de la venta
    venta.pagado = Math.max(0, (parseFloat(venta.pagado) || 0) - (parseFloat(cobro.monto) || 0));
    venta.saldo = (parseFloat(venta.precioTotal) || 0) - (parseFloat(venta.pagado) || 0);
    if (venta.saldo > 0) {
      venta.estado = 'PENDIENTE';
      delete venta.fechaPagoTotal;
    }
    venta.lastModified = Date.now();
  }
  
  // Eliminar SOLO este cobro
  cobros = cobros.filter(c => c.id !== cobroSeleccionadoId);
  
  saveLocalData();
  sincronizarAhora();
  hideForms();
  renderCobros();
  renderRecordatorios();
  showToast('Cobro eliminado correctamente');
}

function renderCobros() {
  const container = document.getElementById('listaCobros');
  if (cobros.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay cobros registrados</p>';
    return;
  }
  const cobrosOrdenados = [...cobros].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  container.innerHTML = cobrosOrdenados.map(cobro => {
    const venta = ventas.find(v => v.id === cobro.ventaId);
    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20" onclick="verDetalleCobro('${cobro.id}')">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold text-gray-800 dark:text-white">${venta?.cliente || 'Cliente'}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFecha(cobro.fecha)} | ${cobro.metodo}</p>
            ${cobro.notas ? `<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${cobro.notas}</p>` : ''}
          </div>
          <p class="text-lg font-bold text-green-600 dark:text-green-400">C$${(parseFloat(cobro.monto) || 0).toLocaleString()}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// QR SYNC
// ==========================================
function mostrarQRSync() {
  document.getElementById('modalQRSync').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
  document.getElementById('qrContainer').innerHTML = '';
  document.getElementById('qrInstrucciones').classList.add('hidden');
}

function generarQRParaExportar() {
  const datos = { lotes, compras, ventas, abonos, cobros };
  const datosComprimidos = btoa(encodeURIComponent(JSON.stringify(datos)));
  
  if (datosComprimidos.length > 2500) {
    showToast('⚠️ Datos muy grandes. Usa Exportar JSON en su lugar.');
    return;
  }
  
  document.getElementById('qrContainer').innerHTML = '';
  new QRCode(document.getElementById('qrContainer'), {
    text: datosComprimidos,
    width: 256,
    height: 256,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
  
  document.getElementById('qrInstrucciones').classList.remove('hidden');
  showToast('📱 Escanea con el otro dispositivo');
}

function importarDesdeQR() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast('📷 Para escanear QR, usa la cámara del otro dispositivo y la función "Generar QR para Exportar"');
  };
  input.click();
}

// ==========================================
// UTILIDADES
// ==========================================
function formatFecha(fechaStr) {
  if (!fechaStr) return 'N/A';
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.remove('opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 4000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideForms();
});