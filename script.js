// Cargar datos desde localStorage o usar iniciales
let lotes = JSON.parse(localStorage.getItem('lotes')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];

// Guardar datos en localStorage
function saveData() {
  localStorage.setItem('lotes', JSON.stringify(lotes));
  localStorage.setItem('ventas', JSON.stringify(ventas));
}

// Mostrar lotes
function renderLotes() {
  const div = document.getElementById('lotes');
  div.innerHTML = '';
  lotes.forEach(lote => {
    const color = lote.estado === 'PENDIENTE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    div.innerHTML += `
      <div class="p-4 rounded-lg border ${color}">
        <div class="flex justify-between">
          <div>
            <p class="font-bold text-lg">${lote.id}</p>
            <p class="text-sm">Recepcion: ${lote.fechaRecepcion}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-semibold">C$${lote.saldoPendiente.toLocaleString()}</p>
            <span class="px-3 py-1 rounded-full text-sm ${color}">${lote.estado}</span>
          </div>
        </div>
      </div>
    `;
  });
}

// Mostrar ventas
function renderVentas() {
  const div = document.getElementById('ventas');
  div.innerHTML = '';
  ventas.forEach(venta => {
    const color = venta.estado === 'PENDIENTE' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
    div.innerHTML += `
      <div class="p-4 rounded-lg border ${color}">
        <p class="font-bold">${venta.cliente}</p>
        <p class="text-sm">Total: C$${venta.precioTotal.toLocaleString()}</p>
        <div class="flex justify-between mt-2">
          <p>Pagado: C$${venta.pagado.toLocaleString()}</p>
          <p class="font-semibold">Saldo: C$${venta.saldo.toLocaleString()}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-sm mt-2 inline-block ${color}">${venta.estado}</span>
      </div>
    `;
  });
}

// Agregar nuevo lote
function addLote() {
  const id = document.getElementById('loteId').value.trim();
  const fecha = document.getElementById('loteFecha').value;
  const total = parseFloat(document.getElementById('loteTotal').value) || 0;

  if (!id || !fecha || total <= 0) {
    alert('Completa todos los campos correctamente');
    return;
  }

  lotes.push({
    id,
    fechaRecepcion: fecha,
    totalInicial: total,
    abonado: 0,
    saldoPendiente: total,
    estado: 'PENDIENTE'
  });

  saveData();
  renderLotes();
  hideForms();
  document.getElementById('loteId').value = '';
  document.getElementById('loteFecha').value = '';
  document.getElementById('loteTotal').value = '';
}

// Agregar nueva venta (puedes expandir con más campos)
function addVenta() {
  const id = document.getElementById('ventaId').value.trim();
  const cliente = document.getElementById('ventaCliente').value.trim();
  const total = parseFloat(document.getElementById('ventaTotal').value) || 0;
  const prima = parseFloat(document.getElementById('ventaPrima').value) || 0;
  const meses = parseInt(document.getElementById('ventaMeses').value) || 0;

  if (!id || !cliente || total <= 0 || meses <= 0) {
    alert('Completa todos los campos correctamente');
    return;
  }

  ventas.push({
    id,
    cliente,
    precioTotal: total,
    pagado: prima,
    saldo: total - prima,
    estado: 'PENDIENTE'
  });

  saveData();
  renderVentas();
  hideForms();
  // Limpia campos...
}

// Agregar cobro (actualiza venta existente)
function addCobro() {
  const idVenta = document.getElementById('cobroIdVenta').value.trim();
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;

  if (!idVenta || monto <= 0) {
    alert('Ingresa ID Venta y monto válido');
    return;
  }

  const venta = ventas.find(v => v.id === idVenta);
  if (!venta) {
    alert('No se encontró esa venta');
    return;
  }

  venta.pagado += monto;
  venta.saldo = venta.precioTotal - venta.pagado;
  venta.estado = venta.saldo <= 0 ? 'PAGADO' : 'PENDIENTE';

  saveData();
  renderVentas();
  hideForms();
  alert('Cobro registrado con éxito');
}

// Cargar al inicio
renderLotes();
renderVentas();