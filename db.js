/* ═══════════════════════════════════════════════════════════
   db.js — Módulo de almacenamiento con IndexedDB
   ═══════════════════════════════════════════════════════════ */

const DB_NAME = 'variedades_karen_db';
const DB_VERSION = 1;
const STORES = ['proveedores', 'compras', 'ventas', 'clientes', 'pagosProveedor', 'cobros', 'config'];

let db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      STORES.forEach(store => {
        if (!database.objectStoreNames.contains(store)) {
          const objStore = database.createObjectStore(store, { keyPath: 'id' });
          if (store !== 'config') objStore.createIndex('lastModified', 'lastModified');
        }
      });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function guardarEn(store, registro) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite');
    tx.objectStore(store).put(registro);
    tx.oncomplete = () => resolve(registro);
    tx.onerror = () => reject(tx.error);
  });
}

async function obtenerTodos(store) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function obtenerUno(store, id) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function eliminarDe(store, id) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function vaciarStore(store) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function guardarMultiples(store, registros) {
  const database = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    registros.forEach(r => os.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── API global tipo "estado en memoria" ───
const DB = {
  proveedores: [],
  compras: [],
  ventas: [],
  clientes: [],
  pagosProveedor: [],
  cobros: [],

  async cargarTodo() {
    const [proveedores, compras, ventas, clientes, pagosProveedor, cobros] = await Promise.all([
      obtenerTodos('proveedores'),
      obtenerTodos('compras'),
      obtenerTodos('ventas'),
      obtenerTodos('clientes'),
      obtenerTodos('pagosProveedor'),
      obtenerTodos('cobros')
    ]);
    this.proveedores = proveedores;
    this.compras = compras;
    this.ventas = ventas;
    this.clientes = clientes;
    this.pagosProveedor = pagosProveedor;
    this.cobros = cobros;
  },

  async guardarProveedor(p) { await guardarEn('proveedores', p); },
  async guardarCompra(c) { await guardarEn('compras', c); },
  async guardarVenta(v) { await guardarEn('ventas', v); },
  async guardarCliente(c) { await guardarEn('clientes', c); },
  async guardarPago(p) { await guardarEn('pagosProveedor', p); },
  async guardarCobro(c) { await guardarEn('cobros', c); },

  async eliminarProveedor(id) { await eliminarDe('proveedores', id); },
  async eliminarCompra(id) { await eliminarDe('compras', id); },
  async eliminarVenta(id) { await eliminarDe('ventas', id); },
  async eliminarCliente(id) { await eliminarDe('clientes', id); },
  async eliminarPago(id) { await eliminarDe('pagosProveedor', id); },
  async eliminarCobro(id) { await eliminarDe('cobros', id); },

  async vaciarTodo() {
    for (const store of STORES) {
      if (store !== 'config') await vaciarStore(store);
    }
  }
};

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}