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

// Datos locales
let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let compras = JSON.parse(localStorage.getItem('compras')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
let abonos = JSON.parse(localStorage.getItem('abonos')) || [];
let cobros = JSON.parse(localStorage.getItem('cobros')) || [];

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
// INICIALIZACIÓN
// ==========================================
window.onload = function() {
  // Normalizar datos al cargar
  normalizarTodosLosDatos();
  
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
// NORMALIZACIÓN DE DATOS (CRÍTICO)
// ==========================================
function normalizarTodosLosDatos() {
  lotes = lotes.map(normalizarLote);
  compras = compras.map(normalizarCompra);
  ventas = ventas.map(normalizarVenta);
  abonos = abonos.map(normalizarAbono);
  cobros = cobros.map(normalizarCobro);
  saveLocalData();
}

function limpiarTexto(texto) {
  if (typeof texto !== 'string') return texto;
  return texto.trim();
}

function limpiarNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const num = parseFloat(valor.trim());
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function normalizarLote(l) {
  return {
    ...l,
    id: limpiarTexto(l.id || ''),
    fechaRecepcion: limpiarTexto(l.fechaRecepcion || ''),
    fechaLimite: limpiarTexto(l.fechaLimite || ''),
    totalInicial: limpiarNumero(l.totalInicial),
    abonado: limpiarNumero(l.abonado),
    saldoPendiente: limpiarNumero(l.saldoPendiente),
    estado: limpiarTexto(l.estado || 'PENDIENTE'),
    productos: (l.productos || []).map(p => ({
      nombre: limpiarTexto(p.nombre || ''),
      cantidad: parseInt(p.cantidad) || 1,
      precioCarmen: limpiarNumero(p.precioCarmen),
      vendido: p.vendido || false
    })),
    lastModified: l.lastModified || Date.now()
  };
}

function normalizarCompra(c) {
  return {
    ...c,
    id: limpiarTexto(c.id || ''),
    fecha: limpiarTexto(c.fecha || ''),
    proveedor: limpiarTexto(c.proveedor || ''),
    productos: (c.productos || []).map(p => ({
      nombre: limpiarTexto(p.nombre || ''),
      cantidad: parseInt(p.cantidad) || 1,
      precioCompra: limpiarNumero(p.precioCompra),
      vendido: p.vendido || false
    })),
    lastModified: c.lastModified || Date.now()
  };
}

function normalizarVenta(v) {
  return {
    ...v,
    id: limpiarTexto(v.id || ''),
    cliente: limpiarTexto(v.cliente || ''),
    telefono: limpiarTexto(v.telefono || ''),
    fecha: limpiarTexto(v.fecha || ''),
    precioTotal: limpiarNumero(v.precioTotal),
    prima: limpiarNumero(v.prima),
    saldo: limpiarNumero(v.saldo),
    pagado: limpiarNumero(v.pagado),
    cuotaMensual: limpiarNumero(v.cuotaMensual),
    meses: parseInt(v.meses) || 12,
    estado: limpiarTexto(v.estado || 'PENDIENTE'),
    proximaFechaCobro: limpiarTexto(v.proximaFechaCobro || ''),
    productos: (v.productos || []).map(p => ({
      nombre: limpiarTexto(p.nombre || ''),
      cantidad: parseInt(p.cantidad) || 1,
      precioCarmen: limpiarNumero(p.precioCarmen),
      precioCompra: limpiarNumero(p.precioCompra),
      precioVenta: limpiarNumero(p.precioVenta),
      sourceType: limpiarTexto(p.sourceType || 'manual'),
      sourceId: p.sourceId ? limpiarTexto(p.sourceId) : null
    })),
    lastModified: v.lastModified || Date.now()
  };
}

function normalizarAbono(a) {
  return {
    ...a,
    id: limpiarTexto(a.id || ''),
    loteId: limpiarTexto(a.loteId || ''),
    fecha: limpiarTexto(a.fecha || ''),
    monto: limpiarNumero(a.monto),
    metodo: limpiarTexto(a.metodo || ''),
    notas: limpiarTexto(a.notas || ''),
    saldoDespues: limpiarNumero(a.saldoDespues),
    lastModified: a.lastModified || Date.now()
  };
}

function normalizarCobro(c) {
  return {
    ...c,
    id: limpiarTexto(c.id || ''),
    ventaId: limpiarTexto(c.ventaId || ''),
    fecha: limpiarTexto(c.fecha || ''),
    monto: limpiarNumero(c.monto),
    metodo: limpiarTexto(c.metodo || ''),
    notas: limpiarTexto(c.notas || ''),
    lastModified: c.lastModified || Date.now()
  };
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
    };

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
    if (resultado.data.lotes) lotes = parseProductos(resultado.data.lotes).map(normalizarLote);
    if (resultado.data.compras) compras = parseProductos(resultado.data.compras).map(normalizarCompra);
    if (resultado.data.ventas) ventas = parseProductos(resultado.data.ventas).map(normalizarVenta);
    if (resultado.data.abonos) abonos = (resultado.data.abonos || []).map(normalizarAbono);
    if (resultado.data.cobros) cobros = (resultado.data.cobros || []).map(normalizarCobro);
    saveLocalData();
    renderCurrentSection();
    updateResumen();
  }
  
  CONFIG.lastSync = new Date().toISOString();
  localStorage.setItem('lastSync', CONFIG.lastSync);
  updateSyncStatus('synced');
  showToast('✅ Sincronizado con Google Sheets');
}

function updateSyncStatus(status) {
  const indicator = document.getElementById('syncStatus');
  const configs = {
    online: { color: 'green', text: 'En línea' },
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
      if (!confirm('¿Reemplazar TODOS los datos?')) return;
      
      lotes = (datos.lotes || []).map(normalizarLote);
      compras = (datos.compras || []).map(normalizarCompra);
      ventas = (datos.ventas || []).map(normalizarVenta);
      abonos = (datos.abonos || []).map(normalizarAbono);
      cobros = (datos.cobros || []).map(normalizarCobro);
      
      saveLocalData();
      renderCurrentSection();
      updateResumen();
      cerrarModal('modalImportar');
      showToast('✅ Datos importados');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
  reader.readAsText(file);
}

// ==========================================
// DATOS LOCALES
// ==========================================
function saveLocalData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('compras', JSON.stringify(compras));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  localStorage.setItem('abonos', JSON.stringify(abonos));
  localStorage.setItem('cobros', JSON.stringify(cobros));
  updateResumen();
}

// ==========================================
// RESUMEN - FUNCIÓN CRÍTICA CORREGIDA
// ==========================================
function updateResumen() {
  try {
    // Deuda con Carmen (suma de saldos pendientes de lotes)
    const deudaCarmen = lotes.reduce((sum, l) => {
      const saldo = parseFloat(l.saldoPendiente) || 0;
      return sum + saldo;
    }, 0);
    
    // Mis Compras (valor del stock en compras)
    const totalCompras = compras.reduce((sum, c) => {
      const stock = (c.productos || []).filter(p => !p.vendido).reduce((s, p) => {
        const precio = parseFloat(p.precioCompra) || 0;
        const cant = parseInt(p.cantidad) || 1;
        return s + (precio * cant);
      }, 0);
      return sum + stock;
    }, 0);
    
    // Clientes me deben (suma de saldos de ventas pendientes)
    const clientesDeben = ventas.reduce((sum, v) => {
      const saldo = parseFloat(v.saldo) || 0;
      return sum + saldo;
    }, 0);
    
    // Ganancia Estimada (precio venta - costo)
    const gananciaEstimada = ventas.reduce((sum, v) => {
      const totalVenta = parseFloat(v.precioTotal) || 0;
      const costo = (v.productos || []).reduce((c, p) => {
        const precioCosto = parseFloat(p.precioCarmen) || parseFloat(p.precioCompra) || 0;
        const cant = parseInt(p.cantidad) || 1;
        return c + (precioCosto * cant);
      }, 0);
      return sum + (totalVenta - costo);
    }, 0);
    
    // Actualizar DOM
    document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
    document.getElementById('totalCompras').textContent = `C$${totalCompras.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
    document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
    document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString('es-NI', {minimumFractionDigits: 2})}`;
    document.getElementById('countLotes').textContent = lotes.filter(l => l.estado === 'PENDIENTE').length;
    document.getElementById('countCompras').textContent = compras.length;
    document.getElementById('countVentas').textContent = ventas.filter(v => v.estado === 'PENDIENTE').length;
    
    const totalStock = [...lotes, ...compras].reduce((sum, item) =>
      sum + ((item.productos || []).filter(p => !p.vendido).length || 0), 0);
    document.getElementById('countStock').textContent = totalStock;
    
    console.log('✅ Resumen actualizado:', { deudaCarmen, totalCompras, clientesDeben, gananciaEstimada });
  } catch (error) {
    console.error('❌ Error en updateResumen:', error);
  }
}

// ==========================================
// FUNCIÓN DE DIAGNÓSTICO (PARA VERIFICAR DATOS)
// ==========================================
function diagnosticarDatos() {
  console.log('=== DIAGNÓSTICO DE DATOS ===');
  console.log('Lotes:', lotes.length);
  console.log('Ventas:', ventas.length);
  console.log('Abonos:', abonos.length);
  console.log('Cobros:', cobros.length);
  
  console.log('\n--- Muestras de Datos ---');
  if (lotes.length > 0) {
    console.log('Primer Lote:', lotes[0]);
  }
  if (ventas.length > 0) {
    console.log('Primera Venta:', ventas[0]);
  }
  
  console.log('\n--- Cálculos Individuales ---');
  lotes.forEach((l, i) => {
    if (i < 3) {
      console.log(`Lote ${l.id}: saldoPendiente=${l.saldoPendiente} (tipo: ${typeof l.saldoPendiente})`);
    }
  });
  
  ventas.forEach((v, i) => {
    if (i < 3) {
      console.log(`Venta ${v.id}: saldo=${v.saldo} (tipo: ${typeof v.saldo})`);
    }
  });
  
  return { lotes: lotes.length, ventas: ventas.length, abonos: abonos.length, cobros: cobros.length };
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
// ELIMINAR ABONOS Y COBROS
// ==========================================
function eliminarAbono() {
  if (!abonoSeleccionadoId) {
    showToast('❌ No hay abono seleccionado');
    return;
  }
  const abono = abonos.find(a => a.id === abonoSeleccionadoId);
  if (!abono) {
    showToast('❌ Abono no encontrado');
    return;
  }
  if (!confirm(`¿Eliminar abono de C$${(parseFloat(abono.monto) || 0).toLocaleString()} del lote ${abono.loteId}?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  const lote = lotes.find(l => l.id === abono.loteId);
  if (lote) {
    lote.abonado = Math.max(0, (parseFloat(lote.abonado) || 0) - (parseFloat(abono.monto) || 0));
    lote.saldoPendiente = (parseFloat(lote.totalInicial) || 0) - (parseFloat(lote.abonado) || 0);
    if (lote.saldoPendiente > 0) {
      lote.estado = 'PENDIENTE';
      delete lote.fechaPagoTotal;
    }
    lote.lastModified = Date.now();
  }
  
  abonos = abonos.filter(a => a.id !== abonoSeleccionadoId);
  
  saveLocalData();
  sincronizarAhora();
  cerrarModal('modalDetalleAbono');
  renderAbonos();
  updateResumen();
  showToast('✅ Abono eliminado');
}

function eliminarCobro() {
  if (!cobroSeleccionadoId) {
    showToast('❌ No hay cobro seleccionado');
    return;
  }
  const cobro = cobros.find(c => c.id === cobroSeleccionadoId);
  if (!cobro) {
    showToast('❌ Cobro no encontrado');
    return;
  }
  if (!confirm(`¿Eliminar cobro de C$${(parseFloat(cobro.monto) || 0).toLocaleString()} a ${cobro.ventaId}?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  const venta = ventas.find(v => v.id === cobro.ventaId);
  if (venta) {
    venta.pagado = Math.max(0, (parseFloat(venta.pagado) || 0) - (parseFloat(cobro.monto) || 0));
    venta.saldo = (parseFloat(venta.precioTotal) || 0) - (parseFloat(venta.pagado) || 0);
    if (venta.saldo > 0) {
      venta.estado = 'PENDIENTE';
      delete venta.fechaPagoTotal;
    }
    venta.lastModified = Date.now();
  }
  
  cobros = cobros.filter(c => c.id !== cobroSeleccionadoId);
  
  saveLocalData();
  sincronizarAhora();
  cerrarModal('modalDetalleCobro');
  renderCobros();
  updateResumen();
  showToast('✅ Cobro eliminado');
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
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('modalDetalleCobro').classList.remove('hidden');
  document.getElementById('formOverlay').classList.remove('hidden');
}

// ==========================================
// RENDER ABONOS Y COBROS
// ==========================================
function renderAbonos() {
  const container = document.getElementById('listaAbonos');
  if (abonos.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay abonos</p>';
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

function renderCobros() {
  const container = document.getElementById('listaCobros');
  if (cobros.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay cobros</p>';
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
// PDF Y WHATSAPP - VENTAS
// ==========================================
async function generarPDFVenta(ventaId) {
  const venta = ventas.find(v => v.id === ventaId);
  if (!venta) {
    showToast('❌ Venta no encontrada');
    return;
  }
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(236, 72, 153);
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, 20, null, null, 'center');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Recibo de Venta', 105, 28, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`ID: ${venta.id}`, 20, 45);
    doc.text(`Cliente: ${venta.cliente}`, 20, 55);
    doc.text(`Fecha: ${formatFecha(venta.fecha)}`, 20, 65);
    doc.text(`Teléfono: ${venta.telefono || 'N/A'}`, 20, 75);
    
    doc.text('PRODUCTOS:', 20, 90);
    let y = 100;
    venta.productos.forEach((p, i) => {
      const subtotal = (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
      doc.text(`${i+1}. ${p.nombre} x${p.cantidad} - C$${subtotal.toLocaleString()}`, 25, y);
      y += 8;
    });
    
    y += 5;
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total: C$${(venta.precioTotal).toLocaleString()}`, 20, y);
    doc.text(`Prima: C$${(venta.prima).toLocaleString()}`, 20, y+10);
    doc.text(`Saldo: C$${(venta.saldo).toLocaleString()}`, 20, y+20);
    doc.text(`Cuota Mensual: C$${(venta.cuotaMensual).toLocaleString()}`, 20, y+30);
    doc.text(`Meses: ${venta.meses}`, 20, y+40);
    
    doc.setFontSize(10);
    doc.setTextColor(236, 72, 153);
    doc.text('¡Gracias por su compra!', 105, y+60, null, null, 'center');
    doc.text('ELECTRODOMÉSTICOS Y VARIEDADES KAREN', 105, y+68, null, null, 'center');
    
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
  
  let mensaje = `🌸 *ELECTRODOMÉSTICOS Y VARIEDADES KAREN* 🌸\n\n`;
  mensaje += `📋 *RECIBO DE VENTA*\n\n`;
  mensaje += `*ID:* ${venta.id}\n`;
  mensaje += `*Cliente:* ${venta.cliente}\n`;
  mensaje += `*Fecha:* ${formatFecha(venta.fecha)}\n\n`;
  mensaje += `*PRODUCTOS:*\n`;
  
  venta.productos.forEach((p, i) => {
    const subtotal = (parseFloat(p.precioVenta) || 0) * (parseInt(p.cantidad) || 1);
    mensaje += `${i+1}. ${p.nombre} x${p.cantidad} - C$${subtotal.toLocaleString()}\n`;
  });
  
  mensaje += `\n*TOTAL:* C$${(venta.precioTotal).toLocaleString()}`;
  mensaje += `\n*PRIMA:* C$${(venta.prima).toLocaleString()}`;
  mensaje += `\n*SALDO:* C$${(venta.saldo).toLocaleString()}`;
  mensaje += `\n*CUOTA:* C$${(venta.cuotaMensual).toLocaleString()} x ${venta.meses} meses`;
  mensaje += `\n\n🌸 ¡Gracias por su compra! 🌸`;
  mensaje += `\n\n_ELECTRODOMÉSTICOS Y VARIEDADES KAREN_`;
  
  const telefono = venta.telefono?.replace(/[^0-9]/g, '') || '';
  const url = telefono 
    ? `https://wa.me/505${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
}

// ==========================================
// PDF Y WHATSAPP - ABONOS
// ==========================================
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
  
  let mensaje = `🌸 *ELECTRODOMÉSTICOS Y VARIEDADES KAREN* 🌸\n\n`;
  mensaje += `📋 *RECIBO DE ABONO*\n\n`;
  mensaje += `*ID Abono:* ${abono.id}\n`;
  mensaje += `*Lote:* ${abono.loteId}\n`;
  mensaje += `*Fecha:* ${formatFecha(abono.fecha)}\n`;
  mensaje += `*Método:* ${abono.metodo}\n\n`;
  mensaje += `💰 *MONTO ABONADO: C$${(parseFloat(abono.monto) || 0).toLocaleString()}*\n\n`;
  mensaje += `*Estado del Lote:*\n`;
  mensaje += `Total: C$${(parseFloat(lote?.totalInicial) || 0).toLocaleString()}\n`;
  mensaje += `Abonado: C$${(parseFloat(lote?.abonado) || 0).toLocaleString()}\n`;
  mensaje += `Saldo: C$${(parseFloat(lote?.saldoPendiente) || 0).toLocaleString()}\n`;
  
  if (abono.notas) {
    mensaje += `\n*Notas:* ${abono.notas}`;
  }
  
  mensaje += `\n\n🌸 ¡Gracias por su abono! 🌸`;
  mensaje += `\n\n_ELECTRODOMÉSTICOS Y VARIEDADES KAREN_`;
  
  const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
}

// ==========================================
// PDF Y WHATSAPP - COBROS
// ==========================================
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
  
  let mensaje = `🌸 *ELECTRODOMÉSTICOS Y VARIEDADES KAREN* 🌸\n\n`;
  mensaje += `📋 *RECIBO DE COBRO*\n\n`;
  mensaje += `*ID Cobro:* ${cobro.id}\n`;
  mensaje += `*Venta:* ${cobro.ventaId}\n`;
  mensaje += `*Cliente:* ${venta?.cliente || 'N/A'}\n`;
  mensaje += `*Fecha:* ${formatFecha(cobro.fecha)}\n`;
  mensaje += `*Método:* ${cobro.metodo}\n\n`;
  mensaje += `💚 *MONTO COBRADO: C$${(parseFloat(cobro.monto) || 0).toLocaleString()}*\n\n`;
  mensaje += `*Estado de la Cuenta:*\n`;
  mensaje += `Total Venta: C$${(parseFloat(venta?.precioTotal) || 0).toLocaleString()}\n`;
  mensaje += `Total Pagado: C$${(parseFloat(venta?.pagado) || 0).toLocaleString()}\n`;
  mensaje += `Saldo Pendiente: C$${(parseFloat(venta?.saldo) || 0).toLocaleString()}\n`;
  
  if (cobro.notas) {
    mensaje += `\n*Notas:* ${cobro.notas}`;
  }
  
  mensaje += `\n\n🌸 ¡Gracias por su pago! 🌸`;
  mensaje += `\n\n_ELECTRODOMÉSTICOS Y VARIEDADES KAREN_`;
  
  const telefono = venta?.telefono?.replace(/[^0-9]/g, '') || '';
  const url = telefono 
    ? `https://wa.me/505${telefono}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  
  window.open(url, '_blank');
  showToast('📱 Abriendo WhatsApp...');
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
    
    showToast('📷 Procesando imagen QR...');
    showToast('⚠️ Para escanear QR, usa la cámara del otro dispositivo');
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