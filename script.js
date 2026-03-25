let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];

function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
}

function renderLotes() {
  const container = document.getElementById('lotes');
  container.innerHTML = '';
  lotes.forEach(lote => {
    const color = lote.estado === 'PENDIENTE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    container.innerHTML += `
      <div class="p-5 rounded-2xl border ${color}">
        <div class="flex justify-between">
          <div>
            <p class="font-bold text-xl">${lote.id}</p>
            <p class="text-sm">${lote.fechaRecepcion}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold">C$${lote.saldoPendiente.toLocaleString()}</p>
            <span class="px-4 py-1 rounded-full text-xs font-medium ${color}">${lote.estado}</span>
          </div>
        </div>
      </div>`;
  });
}

function renderVentas() {
  const container = document.getElementById('ventas');
  container.innerHTML = '';
  ventas.forEach(venta => {
    const color = venta.estado === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
    container.innerHTML += `
      <div class="p-5 rounded-2xl border ${color}">
        <p class="font-bold text-lg">${venta.cliente}</p>
        <p class="text-sm">Total: C$${venta.precioTotal.toLocaleString()}</p>
        <div class="flex justify-between mt-3">
          <p>Pagado: C$${venta.pagado.toLocaleString()}</p>
          <p class="font-bold">Saldo: C$${venta.saldo.toLocaleString()}</p>
        </div>
        <span class="mt-3 inline-block px-4 py-1 rounded-full text-xs font-medium ${color}">${venta.estado}</span>
      </div>`;
  });
}

function showForm(type) {
  hideForms();
  document.getElementById(`form${type.charAt(0).toUpperCase() + type.slice(1)}`).classList.remove('hidden');
}

function hideForms() {
  document.getElementById('formLote').classList.add('hidden');
  document.getElementById('formVenta').classList.add('hidden');
  document.getElementById('formCobro').classList.add('hidden');
}

function addLote() {
  const id = document.getElementById('loteId').value.trim().toUpperCase();
  const fecha = document.getElementById('loteFecha').value;
  const total = parseFloat(document.getElementById('loteTotal').value) || 0;

  if (!id || !fecha || total <= 0) {
    alert("Completa todos los campos");
    return;
  }

  lotes.push({ id, fechaRecepcion: fecha, totalInicial: total, abonado: 0, saldoPendiente: total, estado: "PENDIENTE" });
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

  ventas.push({ id, cliente, precioTotal: total, pagado: prima, saldo: total - prima, estado: "PENDIENTE" });
  saveData();
  renderVentas();
  hideForms();
  alert("✅ Venta guardada");
}

function addCobro() {
  const idVenta = document.getElementById('cobroIdVenta').value.trim().toUpperCase();
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;

  if (!idVenta || monto <= 0) {
    alert("Ingresa ID y monto");
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

// Inicializar
renderLotes();
renderVentas();