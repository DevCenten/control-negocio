// Mostrar lotes
const lotesDiv = document.getElementById("lotes");
lotes.forEach(lote => {
  const colorEstado = lote.estado === "PENDIENTE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  const div = document.createElement("div");
  div.className = `p-4 rounded-lg border ${colorEstado}`;
  div.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <p class="font-bold text-lg">${lote.id}</p>
        <p class="text-sm">Recepcion: ${lote.fechaRecepcion}</p>
      </div>
      <div class="text-right">
        <p class="text-xl font-semibold">Saldo: C$${lote.saldoPendiente.toLocaleString()}</p>
        <span class="px-3 py-1 rounded-full text-sm font-medium ${colorEstado}">
          ${lote.estado}
        </span>
      </div>
    </div>
  `;
  lotesDiv.appendChild(div);
});

// Mostrar ventas (similar)
const ventasDiv = document.getElementById("ventas");
ventas.forEach(venta => {
  const colorEstado = venta.estado === "PENDIENTE" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800";
  const div = document.createElement("div");
  div.className = `p-4 rounded-lg border ${colorEstado}`;
  div.innerHTML = `
    <p class="font-bold">${venta.cliente}</p>
    <p class="text-sm text-gray-600">Venta: C$${venta.precioTotal.toLocaleString()}</p>
    <div class="flex justify-between mt-2">
      <p>Pagado: C$${venta.pagado.toLocaleString()}</p>
      <p class="font-semibold">Saldo: C$${venta.saldo.toLocaleString()}</p>
    </div>
    <span class="px-3 py-1 rounded-full text-sm font-medium mt-2 inline-block ${colorEstado}">
      ${venta.estado}
    </span>
  `;
  ventasDiv.appendChild(div);
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado', reg))
      .catch(err => console.log('Error al registrar SW', err));
  });
}