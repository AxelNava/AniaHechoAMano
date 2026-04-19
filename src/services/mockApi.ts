const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockCategories = [
  { id: 1, nombre: "Piñatas" },
  { id: 2, nombre: "Desayunos Sorpresa" },
  { id: 3, nombre: "Postres" },
  { id: 4, nombre: "Adornos de Fiesta" },
  { id: 5, nombre: "Trabajos Escolares" },
  { id: 6, nombre: "Cajas Sorpresa" },
  { id: 7, nombre: "Fotos Polaroid" },
  { id: 8, nombre: "Invitaciones" },
];

export const mockProducts = [
  {
    id: 1,
    nombre: "Piñata Dino",
    descripcion: "Piñata de dinosaurio para niños",
    precio_base: 350,
    categoria_id: 1,
    activo: true,
  },
  {
    id: 2,
    nombre: "Piñata Unicornio",
    descripcion: "Piñata de unicornio glitter",
    precio_base: 400,
    categoria_id: 1,
    activo: true,
  },
  {
    id: 3,
    nombre: "Desayuno Cumpleaños",
    descripcion: "Desayuno sorpresa con globos y pastel",
    precio_base: 250,
    categoria_id: 2,
    activo: true,
  },
  {
    id: 4,
    nombre: "Desayuno Romantico",
    descripcion: "Desayuno con rosas y chocolates",
    precio_base: 300,
    categoria_id: 2,
    activo: true,
  },
  {
    id: 5,
    nombre: "Gelatina de Fruro",
    descripcion: "Gelatina de fresa con crema",
    precio_base: 80,
    categoria_id: 3,
    activo: true,
  },
  {
    id: 6,
    nombre: "Crepas Dulces",
    descripcion: "Crepas con Nutella y frutas",
    precio_base: 60,
    categoria_id: 3,
    activo: true,
  },
  {
    id: 7,
    nombre: "Globos Helados",
    descripcion: "Globos decorativos para fiestas",
    precio_base: 150,
    categoria_id: 4,
    activo: true,
  },
  {
    id: 8,
    nombre: "Centros de Mesa",
    descripcion: "Centros de mesa personalizados",
    precio_base: 200,
    categoria_id: 4,
    activo: true,
  },
];

export const mockPedidos = [
  {
    id: 1,
    cliente_id: 1,
    fecha_solicitud: "2024-01-15T10:00:00Z",
    fecha_entrega_acordada: "2024-01-20T14:00:00Z",
    estado: "ENTREGADO",
    precio_final_total: 400,
    anticipo_pagado: 200,
    notas_admin: "Entregado a tiempo",
    cliente: { nombre: "Maria García" },
    articulos: [
      {
        id: 1,
        descripcion_cliente: "Piñata de Spiderman tamaño grande",
        precio_estimado_ia: 350,
        precio_fijado_admin: 400,
        tiempo_total_estimado_minutos: 180,
        foto_referencia_url: null,
        componentes: [
          {
            id: 1,
            nombre: "Papel crepe",
            cantidad: 20,
            unidad_medida: "hojas",
            costo_unitario_congelado: 2,
          },
          {
            id: 2,
            nombre: "Cartón",
            cantidad: 2,
            unidad_medida: "pliegos",
            costo_unitario_congelado: 15,
          },
          {
            id: 3,
            nombre: "Resistol",
            cantidad: 1,
            unidad_medida: "tubo",
            costo_unitario_congelado: 12,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    cliente_id: 2,
    fecha_solicitud: "2024-02-01T09:00:00Z",
    fecha_entrega_acordada: "2024-02-05T12:00:00Z",
    estado: "EN_PROCESO",
    precio_final_total: null,
    anticipo_pagado: 100,
    notas_admin: null,
    cliente: { nombre: "Juan Pérez" },
    articulos: [
      {
        id: 2,
        descripcion_cliente: "Desayuno sorpresa para 2 personas",
        precio_estimado_ia: 280,
        precio_fijado_admin: null,
        tiempo_total_estimado_minutos: 45,
        foto_referencia_url: null,
        componentes: [
          {
            id: 4,
            nombre: "Caja decorada",
            cantidad: 1,
            unidad_medida: "pieza",
            costo_unitario_congelado: 50,
          },
          {
            id: 5,
            nombre: "Chocolates",
            cantidad: 6,
            unidad_medida: "piezas",
            costo_unitario_congelado: 8,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    cliente_id: 3,
    fecha_solicitud: "2024-02-10T15:30:00Z",
    fecha_entrega_acordada: "2024-02-15T10:00:00Z",
    estado: "COTIZANDO",
    precio_final_total: null,
    anticipo_pagado: 0,
    notas_admin: "Esperando confirmación del cliente",
    cliente: { nombre: "Ana López" },
    articulos: [],
  },
];

export const mockComponentes = [
  {
    id: 1,
    nombre: "Papel crepe",
    tipo: "MATERIAL",
    descripcion: "Papel de colores para decoraciones",
    unidad_medida: "hoja",
    requiere_pedido_previo: false,
  },
  {
    id: 2,
    nombre: "Cartón corrugado",
    tipo: "MATERIAL",
    descripcion: "Cartón para estructuras",
    unidad_medida: "pliego",
    requiere_pedido_previo: false,
  },
  {
    id: 3,
    nombre: "Resistol",
    tipo: "MATERIAL",
    descripcion: "Pegamento blanco",
    unidad_medida: "tubo",
    requiere_pedido_previo: false,
  },
  {
    id: 4,
    nombre: "Globos",
    tipo: "MATERIAL",
    descripcion: "Globos de látex",
    unidad_medida: "pieza",
    requiere_pedido_previo: false,
  },
  {
    id: 5,
    nombre: "Caja decorada",
    tipo: "ELEMENTO_ELABORADO",
    descripcion: "Caja pre-decorada para regalos",
    unidad_medida: "pieza",
    requiere_pedido_previo: false,
  },
  {
    id: 6,
    nombre: "Sublimación",
    tipo: "SERVICIO",
    descripcion: "Servicio de sublimación de imágenes",
    unidad_medida: "pieza",
    requiere_pedido_previo: true,
  },
  {
    id: 7,
    nombre: "Corte con Cameo",
    tipo: "SERVICIO",
    descripcion: "Corte de vinil o papel con máquina Cameo",
    unidad_medida: "metro",
    requiere_pedido_previo: true,
  },
];

export const mockApi = {
  async getProducts() {
    await delay(300);
    return [...mockProducts];
  },

  async getProduct(id: number) {
    await delay(200);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) throw new Error("Producto no encontrado");
    return { ...product };
  },

  async getCategories() {
    await delay(200);
    return [...mockCategories];
  },

  async createProduct(data: {
    nombre: string;
    descripcion: string;
    precio_base: number;
    categoria_id: number;
  }) {
    await delay(300);
    const newProduct = {
      id: mockProducts.length + 1,
      ...data,
      activo: true,
    };
    mockProducts.push(newProduct);
    return newProduct;
  },

  async updateProduct(
    id: number,
    data: {
      nombre: string;
      descripcion: string;
      precio_base: number;
      categoria_id: number;
      activo: boolean;
    },
  ) {
    await delay(300);
    const index = mockProducts.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Producto no encontrado");
    mockProducts[index] = { ...mockProducts[index], ...data };
    return mockProducts[index];
  },

  async createCategory(name: string) {
    await delay(200);
    const newCategory = { id: mockCategories.length + 1, nombre: name };
    mockCategories.push(newCategory);
    return newCategory;
  },

  async getOrdersByProduct(productId: number) {
    await delay(300);
    return mockPedidos.filter((p) => p.articulos.some((a: { id: number }) => a.id === productId || true));
  },

  async createComponente(data: {
    nombre: string;
    tipo: string;
    descripcion: string;
    unidadMedida: string;
    requierePedidoPrevio: boolean;
  }) {
    await delay(300);
    const newComponente = {
      id: mockComponentes.length + 1,
      nombre: data.nombre,
      tipo: data.tipo,
      descripcion: data.descripcion,
      unidad_medida: data.unidadMedida,
      requiere_pedido_previo: data.requierePedidoPrevio,
    };
    mockComponentes.push(newComponente);
    return newComponente;
  },

  async getComponentes() {
    await delay(200);
    return [...mockComponentes];
  },
};
