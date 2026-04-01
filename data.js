// Datos iniciales de ejemplo - Solo se cargan si no hay datos en localStorage
const initialLotes = [
  {
    id: "L01",
    fechaRecepcion: "2026-02-10",
    fechaLimite: "2026-04-10",
    totalInicial: 128640,
    abonado: 120337,
    saldoPendiente: 8303,
    estado: "PENDIENTE",
    productos: [
      { nombre: "Refrigeradora MABE 10 pies", cantidad: 1, precioCarmen: 12400, vendido: true },
      { nombre: "Refrigeradora MABE 14 pies", cantidad: 1, precioCarmen: 21100, vendido: true },
      { nombre: "Cama Matrimonial", cantidad: 2, precioCarmen: 7000, vendido: true },
      { nombre: "Lavadora LG 19kg", cantidad: 1, precioCarmen: 11500, vendido: false },
      { nombre: "Cocina MABE 6 quemadores", cantidad: 2, precioCarmen: 16000, vendido: true },
      { nombre: "Lavadora LG 16kg", cantidad: 1, precioCarmen: 14000, vendido: false },
      { nombre: "Cama Unipersonal Buen Sueño", cantidad: 1, precioCarmen: 4800, vendido: true },
      { nombre: "Cocina Negra 6 Quemadores", cantidad: 1, precioCarmen: 9700, vendido: true },
      { nombre: "Cama Unipersonal Deluxe", cantidad: 1, precioCarmen: 9140, vendido: false }
    ]
  },
  {
    id: "L02",
    fechaRecepcion: "2026-02-27",
    fechaLimite: "2026-04-27",
    totalInicial: 73010,
    abonado: 0,
    saldoPendiente: 73010,
    estado: "PENDIENTE",
    productos: [
      { nombre: "Cocina Negra MABE 6q", cantidad: 1, precioCarmen: 9700, vendido: false },
      { nombre: "Cocina Acero Inoxidable MABE", cantidad: 1, precioCarmen: 11360, vendido: false },
      { nombre: "Sillón Sofá Cama CAPRI", cantidad: 1, precioCarmen: 10500, vendido: false },
      { nombre: "Refrigeradora 8 pies MABE", cantidad: 1, precioCarmen: 9700, vendido: false },
      { nombre: "Cocina de mesa SANKEY", cantidad: 1, precioCarmen: 2350, vendido: false },
      { nombre: "Televisor 32 pulg LG", cantidad: 2, precioCarmen: 8500, vendido: false },
      { nombre: "Refrigeradora 10 pies MABE", cantidad: 1, precioCarmen: 12400, vendido: false }
    ]
  }
];

const initialVentas = [
  {
    id: "V001",
    cliente: "Tania Martínez",
    telefono: "",
    fecha: "2026-02-10",
    productos: [
      { nombre: "Cama Matrimonial", cantidad: 1, precioCarmen: 7000, precioVenta: 10930 }
    ],
    precioTotal: 32790,
    prima: 0,
    saldo: 32180,
    meses: 12,
    cuotaMensual: 2731.67,
    pagado: 610,
    estado: "PENDIENTE",
    proximaFechaCobro: "2026-04-10"
  }
];