let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];

function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  updateResumen();
}

function updateResumen() {
  const deudaCarmen = lotes.reduce((sum, l) => sum + (l.saldoPendiente || 0), 0);
  const clientesDeben = ventas.reduce((sum, v) => sum + (v.saldo || 0), 0);
  const ventasActivas = ventas.length;
  const gananciaEstimada = ventas.reduce((sum, v) => sum + Math.round((v.precioTotal || 0) * 0.35), 0);

  document.getElementById('deudaCarmen').textContent = `C$${deudaCarmen.toLocaleString()}`;
  document.getElementById('clientesDeben').textContent = `C$${clientesDeben.toLocaleString()}`;
  document.getElementById('ventasActivas').textContent = ventasActivas;
  document.getElementById('gananciaEstimada').textContent = `C$${gananciaEstimada.toLocaleString()}`;
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

// Formularios
function showForm(type) {
  hideForms();
  document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`).classList.remove('hidden');
}

function hideForms() {
  ['formLote', 'formVenta', 'formCobro'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

// Agregar Lote, Venta, Cobro (mantengo las funciones anteriores)
function addLote() { /* tu código anterior */ }
function addVenta() { /* tu código anterior */ }
function addCobro() { /* tu código anterior */ }

function deleteLote(index) {
  if (confirm("¿Eliminar este lote?")) {
    lotes.splice(index, 1);
    saveData();
    renderLotes();
  }
}

function deleteVenta(index) {
  if (confirm("¿Eliminar esta venta?")) {
    ventas.splice(index, 1);
    saveData();
    renderVentas();
  }
}

// Inicializar
window.onload = function() {
  renderLotes();
  renderVentas();
  updateResumen();
};