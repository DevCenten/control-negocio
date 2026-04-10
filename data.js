// Datos iniciales del backup - Solo se cargan si no hay datos en localStorage
const initialLotes = [
  {
    "id": "L01",
    "fechaRecepcion": "2026-02-10",
    "fechaLimite": "2026-04-10",
    "totalInicial": 128640,
    "abonado": 128640,
    "saldoPendiente": 0,
    "estado": "PAGADO",
    "productos": [
      { "nombre": "Refrigeradora MABE 10 pies", "cantidad": 1, "precioCarmen": 12400, "vendido": true },
      { "nombre": "Refrigeradora MABE 14 pies", "cantidad": 1, "precioCarmen": 21100, "vendido": true },
      { "nombre": "Cama Matrimonial", "cantidad": 2, "precioCarmen": 7000, "vendido": true },
      { "nombre": "Lavadora LG 19kg", "cantidad": 1, "precioCarmen": 11500, "vendido": false },
      { "nombre": "Cocina MABE 6 quemadores", "cantidad": 2, "precioCarmen": 16000, "vendido": true },
      { "nombre": "Lavadora LG 16kg", "cantidad": 1, "precioCarmen": 14000, "vendido": false },
      { "nombre": "Cama Unipersonal Buen Sueño", "cantidad": 1, "precioCarmen": 4800, "vendido": true },
      { "nombre": "Cocina Negra 6 Quemadores", "cantidad": 1, "precioCarmen": 9700, "vendido": true },
      { "nombre": "Cama Unipersonal Deluxe", "cantidad": 1, "precioCarmen": 9140, "vendido": false }
    ],
    "lastModified": "1774657474055"
  },
  {
    "id": "L02",
    "fechaRecepcion": "2026-02-27",
    "fechaLimite": "2026-04-27",
    "totalInicial": 73010,
    "abonado": 31200,
    "saldoPendiente": 41810,
    "estado": "PENDIENTE",
    "productos": [
      { "nombre": "Cocina Negra MABE 6q", "cantidad": 1, "precioCarmen": 9700, "vendido": false },
      { "nombre": "Cocina Acero Inoxidable MABE", "cantidad": 1, "precioCarmen": 11360, "vendido": true },
      { "nombre": "Sillón Sofá Cama CAPRI", "cantidad": 1, "precioCarmen": 10500, "vendido": false },
      { "nombre": "Refrigeradora 8 pies MABE", "cantidad": 1, "precioCarmen": 9700, "vendido": true },
      { "nombre": "Cocina de mesa SANKEY", "cantidad": 1, "precioCarmen": 2350, "vendido": false },
      { "nombre": "Televisor 32 pulg LG", "cantidad": 2, "precioCarmen": 8500, "vendido": false },
      { "nombre": "Refrigeradora 10 pies MABE", "cantidad": 1, "precioCarmen": 12400, "vendido": true }
    ],
    "lastModified": 1775782733145
  },
  {
    "id": "L03",
    "fechaRecepcion": "2026-03-04",
    "fechaLimite": "2026-05-04",
    "totalInicial": 41160,
    "abonado": 0,
    "saldoPendiente": 41160,
    "estado": "PENDIENTE",
    "productos": [
      { "nombre": "Cama Unipersonal Buen Sueño CAPRI", "cantidad": 2, "precioCarmen": 4800, "vendido": false },
      { "nombre": "Cama Matrimonial DUROFOAM", "cantidad": 1, "precioCarmen": 9300, "vendido": false },
      { "nombre": "Cama Queen Wonder INDUFOAM", "cantidad": 1, "precioCarmen": 10760, "vendido": false },
      { "nombre": "Sofá Color Gris MONTERREY", "cantidad": 1, "precioCarmen": 11500, "vendido": false }
    ],
    "lastModified": 1775602947727
  },
  {
    "id": "L04",
    "fechaRecepcion": "2026-03-07",
    "fechaLimite": "2026-05-07",
    "totalInicial": 47460,
    "abonado": 0,
    "saldoPendiente": 47460,
    "estado": "PENDIENTE",
    "productos": [
      { "nombre": "Cama Unipersonal FRESCOFOAM", "cantidad": 1, "precioCarmen": 7420, "vendido": false },
      { "nombre": "Cama Queen WONDER", "cantidad": 1, "precioCarmen": 10760, "vendido": false },
      { "nombre": "Cama Matrimonial ORTHOADVANCE", "cantidad": 1, "precioCarmen": 11900, "vendido": false },
      { "nombre": "Lavadora Semiautomática MABE 18kg", "cantidad": 1, "precioCarmen": 8030, "vendido": true },
      { "nombre": "Lavadora Semiautomática MABE 22kg", "cantidad": 1, "precioCarmen": 9350, "vendido": false }
    ],
    "lastModified": 1775602947727
  },
  {
    "id": "L05",
    "fechaRecepcion": "2026-03-16",
    "fechaLimite": "2026-05-28",
    "totalInicial": 46830,
    "abonado": 0,
    "saldoPendiente": 46830,
    "estado": "PENDIENTE",
    "productos": [
      { "nombre": "Refrigeradora MABE 10 pies", "cantidad": 1, "precioCarmen": 12400, "vendido": false },
      { "nombre": "Cama Queen Fresco Foam", "cantidad": 1, "precioCarmen": 10710, "vendido": true },
      { "nombre": "Cama Queen OrthoAdvance", "cantidad": 1, "precioCarmen": 14020, "vendido": true },
      { "nombre": "Refrigeradora MABE 8 pies", "cantidad": 1, "precioCarmen": 9700, "vendido": false }
    ],
    "lastModified": 1774661225553
  }
];

const initialCompras = [
  {
    "id": "C01",
    "fecha": "2026-03-21",
    "proveedor": "Por tránsito",
    "productos": [
      { "nombre": "Televisor HICENSE 50 pulgadas", "cantidad": 1, "precioCompra": 12000, "vendido": true }
    ],
    "lastModified": 1775237103372
  },
  {
    "id": "C02",
    "fecha": "2026-03-22",
    "proveedor": "Era mía",
    "productos": [
      { "nombre": "Lavadora LG automática", "cantidad": 1, "precioCompra": 9000, "vendido": true }
    ],
    "lastModified": 1775237390011
  },
  {
    "id": "C03",
    "fecha": "2026-03-26",
    "proveedor": "Compra en linea",
    "productos": [
      { "nombre": "Cocina MABE 4 quemadores", "cantidad": 1, "precioCompra": 7500, "vendido": true }
    ],
    "lastModified": 1775237946110
  },
  {
    "id": "C04",
    "fecha": "2026-03-26",
    "proveedor": "CELULAR",
    "productos": [
      { "nombre": "XIAOMI REDMI 11 PRO", "cantidad": 1, "precioCompra": 8900, "vendido": true }
    ],
    "lastModified": 1775330965545
  },
  {
    "id": "C05",
    "fecha": "2026-04-04",
    "proveedor": "CELULAR",
    "productos": [
      { "nombre": "Redmi A5", "cantidad": 1, "precioCompra": 4670, "vendido": true }
    ],
    "lastModified": 1775331248477
  },
  {
    "id": "C06",
    "fecha": "2026-04-01",
    "proveedor": "CELULAR",
    "productos": [
      { "nombre": "REDMI 15C", "cantidad": 1, "precioCompra": 6900, "vendido": true }
    ],
    "lastModified": 1775332474577
  }
];

const initialVentas = [
  {
    "id": "V001",
    "cliente": "Tania Martínez",
    "telefono": "",
    "fecha": "2026-02-10",
    "productos": [
      { "nombre": "Cama Matrimonial", "cantidad": 1, "precioCarmen": 7000, "precioCompra": 0, "precioVenta": 10500, "sourceType": "manual", "sourceId": null },
      { "nombre": "Refrijeradora 10 pies MABE", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 18600, "sourceType": "manual", "sourceId": null },
      { "nombre": "Lavadora MABE", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 11100, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 40200,
    "prima": 810,
    "saldo": 38780,
    "meses": 12,
    "cuotaMensual": 3299.17,
    "pagado": 1420,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-10",
    "lastModified": 1775357692959
  },
  {
    "id": "V002",
    "cliente": "Cristhel Janiuska Ramirez",
    "telefono": "",
    "fecha": "2026-02-10",
    "productos": [
      { "nombre": "Cocina MABE", "cantidad": 1, "precioCarmen": 16000, "precioCompra": 0, "precioVenta": 20000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 54300,
    "prima": 10000,
    "saldo": 36900,
    "meses": 12,
    "cuotaMensual": 3691.67,
    "pagado": 17400,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-06-10",
    "lastModified": 1775778431464
  },
  {
    "id": "V003",
    "cliente": "Darling Marenco",
    "telefono": "",
    "fecha": "2026-03-27",
    "productos": [
      { "nombre": "Cama unipersonal buen sueño", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 7200, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 7200,
    "prima": 0,
    "saldo": 7200,
    "meses": 12,
    "cuotaMensual": 600,
    "pagado": 0,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-27",
    "lastModified": 1774661811252
  },
  {
    "id": "V004",
    "cliente": "Sharon Denisse Mejía Ortiz",
    "telefono": "",
    "fecha": "2026-02-10",
    "productos": [
      { "nombre": "Cocina MABE 6 quemadores", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 24700, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 24700,
    "prima": 0,
    "saldo": 22641,
    "meses": 12,
    "cuotaMensual": 2058.33,
    "pagado": 2059,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-10",
    "lastModified": 1774667537851
  },
  {
    "id": "V005",
    "cliente": "Dina Sevilla",
    "telefono": "",
    "fecha": "2026-03-28",
    "productos": [
      { "nombre": "Cama Unipersonal CAPRI", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 7200, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 7200,
    "prima": 0,
    "saldo": 4800,
    "meses": 6,
    "cuotaMensual": 1200,
    "pagado": 2400,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-06-28",
    "lastModified": 1775358594478
  },
  {
    "id": "V006",
    "cliente": "Jose Adan Martinez Martinez",
    "telefono": "",
    "fecha": "2026-02-10",
    "productos": [
      { "nombre": "Cama matrimonial CAPRI", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 10500, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 10500,
    "prima": 0,
    "saldo": 7835,
    "meses": 8,
    "cuotaMensual": 1312.5,
    "pagado": 2665,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-10",
    "lastModified": 1774667933335
  },
  {
    "id": "V007",
    "cliente": "Carla Vanessa Paniagua Narvaez",
    "telefono": "",
    "fecha": "2026-02-10",
    "productos": [
      { "nombre": "Cocina MABE 6 quemadores", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 15000, "sourceType": "manual", "sourceId": null },
      { "nombre": "Lavadora LG", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 21000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 36000,
    "prima": 0,
    "saldo": 30000,
    "meses": 12,
    "cuotaMensual": 3000,
    "pagado": 6000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-10",
    "lastModified": 1774669404426
  },
  {
    "id": "V008",
    "cliente": "Ana Gabriela Ruiz",
    "telefono": "",
    "fecha": "2026-02-11",
    "productos": [
      { "nombre": "Lavadora Semiautomática LG", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 18000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 18000,
    "prima": 0,
    "saldo": 14860,
    "meses": 12,
    "cuotaMensual": 1500,
    "pagado": 3140,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-11",
    "lastModified": 1774669715511
  },
  {
    "id": "V009",
    "cliente": "Renatta Rojas",
    "telefono": "",
    "fecha": "2026-02-24",
    "productos": [
      { "nombre": "Cama unipersonal INDUFOAM DELUXE", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 14000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 14000,
    "prima": 3000,
    "saldo": 8500,
    "meses": 10,
    "cuotaMensual": 1100,
    "pagado": 5500,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-24",
    "lastModified": 1774669903970
  },
  {
    "id": "V010",
    "cliente": "Jose Antonio Sanchez",
    "telefono": "",
    "fecha": "2026-03-01",
    "productos": [
      { "nombre": "Sofá cama CAPRI", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 16800, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 16800,
    "prima": 0,
    "saldo": 15120,
    "meses": 10,
    "cuotaMensual": 1680,
    "pagado": 1680,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-29",
    "lastModified": 1774671425512
  },
  {
    "id": "V011",
    "cliente": "Luz Sevilla",
    "telefono": "",
    "fecha": "2026-03-03",
    "productos": [
      { "nombre": "Refrigeradora MABE 1O pies", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 16800, "sourceType": "manual", "sourceId": null },
      { "nombre": "Cocina MABE 6 quemadores", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 15000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 31800,
    "prima": 0,
    "saldo": 29800,
    "meses": 12,
    "cuotaMensual": 2650,
    "pagado": 2000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-03",
    "lastModified": 1775332791968
  },
  {
    "id": "V012",
    "cliente": "Karla Gabriela Navarrete Carvajal",
    "telefono": "",
    "fecha": "2026-03-04",
    "productos": [
      { "nombre": "Cama Queen wonder indufoam", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 17771, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 17771,
    "prima": 1771,
    "saldo": 14229,
    "meses": 10,
    "cuotaMensual": 1600,
    "pagado": 3542,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-04",
    "lastModified": 1774830901806
  },
  {
    "id": "V013",
    "cliente": "Maria Luisa Roque",
    "telefono": "",
    "fecha": "2026-03-04",
    "productos": [
      { "nombre": "Sillón CAPRI", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 11500, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 11500,
    "prima": 1000,
    "saldo": 6800,
    "meses": 10,
    "cuotaMensual": 1050,
    "pagado": 4700,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-04",
    "lastModified": 1774831756284
  },
  {
    "id": "V014",
    "cliente": "Zaida del Carmen Ramirez",
    "telefono": "",
    "fecha": "2026-03-07",
    "productos": [
      { "nombre": "Cama unipersonal FRESCOFOAM", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 11900, "sourceType": "manual", "sourceId": null },
      { "nombre": "Cama Queen Indufoam WONDER", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 17710, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 29610,
    "prima": 2470,
    "saldo": 24670,
    "meses": 12,
    "cuotaMensual": 2261.67,
    "pagado": 4940,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-07",
    "lastModified": 1774832067263
  },
  {
    "id": "V015",
    "cliente": "Dilan Javier Castro",
    "telefono": "",
    "fecha": "2026-03-07",
    "productos": [
      { "nombre": "Cama INDUFOAM ORTHOADVANCE", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 17760, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 17760,
    "prima": 0,
    "saldo": 16280,
    "meses": 12,
    "cuotaMensual": 1480,
    "pagado": 1480,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-07",
    "lastModified": 1774832272876
  },
  {
    "id": "V016",
    "cliente": "Sandra del Socorro Solis Torrez",
    "telefono": "",
    "fecha": "2026-03-08",
    "productos": [
      { "nombre": "Cama Unipersonal CAPRI", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 7200, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 7200,
    "prima": 1200,
    "saldo": 4800,
    "meses": 6,
    "cuotaMensual": 1000,
    "pagado": 2400,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-06-08",
    "lastModified": 1775188702585
  },
  {
    "id": "V017",
    "cliente": "Luis David Acevedo Vasquez",
    "telefono": "",
    "fecha": "2026-03-13",
    "productos": [
      { "nombre": "Lavadora Semiautomática MABE 18kg", "cantidad": 1, "precioCarmen": 8030, "precioCompra": 0, "precioVenta": 12100, "sourceType": "lote", "sourceId": "L04" }
    ],
    "precioTotal": 12100,
    "prima": 0,
    "saldo": 11500,
    "meses": 10,
    "cuotaMensual": 1210,
    "pagado": 600,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-13",
    "lastModified": 1775333263945
  },
  {
    "id": "V018",
    "cliente": "Mayra del Socorro Hurtado",
    "telefono": "",
    "fecha": "2026-03-14",
    "productos": [
      { "nombre": "Televisor LG 32 pulgadas", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 10500, "sourceType": "manual", "sourceId": null },
      { "nombre": "Refrigeradora MABE", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 14550, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 25050,
    "prima": 0,
    "saldo": 23550,
    "meses": 12,
    "cuotaMensual": 2087.5,
    "pagado": 1500,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-14",
    "lastModified": 1775333204474
  },
  {
    "id": "V019",
    "cliente": "Juan Carlos Salazar Sanchez",
    "telefono": "",
    "fecha": "2026-03-16",
    "productos": [
      { "nombre": "Refrigeradora 10 pies MABE", "cantidad": 1, "precioCarmen": 12400, "precioCompra": 0, "precioVenta": 16800, "sourceType": "lote", "sourceId": "L02" }
    ],
    "precioTotal": 16800,
    "prima": 0,
    "saldo": 15400,
    "meses": 12,
    "cuotaMensual": 1400,
    "pagado": 1400,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-16",
    "lastModified": 1775248374816
  },
  {
    "id": "V020",
    "cliente": "Angélica Maria Pomier Bermudez",
    "telefono": "",
    "fecha": "2026-03-16",
    "productos": [
      { "nombre": "Cama Queen OrthoAdvance", "cantidad": 1, "precioCarmen": 14020, "precioCompra": 0, "precioVenta": 19690, "sourceType": "lote", "sourceId": "L05" }
    ],
    "precioTotal": 19690,
    "prima": 1000,
    "saldo": 16690,
    "meses": 12,
    "cuotaMensual": 1557.5,
    "pagado": 3000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-07-16",
    "lastModified": 1775600137219
  },
  {
    "id": "V021",
    "cliente": "Nayeli Dayana Lechado Hurtado",
    "telefono": "",
    "fecha": "2026-03-14",
    "productos": [
      { "nombre": "Cama Queen Fresco Foam", "cantidad": 1, "precioCarmen": 10710, "precioCompra": 0, "precioVenta": 17200, "sourceType": "lote", "sourceId": "L05" }
    ],
    "precioTotal": 17200,
    "prima": 0,
    "saldo": 16200,
    "meses": 10,
    "cuotaMensual": 1720,
    "pagado": 1000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-14",
    "lastModified": 1775332950972
  },
  {
    "id": "V022",
    "cliente": "Alison Massiel Ortega Obando",
    "telefono": "",
    "fecha": "2026-03-17",
    "productos": [
      { "nombre": "Cama matrimonial INDUFOAM", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 15000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 15000,
    "prima": 1250,
    "saldo": 13750,
    "meses": 12,
    "cuotaMensual": 1145.83,
    "pagado": 1250,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-17",
    "lastModified": 1775234896075
  },
  {
    "id": "V023",
    "cliente": "Jorge Luis Pomier Bermudez",
    "telefono": "",
    "fecha": "2026-03-21",
    "productos": [
      { "nombre": "Televisor HICENSE 50 pulgadas", "cantidad": 1, "precioCarmen": 0, "precioCompra": 12000, "precioVenta": 19200, "sourceType": "compra", "sourceId": "C01" }
    ],
    "precioTotal": 19200,
    "prima": 3000,
    "saldo": 16200,
    "meses": 10,
    "cuotaMensual": 1620,
    "pagado": 3000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-21",
    "lastModified": 1775237170561
  },
  {
    "id": "V024",
    "cliente": "Lisethe Sevilla",
    "telefono": "",
    "fecha": "2026-03-22",
    "productos": [
      { "nombre": "Lavadora LG automática", "cantidad": 1, "precioCarmen": 0, "precioCompra": 9000, "precioVenta": 9000, "sourceType": "compra", "sourceId": "C02" }
    ],
    "precioTotal": 9000,
    "prima": 0,
    "saldo": 8600,
    "meses": 10,
    "cuotaMensual": 900,
    "pagado": 400,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-22",
    "lastModified": 1775357882218
  },
  {
    "id": "V025",
    "cliente": "Rosa Leal",
    "telefono": "",
    "fecha": "2026-03-26",
    "productos": [
      { "nombre": "Cocina MABE 4 quemadores", "cantidad": 1, "precioCarmen": 0, "precioCompra": 7500, "precioVenta": 12480, "sourceType": "compra", "sourceId": "C03" }
    ],
    "precioTotal": 12480,
    "prima": 1500,
    "saldo": 10980,
    "meses": 10,
    "cuotaMensual": 1098,
    "pagado": 1500,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-26",
    "lastModified": 1775238064306
  },
  {
    "id": "V026",
    "cliente": "Nardis Mercado",
    "telefono": "",
    "fecha": "2026-03-26",
    "productos": [
      { "nombre": "XIAOMI REDMI 11 PRO", "cantidad": 1, "precioCarmen": 0, "precioCompra": 8900, "precioVenta": 8900, "sourceType": "compra", "sourceId": "C04" }
    ],
    "precioTotal": 8900,
    "prima": 1485,
    "saldo": 7415,
    "meses": 6,
    "cuotaMensual": 1235.83,
    "pagado": 1485,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-26",
    "lastModified": 1775331090827
  },
  {
    "id": "V027",
    "cliente": "Marlene Sevilla",
    "telefono": "",
    "fecha": "2026-03-26",
    "productos": [
      { "nombre": "Redmi A5", "cantidad": 1, "precioCarmen": 0, "precioCompra": 4670, "precioVenta": 4670, "sourceType": "compra", "sourceId": "C05" }
    ],
    "precioTotal": 4670,
    "prima": 0,
    "saldo": 4670,
    "meses": 6,
    "cuotaMensual": 778.33,
    "pagado": 0,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-26",
    "lastModified": 1775331393753
  },
  {
    "id": "V029",
    "cliente": "Carlos Ernesto Vargas Idiaquez",
    "telefono": "",
    "fecha": "2026-03-31",
    "productos": [
      { "nombre": "Televisor LG 32 pulgadas", "cantidad": 1, "precioCarmen": 0, "precioCompra": 0, "precioVenta": 11000, "sourceType": "manual", "sourceId": null }
    ],
    "precioTotal": 11000,
    "prima": 1840,
    "saldo": 9160,
    "meses": 6,
    "cuotaMensual": 1526.67,
    "pagado": 1840,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-05-01",
    "lastModified": 1775331785601
  },
  {
    "id": "V030",
    "cliente": "Mayra del Socorro Hurtado (2)",
    "telefono": "",
    "fecha": "2026-03-30",
    "productos": [
      { "nombre": "Cocina Acero Inoxidable MABE", "cantidad": 1, "precioCarmen": 11360, "precioCompra": 0, "precioVenta": 17200, "sourceType": "lote", "sourceId": "L02" },
      { "nombre": "Refrigeradora 8 pies MABE", "cantidad": 1, "precioCarmen": 9700, "precioCompra": 0, "precioVenta": 14550, "sourceType": "lote", "sourceId": "L02" }
    ],
    "precioTotal": 31750,
    "prima": 0,
    "saldo": 31750,
    "meses": 12,
    "cuotaMensual": 2645.83,
    "pagado": 0,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-04-30",
    "lastModified": 1775332220918
  },
  {
    "id": "V031",
    "cliente": "Iliana Lisbeth Lopez Rosales",
    "telefono": "",
    "fecha": "2026-04-01",
    "productos": [
      { "nombre": "REDMI 15C", "cantidad": 1, "precioCarmen": 0, "precioCompra": 6900, "precioVenta": 6900, "sourceType": "compra", "sourceId": "C06" }
    ],
    "precioTotal": 6900,
    "prima": 0,
    "saldo": 5900,
    "meses": 6,
    "cuotaMensual": 1150,
    "pagado": 1000,
    "estado": "PENDIENTE",
    "proximaFechaCobro": "2026-06-02",
    "lastModified": 1775783130308
  }
];

const initialAbonos = [
  { "id": "1774657474055", "loteId": "L01", "fecha": "2026-03-27", "monto": 8303, "metodo": "Transferencia", "notas": "cancelado Lote 01", "saldoDespues": 0, "lastModified": "1774657474055" },
  { "id": "1774831430620", "loteId": "L02", "fecha": "2026-03-29", "monto": 1200, "metodo": "Transferencia", "notas": "Adelanto 2 lote", "saldoDespues": 71810, "lastModified": 1774831430620 },
  { "id": "1774998128257", "loteId": "L02", "fecha": "2026-03-30", "monto": 6000, "metodo": "Depósito", "notas": "2 abono", "saldoDespues": 65810, "lastModified": 1774998128257 },
  { "id": "1775105679042", "loteId": "L02", "fecha": "2026-04-01", "monto": 12500, "metodo": "Transferencia", "notas": "3 abono", "saldoDespues": 53310, "lastModified": 1775105679042 },
  { "id": "1775360018185", "loteId": "L02", "fecha": "2026-04-04", "monto": 2000, "metodo": "Transferencia", "notas": "4to abono", "saldoDespues": 49310, "lastModified": 1775360018185 },
  { "id": "1775782733145", "loteId": "L02", "fecha": "2026-04-10", "monto": 9500, "metodo": "Transferencia", "notas": "Abono #5", "saldoDespues": 41810, "lastModified": 1775782733145 }
];

const initialCobros = [
  { "id": "1774667537851", "ventaId": "V004", "fecha": "2026-03-10", "monto": 2059, "metodo": "Transferencia", "notas": "1 mes", "lastModified": 1774667537851 },
  { "id": "1774667680952", "ventaId": "V005", "fecha": "2026-03-28", "monto": 1200, "metodo": "Transferencia", "notas": "1 mes", "lastModified": 1774667680952 },
  { "id": "1774667875649", "ventaId": "V006", "fecha": "2026-03-23", "monto": 1315, "metodo": "Transferencia", "notas": "1 mes", "lastModified": 1774667875649 },
  { "id": "1774667933335", "ventaId": "V006", "fecha": "2026-03-28", "monto": 1350, "metodo": "Transferencia", "notas": "2 mes", "lastModified": 1774667933335 },
  { "id": "1774669381656", "ventaId": "V007", "fecha": "2026-03-24", "monto": 3000, "metodo": "Efectivo", "notas": "1 mes", "lastModified": 1774669381656 },
  { "id": "1774669404425", "ventaId": "V007", "fecha": "2026-03-28", "monto": 3000, "metodo": "Efectivo", "notas": "2 mes", "lastModified": 1774669404426 },
  { "id": "1774669508607", "ventaId": "V002", "fecha": "2026-03-10", "monto": 3700, "metodo": "Efectivo", "notas": "1 mes", "lastModified": 1774669508607 },
  { "id": "1774669677700", "ventaId": "V008", "fecha": "2026-03-12", "monto": 1540, "metodo": "Efectivo", "notas": "1 mes", "lastModified": 1774669677700 },
  { "id": "1774669715511", "ventaId": "V008", "fecha": "2026-03-28", "monto": 1600, "metodo": "Efectivo", "notas": "2 mes", "lastModified": 1774669715511 },
  { "id": "1774669880520", "ventaId": "V009", "fecha": "2026-03-17", "monto": 1000, "metodo": "Efectivo", "notas": "Adelanto", "lastModified": 1774669880520 },
  { "id": "1774669903969", "ventaId": "V009", "fecha": "2026-03-28", "monto": 1500, "metodo": "Efectivo", "notas": "2 mes abril", "lastModified": 1774669903969 },
  { "id": "1774671425512", "ventaId": "V010", "fecha": "2026-03-28", "monto": 1680, "metodo": "Efectivo", "notas": "Mes Abril", "lastModified": 1774671425512 },
  { "id": "1774830901805", "ventaId": "V012", "fecha": "2026-03-18", "monto": 1771, "metodo": "Efectivo", "notas": "2 mes", "lastModified": 1774830901805 },
  { "id": "1774831756284", "ventaId": "V013", "fecha": "2026-03-15", "monto": 3700, "metodo": "Transferencia", "notas": "Abono", "lastModified": 1774831756284 },
  { "id": "1774832067263", "ventaId": "V014", "fecha": "2026-03-25", "monto": 2470, "metodo": "Transferencia", "notas": "1 Abono marzo", "lastModified": 1774832067263 },
  { "id": "1774832272876", "ventaId": "V015", "fecha": "2026-03-17", "monto": 1480, "metodo": "Transferencia", "notas": "1 abono", "lastModified": 1774832272876 },
  { "id": "1774832928820", "ventaId": "V016", "fecha": "2026-03-08", "monto": 600, "metodo": "Efectivo", "notas": "Abono 2", "lastModified": 1774832928820 },
  { "id": "1775188702580", "ventaId": "V016", "fecha": "2026-04-03", "monto": 600, "metodo": "Efectivo", "notas": "Abono de 2 mes", "lastModified": 1775188702580 },
  { "id": "1775233941643", "ventaId": "V020", "fecha": "2026-03-23", "monto": 1000, "metodo": "Efectivo", "notas": "2 abono", "lastModified": 1775233941643 },
  { "id": "1775248374811", "ventaId": "V019", "fecha": "2026-04-03", "monto": 1400, "metodo": "Efectivo", "notas": "Primer abono abril", "lastModified": 1775248374811 },
  { "id": "1775332791968", "ventaId": "V011", "fecha": "2026-04-04", "monto": 2000, "metodo": "Efectivo", "notas": "1 cuota abril", "lastModified": 1775332791968 },
  { "id": "1775332950972", "ventaId": "V021", "fecha": "2026-03-30", "monto": 1000, "metodo": "Transferencia", "notas": "1 cuota", "lastModified": 1775332950972 },
  { "id": "1775333051499", "ventaId": "V020", "fecha": "2026-03-16", "monto": 1000, "metodo": "Efectivo", "notas": "Abono 1", "lastModified": 1775333051499 },
  { "id": "1775333204468", "ventaId": "V018", "fecha": "2026-03-28", "monto": 1500, "metodo": "Efectivo", "notas": "Abono 1", "lastModified": 1775333204468 },
  { "id": "1775333263945", "ventaId": "V017", "fecha": "2026-03-31", "monto": 600, "metodo": "Efectivo", "notas": "1 abono", "lastModified": 1775333263945 },
  { "id": "1775357692958", "ventaId": "V001", "fecha": "2026-04-04", "monto": 810, "metodo": "Efectivo", "notas": "Abono 2", "lastModified": 1775357692958 },
  { "id": "1775357882214", "ventaId": "V024", "fecha": "2026-04-01", "monto": 400, "metodo": "Efectivo", "notas": "Abono 1", "lastModified": 1775357882214 },
  { "id": "1775358594477", "ventaId": "V005", "fecha": "2026-04-05", "monto": 1200, "metodo": "Efectivo", "notas": "Abono 2", "lastModified": 1775358594477 },
  { "id": "1775778431462", "ventaId": "V002", "fecha": "2026-04-09", "monto": 3700, "metodo": "Efectivo", "notas": "3 abono", "lastModified": 1775778431462 },
  { "id": "1775783130307", "ventaId": "V031", "fecha": "2026-04-10", "monto": 1000, "metodo": "Efectivo", "notas": "Prima del teléfono", "lastModified": 1775783130307 }
];