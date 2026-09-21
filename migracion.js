/* ═══════════════════════════════════════════════════════════
   migracion.js — Convierte datos del esquema viejo al nuevo
   ═══════════════════════════════════════════════════════════ */

const ESQUEMA_VERSION = 2;

/**
 * Detecta el formato de un backup/objeto de datos.
 * v1: { lotes, compras, ventas, abonos, cobros }
 * v2: { proveedores, compras, ventas, clientes, pagosProveedor, cobros, version }
 */
function detectarVersion(datos) {
  if (!datos) return 0;
  if (datos.version === 2 || datos.proveedores) return 2;
  if (datos.lotes || datos.abonos) return 1;
  return 0;
}

/**
 * Migra datos v1 → v2.
 * - Lotes → Compras a crédito del proveedor "Carmen"
 * - Abonos → pagosProveedor a Carmen
 * - Compras → Compras del proveedor "Varios" con tipo contado
 * - Ventas → Ventas (mismo formato, se agrega clienteId)
 * - Cobros → Cobros (mismo formato)
 */
function migrarV1aV2(datosViejos) {
  const proveedores = [];
  const compras = [];
  const ventas = [];
  const clientes = [];
  const pagosProveedor = [];
  const cobros = datosViejos.cobros || [];

  // ─── 1. Proveedor Carmen (por los lotes) ───
  const carmenId = 'prov_carmen';
  const lotesViejos = datosViejos.lotes || [];
  const abonosViejos = datosViejos.abonos || [];

  if (lotesViejos.length > 0 || abonosViejos.length > 0) {
    proveedores.push({
      id: carmenId,
      nombre: 'Carmen',
      telefono: '',
      tipo: 'credito',
      notas: 'Proveedor migrado desde el sistema anterior (lotes)',
      lastModified: Date.now()
    });
  }

  // ─── 2. Convertir Lotes → Compras ───
  lotesViejos.forEach(lote => {
    const total = parseFloat(lote.totalInicial) || 0;
    const pagado = parseFloat(lote.abonado) || 0;
    const saldo = parseFloat(lote.saldoPendiente) || 0;
    compras.push({
      id: lote.id,
      proveedorId: carmenId,
      fecha: lote.fechaRecepcion,
      fechaLimite: lote.fechaLimite,
      tipoPago: 'credito',
      productos: (lote.productos || []).map(p => ({
        nombre: p.nombre,
        cantidad: parseInt(p.cantidad) || 1,
        precioCompra: parseFloat(p.precioCarmen) || 0,
        serie: '',
        modelo: '',
        foto: null,
        vendido: !!p.vendido
      })),
      total,
      pagado,
      saldo,
      estado: saldo <= 0 ? 'PAGADO' : 'PENDIENTE',
      origenMigracion: 'lote_v1',
      lastModified: Date.now()
    });
  });

  // ─── 3. Convertir Abonos → Pagos a Proveedor ───
  abonosViejos.forEach(a => {
    pagosProveedor.push({
      id: a.id,
      proveedorId: carmenId,
      compraId: a.loteId,
      fecha: a.fecha,
      monto: parseFloat(a.monto) || 0,
      metodo: a.metodo || 'Efectivo',
      notas: a.notas || '',
      lastModified: Date.now()
    });
  });

  // ─── 4. Proveedor "Varios" para las compras viejas ───
  const comprasViejas = datosViejos.compras || [];
  let variosId = null;
  if (comprasViejas.length > 0) {
    variosId = 'prov_varios';
    proveedores.push({
      id: variosId,
      nombre: 'Varios',
      telefono: '',
      tipo: 'ambos',
      notas: 'Proveedor genérico para compras migradas',
      lastModified: Date.now()
    });
  }

  comprasViejas.forEach(c => {
    const total = (c.productos || []).reduce((s, p) =>
      s + ((parseFloat(p.precioCompra) || 0) * (parseInt(p.cantidad) || 1)), 0);
    compras.push({
      id: c.id,
      proveedorId: variosId,
      fecha: c.fecha,
      tipoPago: 'contado',
      productos: (c.productos || []).map(p => ({
        nombre: p.nombre,
        cantidad: parseInt(p.cantidad) || 1,
        precioCompra: parseFloat(p.precioCompra) || 0,
        serie: '',
        modelo: '',
        foto: null,
        vendido: !!p.vendido
      })),
      total,
      pagado: total,
      saldo: 0,
      estado: 'PAGADO',
      proveedorNombreOriginal: c.proveedor || '',
      origenMigracion: 'compra_v1',
      lastModified: Date.now()
    });
  });

  // ─── 5. Ventas (mismo formato + clienteId) ───
  const ventasViejas = datosViejos.ventas || [];
  const clientesMap = new Map();

  ventasViejas.forEach(v => {
    const clienteNombre = (v.cliente || '').trim();
    const clienteKey = clienteNombre.toLowerCase();
    let clienteId;

    if (clientesMap.has(clienteKey)) {
      clienteId = clientesMap.get(clienteKey);
    } else {
      clienteId = 'cli_' + generarId();
      clientesMap.set(clienteKey, clienteId);
      clientes.push({
        id: clienteId,
        nombre: clienteNombre || 'Cliente sin nombre',
        telefono: v.telefono || '',
        notas: '',
        lastModified: Date.now()
      });
    }

    ventas.push({
      id: v.id,
      clienteId,
      cliente: clienteNombre,
      telefono: v.telefono || '',
      fecha: v.fecha,
      productos: v.productos || [],
      precioTotal: parseFloat(v.precioTotal) || 0,
      prima: parseFloat(v.prima) || 0,
      saldo: parseFloat(v.saldo) || 0,
      pagado: parseFloat(v.pagado) || 0,
      meses: parseInt(v.meses) || 12,
      cuotaMensual: parseFloat(v.cuotaMensual) || 0,
      estado: v.estado || 'PENDIENTE',
      proximaFechaCobro: v.proximaFechaCobro || v.fecha,
      tipoPago: v.tipoPago || 'credito',
      frecuenciaPago: v.frecuenciaPago || 'mensual',
      fechasPersonalizadas: v.fechasPersonalizadas || [],
      lastModified: Date.now()
    });
  });

  return {
    version: ESQUEMA_VERSION,
    proveedores,
    compras,
    ventas,
    clientes,
    pagosProveedor,
    cobros,
    migradoEn: new Date().toISOString()
  };
}

/**
 * Detecta si hay datos viejos en localStorage y los migra.
 * Devuelve true si migró algo.
 */
async function migrarDesdeLocalStorage() {
  const lotesStr = localStorage.getItem('lotes');
  const comprasStr = localStorage.getItem('compras');
  const ventasStr = localStorage.getItem('ventas');
  const abonosStr = localStorage.getItem('abonos');
  const cobrosStr = localStorage.getItem('cobros');

  if (!lotesStr && !comprasStr && !ventasStr) return false;

  const datosViejos = {
    lotes: lotesStr ? JSON.parse(lotesStr) : [],
    compras: comprasStr ? JSON.parse(comprasStr) : [],
    ventas: ventasStr ? JSON.parse(ventasStr) : [],
    abonos: abonosStr ? JSON.parse(abonosStr) : [],
    cobros: cobrosStr ? JSON.parse(cobrosStr) : []
  };

  const datosNuevos = migrarV1aV2(datosViejos);

  // Guardar en IndexedDB
  await DB.vaciarTodo();
  await guardarMultiples('proveedores', datosNuevos.proveedores);
  await guardarMultiples('compras', datosNuevos.compras);
  await guardarMultiples('ventas', datosNuevos.ventas);
  await guardarMultiples('clientes', datosNuevos.clientes);
  await guardarMultiples('pagosProveedor', datosNuevos.pagosProveedor);
  await guardarMultiples('cobros', datosNuevos.cobros);

  // Guardar backup de los datos viejos por seguridad
  localStorage.setItem('backup_pre_migracion_v2', JSON.stringify(datosViejos));

  // Marcar migración
  localStorage.setItem('migracion_v2_completada', new Date().toISOString());

  return true;
}

/**
 * Migra un objeto de backup (importado) al esquema actual.
 */
function migrarBackup(datos) {
  const version = detectarVersion(datos);
  if (version === 2) return datos;
  if (version === 1) return migrarV1aV2(datos);
  throw new Error('Formato de backup no reconocido');
}