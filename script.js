// Datos - Cargar desde localStorage o usar datos iniciales de data.js
let lotes = JSON.parse(localStorage.getItem('lotes')) || (typeof initialLotes !== 'undefined' ? initialLotes : []);
let ventas = JSON.parse(localStorage.getItem('ventas')) || (typeof initialVentas !== 'undefined' ? initialVentas : []);

// Guardar datos
function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  updateResumen();
  updateCounts();
}

// Actualizar contadores
function updateCounts() {
  const countLotes = document.getElementById('countLotes');
  const countVentas = document.getElementById('countVentas');
  if (countLotes) countLotes.textContent = lotes.length;
  if (countVentas) countVentas.textContent = ventas.length;
}

// Resumen General
function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, l) => sum + (l.saldoPendiente || 0), 0);
  const clientesDeben = ventas.reduce((sum, v) => sum + (v.saldo || 0), 0);
  const ventasActivas = ventas.filter(v => v.estado === 'PENDIENTE').length;
  const gananciaEstimada = ventas.reduce((sum, v) => sum + Math.round((v.precioTotal || 0) * 0.35), 0);

  const deudaEl = document.getElementById('deudaCarmen');
  const clientesEl = document.getElementById('clientesDeben');
  const activasEl = document.getElementById('ventasActivas');
  const gananciaEl = document.getElementById('gananciaEstimada');

  if (deudaEl) deudaEl.textContent = `C$${deudaCarmen.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (clientesEl) clientesEl.textContent = `C$${clientesDeben.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  if (activasEl) activasEl.textContent = ventasActivas;
  if (gananciaEl) gananciaEl.textContent = `C$${gananciaEstimada.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (toast && toastMessage) {
    toastMessage.textContent = message;
    toast.classList.remove('opacity-0');
    setTimeout(() => {
      toast.classList.add('opacity-0');
    }, 3000);
  }
}

// Renderizar lotes
function renderLotes() {
  const container = document.getElementById('lotes');
  if (!container) return;
  
  if (lotes.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay lotes registrados</p>';
    return;
  }
  
  container.innerHTML = '';
  lotes.forEach((lote, index) => {
    const isPending = lote.estado === 'PENDIENTE';
    const colorClass = isPending ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    const textClass = isPending ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400';
    const badgeClass = isPending ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200';
    const progress = lote.totalInicial > 0 ? ((lote.totalInicial - lote.saldoPendiente) / lote.totalInicial * 100).toFixed(1) : 0;

    container.innerHTML += `
      <div class="p-4 rounded-2xl border ${colorClass} transition-all hover:shadow-md">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-bold text-lg text-gray-800 dark:text-white">${lote.id}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${lote.fechaRecepcion}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">${lote.estado}</span>
            <button onclick="deleteLote(${index})" class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1" title="Eliminar">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
        <div class="flex justify-between items-end">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo pendiente</p>
            <p class="text-2xl font-bold ${textClass}">C$${lote.saldoPendiente.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Progreso</p>
            <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full ${isPending ? 'bg-red-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${progress}%</p>
          </div>
        </div>
      </div>`;
  });
}

// Renderizar ventas
function renderVentas() {
  const container = document.getElementById('ventas');
  if (!container) return;
  
  if (ventas.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8 italic">No hay ventas registradas</p>';
    return;
  }
  
  container.innerHTML = '';
  ventas.forEach((venta, index) => {
    const isPending = venta.estado === 'PENDIENTE';
    const colorClass = isPending ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    const badgeClass = isPending ? 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200' : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200';
    const progress = venta.precioTotal > 0 ? ((venta.precioTotal - venta.saldo) / venta.precioTotal * 100).toFixed(1) : 0;

    container.innerHTML += `
      <div class="p-4 rounded-2xl border ${colorClass} transition-all hover:shadow-md">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-bold text-lg text-gray-800 dark:text-white">${venta.cliente}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">ID: ${venta.id}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${badgeClass}">${venta.estado}</span>
            <button onclick="deleteVenta(${index})" class="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1" title="Eliminar">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p class="font-semibold text-gray-800 dark:text-gray-200">C$${venta.precioTotal.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Pagado</p>
            <p class="font-semibold text-green-600 dark:text-green-400">C$${venta.pagado.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
            <p class="font-bold ${isPending ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}">C$${venta.saldo.toLocaleString('es-NI', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
        </div>
        <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full ${isPending ? 'bg-orange-500' : 'bg-green-500'}" style="width: ${progress}%"></div>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 text-right">${progress}% pagado</p>
      </div>`;
  });
}

// Mostrar/ocultar formularios
function showForm(type) {
  hideForms();
  const overlay = document.getElementById('formOverlay');
  const form = document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`);
  
  if (overlay) overlay.classList.remove('hidden');
  if (form) {
    form.classList.remove('hidden');
    // Focus en el primer input
    setTimeout(() => {
      const firstInput = form.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);
  }
}

function hideForms() {
  const overlay = document.getElementById('formOverlay');
  const forms = ['formLote', 'formVenta', 'formCobro'];
  
  if (overlay) overlay.classList.add('hidden');
  forms.forEach(id => {
    const form = document.getElementById(id);
    if (form) form.classList.add('hidden');
  });
  
  // Limpiar formularios
  document.getElementById('loteId') && (document.getElementById('loteId').value = '');
  document.getElementById('loteFecha') && (document.getElementById('loteFecha').value = '');
  document.getElementById('loteTotal') && (document.getElementById('loteTotal').value = '');
  document.getElementById('ventaId') && (document.getElementById('ventaId').value = '');
  document.getElementById('ventaCliente') && (document.getElementById('ventaCliente').value = '');
  document.getElementById('ventaTotal') && (document.getElementById('ventaTotal').value = '');
  document.getElementById('ventaPrima') && (document.getElementById('ventaPrima').value = '');
  document.getElementById('ventaMeses') && (document.getElementById('ventaMeses').value = '');
  document.getElementById('cobroIdVenta') && (document.getElementById('cobroIdVenta').value = '');
  document.getElementById('cobroMonto') && (document.getElementById('cobroMonto').value = '');
  document.getElementById('infoCliente') && (document.getElementById('infoCliente').innerHTML = '');
  const infoContainer = document.getElementById('infoClienteContainer');
  if (infoContainer) infoContainer.classList.add('hidden');
}

// Buscar cliente para cobro
function buscarCliente() {
  const id = document.getElementById('cobroIdVenta').value.trim().toUpperCase();
  const info = document.getElementById('infoCliente');
  const infoContainer = document.getElementById('infoClienteContainer');
  const venta = ventas.find(v => v.id === id);
  
  if (venta && info && infoContainer) {
    info.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-semibold">${venta.cliente}</span>
        <span class="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">${venta.estado}</span>
      </div>
      <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>Total: <strong>C$${venta.precioTotal.toLocaleString()}</strong></div>
        <div>Saldo: <strong class="${venta.saldo > 0 ? 'text-red-600' : 'text-green-600'}">C$${venta.saldo.toLocaleString()}</strong></div>
      </div>
    `;
    infoContainer.classList.remove('hidden');
  } else if (infoContainer) {
    infoContainer.classList.add('hidden');
  }
}

// Agregar lote
function addLote() {
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const total = parseFloat(document.getElementById('loteTotal').value) || 0;

  if (!id || !fecha || total <= 0) {
    alert("Por favor completa todos los campos correctamente");
    return;
  }

  if (lotes.some(l => l.id === id)) {
    alert("Ya existe un lote con este ID");
    return;
  }

  lotes.push({
    id, 
    fechaRecepcion: fecha, 
    totalInicial: total, 
    abonado: 0, 
    saldoPendiente: total, 
    estado: "PENDIENTE"
  });

  saveData();
  renderLotes();
  hideForms();
  showToast("Lote guardado exitosamente");
}

// Agregar venta
function addVenta() {
  const id = document.getElementById('ventaId').value.trim().toUpperCase();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const total = parseFloat(document.getElementById('ventaTotal').value) || 0;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 0;

  if (!id || !cliente || total <= 0 || meses <= 0) {
    alert("Por favor completa todos los campos obligatorios");
    return;
  }

  if (prima > total) {
    alert("La prima no puede ser mayor que el total");
    return;
  }

  if (ventas.some(v => v.id === id)) {
    alert("Ya existe una venta con este ID");
    return;
  }

  ventas.push({
    id, 
    cliente, 
    precioTotal: total, 
    pagado: prima, 
    saldo: total - prima, 
    estado: prima >= total ? "PAGADO" : "PENDIENTE",
    meses: meses,
    fecha: new Date().toISOString()
  });

  saveData();
  renderVentas();
  hideForms();
  showToast("Venta guardada exitosamente");
}

// Agregar cobro
function addCobro() {
  const idVenta = document.getElementById('cobroIdVenta').value.trim().toUpperCase();
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;

  if (!idVenta || monto <= 0) {
    alert("Ingresa ID de venta y monto válido");
    return;
  }

  const venta = ventas.find(v => v.id === idVenta);
  if (!venta) {
    alert("Venta no encontrada");
    return;
  }

  if (monto > venta.saldo) {
    alert(`El monto no puede superar el saldo pendiente (C$${venta.saldo.toLocaleString()})`);
    return;
  }

  venta.pagado += monto;
  venta.saldo = venta.precioTotal - venta.pagado;
  venta.estado = venta.saldo <= 0 ? "PAGADO" : "PENDIENTE";

  saveData();
  renderVentas();
  hideForms();
  showToast(`Cobro de C$${monto.toLocaleString()} registrado`);
}

// Eliminar lote
function deleteLote(index) {
  if (confirm("¿Estás seguro de eliminar este lote? Esta acción no se puede deshacer.")) {
    lotes.splice(index, 1);
    saveData();
    renderLotes();
    showToast("Lote eliminado");
  }
}

// Eliminar venta
function deleteVenta(index) {
  if (confirm("¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.")) {
    ventas.splice(index, 1);
    saveData();
    renderVentas();
    showToast("Venta eliminada");
  }
}

// Cerrar formularios con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideForms();
});

// Inicializar
window.onload = function() {
  renderLotes();
  renderVentas();
  updateResumen();
  updateCounts();
  
  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registrado'))
      .catch(err => console.log('Error registrando SW:', err));
  }
};