// Datos
let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];

// Guardar
function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
  updateResumen();
}

// Resumen General
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

// Renderizar listas
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

// Funciones de formularios
function showForm(type) {
  hideForms();
  const form = document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (form) form.classList.remove('hidden');
}

function hideForms() {
  const forms = ['formLote', 'formVenta', 'formCobro'];
  forms.forEach(id => {
    const form = document.getElementById(id);
    if (form) form.classList.add('hidden');
  });
}

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

// Funciones básicas (agrega aquí tus funciones addLote, addVenta, addCobro si ya las tienes, o usa estas básicas)
function addLote() {
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const total = parseFloat(document.getElementById('loteTotal').value) || 0;

  if (!id || !fecha || total <= 0) {
    alert("Completa todos los campos");
    return;
  }

  lotes.push({
    id, fechaRecepcion: fecha, totalInicial: total, abonado: 0, saldoPendiente: total, estado: "PENDIENTE"
  });

  saveData();
  renderLotes();
  hideForms();
  alert("✅ Lote guardado");
}

function addVenta() {
  const id = document.getElementById('ventaId').value.trim().toUpperCase();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const total = parseFloat(document.getElementById('ventaTotal').value) || 0;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 0;

  if (!id || !cliente || total <= 0 || meses <= 0) {
    alert("Completa todos los campos");
    return;
  }

  ventas.push({
    id, cliente, precioTotal: total, pagado: prima, saldo: total - prima, estado: "PENDIENTE"
  });

  saveData();
  renderVentas();
  hideForms();
  alert("✅ Venta guardada");
}

function addCobro() {
  const idVenta = document.getElementById('cobroIdVenta').value.trim().toUpperCase();
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;

  if (!idVenta || monto <= 0) {
    alert("Ingresa ID de venta y monto");
    return;
  }

  const venta = ventas.find(v => v.id === idVenta);
  if (!venta) {
    alert("Venta no encontrada");
    return;
  }

  venta.pagado += monto;
  venta.saldo = venta.precioTotal - venta.pagado;
  venta.estado = venta.saldo <= 0 ? "PAGADO" : "PENDIENTE";

  saveData();
  renderVentas();
  hideForms();
  alert("✅ Cobro registrado");
}

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

// Inicializar cuando la página cargue completamente
window.onload = function() {
  renderLotes();
  renderVentas();
  updateResumen();
};