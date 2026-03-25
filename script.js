let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];

function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  updateResumen();        // ← Nueva línea
}

function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, l) => sum + l.saldoPendiente, 0);
  const clientesDeben = ventas.reduce((sum, v) => sum + v.saldo, 0);
  const ventasTotal = ventas.length;
  const ganancia = ventas.reduce((sum, v) => sum + (v.precioTotal * 0.3), 0); // estimación 30% ganancia

  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString()}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString()}`;
  document.getElementById('ventasTotal').textContent = ventasTotal;
  document.getElementById('ganancia').textContent = `C$${ganancia.toLocaleString()}`;
}

function renderLotes() {
  const container = document.getElementById('lotes');
  container.innerHTML = '';
  lotes.forEach((lote, index) => {
    const color = lote.estado === 'PENDIENTE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    container.innerHTML += `
      <div class="p-5 rounded-2xl border ${color} flex justify-between items-center">
        <div>
          <p class="font-bold text-xl">${lote.id}</p>
          <p class="text-sm">${lote.fechaRecepcion}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold">C$${lote.saldoPendiente.toLocaleString()}</p>
          <span class="px-4 py-1 rounded-full text-xs font-medium ${color}">${lote.estado}</span>
        </div>
        <button onclick="deleteLote(${index})" class="ml-4 text-red-600 text-2xl">🗑</button>
      </div>`;
  });
}

function renderVentas() {
  const container = document.getElementById('ventas');
  container.innerHTML = '';
  ventas.forEach((venta, index) => {
    const color = venta.estado === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
    container.innerHTML += `
      <div class="p-5 rounded-2xl border ${color} flex justify-between items-center">
        <div>
          <p class="font-bold">${venta.cliente}</p>
          <p class="text-sm">Total: C$${venta.precioTotal.toLocaleString()}</p>
        </div>
        <div class="text-right">
          <p>Pagado: C$${venta.pagado.toLocaleString()}</p>
          <p class="font-bold">Saldo: C$${venta.saldo.toLocaleString()}</p>
          <span class="px-4 py-1 rounded-full text-xs font-medium ${color}">${venta.estado}</span>
        </div>
        <button onclick="deleteVenta(${index})" class="ml-4 text-red-600 text-2xl">🗑</button>
      </div>`;
  });
}

// Buscar cliente en cobro
function buscarCliente() {
  const id = document.getElementById('cobroIdVenta').value.trim().toUpperCase();
  const info = document.getElementById('infoCliente');
  const venta = ventas.find(v => v.id === id);
  if (venta) {
    info.innerHTML = `Cliente: <strong>${venta.cliente}</strong><br>Saldo actual: <strong>C$${venta.saldo.toLocaleString()}</strong>`;
  } else {
    info.innerHTML = '';
  }
}

// Funciones addLote, addVenta, addCobro, deleteLote, deleteVenta, showForm, hideForms
// (las mismas del mensaje anterior, las mantengo cortas para no alargar)

function addLote() { /* mismo código del mensaje anterior */ }
function addVenta() { /* mismo código */ }
function addCobro() { /* mismo código */ }
function deleteLote(index) { /* mismo código */ }
function deleteVenta(index) { /* mismo código */ }
function hideForms() { /* mismo código */ }
function showForm(type) { /* mismo código */ }

// ==================== RESUMEN GENERAL ====================
function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, lote) => sum + (lote.saldoPendiente || 0), 0);
  const clientesDeben = ventas.reduce((sum, venta) => sum + (venta.saldo || 0), 0);
  const ventasActivas = ventas.length;
  const gananciaEstimada = ventas.reduce((sum, venta) => sum + Math.round((venta.precioTotal || 0) * 0.35), 0); // estimación 35% ganancia

  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString()}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString()}`;
  document.getElementById('ventasActivas').textContent = ventasActivas;
  document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString()}`;
}

// Inicializar
renderLotes();
renderVentas();
updateResumen();
updateResumen();