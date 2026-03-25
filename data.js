// Datos iniciales de ejemplo - Se cargan solo si no hay datos en localStorage
const initialLotes = [
  {
    id: "L01",
    fechaRecepcion: "2026-02-10",
    totalInicial: 128640,
    abonado: 106137,
    saldoPendiente: 22503,
    estado: "PENDIENTE"
  },
  {
    id: "L02",
    fechaRecepcion: "2026-02-27",
    totalInicial: 73010,
    abonado: 0,
    saldoPendiente: 73010,
    estado: "PENDIENTE"
  }
];

const initialVentas = [
  {
    id: "V001",
    cliente: "Tania Martínez",
    precioTotal: 32790,
    pagado: 610,
    saldo: 32180,
    estado: "PENDIENTE",
    meses: 12,
    fecha: "2026-03-01T00:00:00.000Z"
  }
];