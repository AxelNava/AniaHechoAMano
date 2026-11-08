import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { authService } from "@/auth/authService";
import * as contrato from "@/generated/backend-contract/api";
import type { PedidoDetalleDto, ProductoInfoPedidoDto } from "@/generated/backend-contract/types";
import { API_BASE_URL, ApiError, type ProblemDetails } from "@/services/http/apiClient";
import { OrdersApi } from "@/services/orders/ordersApi";
import { ProductApi } from "@/services/products/productApi";
import type { CreateOrderDto } from "@/types/orders/createOrderDto";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";

vi.mock("@/auth/authService", () => ({
  authService: { getAccessToken: vi.fn() },
}));

const tokenMock = vi.mocked(authService.getAccessToken);
const opciones = {
  id: 7,
  nombre: "Piñata",
  precio_base: 100,
  tiempo_total_estimado_minutos: 60,
  permite_modificaciones: true,
  requiere_anticipo: false,
};
const informacion: ProductoInfoPedidoDto = {
  ...opciones,
  descripcion: "Piñata de cartón",
  margen_ganancia_porcentaje: 30,
  costo_total_componentes: 10,
  precio_sugerido: 14.29,
  costos_incompletos: false,
  componentes_incompletos: [],
  categoria_id: null,
  categoria: "Piñatas",
  componentes: [
    {
      componente_id: 2,
      nombre: "Cartón",
      unidad_medida: "unidad",
      cantidad: 0.5,
      costo_unitario_actual: 20,
      minutos_unitarios_actuales: 10,
    },
  ],
};
const detalle: PedidoDetalleDto = {
  id: 7,
  cliente_id: 1,
  nombre: null,
  referencia_publica: "AHM-2026-0007",
  seguimiento_token_publico: "token-publico",
  fecha_solicitud: "2026-08-01",
  fecha_entrega_solicitada: null,
  fecha_entrega_acordada: null,
  estado: "COTIZANDO",
  retrasado: false,
  precio_final_total: null,
  anticipo_pagado: 0,
  notas_admin: null,
  maps_url_omitida: false,
  entrega: null,
  producto_id: null,
  categoria: null,
  imagen_referencia_url: null,
  imagen_producto_id: null,
  productos: [],
};
const pedidoAdmin: CreateOrderDto = {
  cliente_id: 1,
  precio_final_total: 95,
  productos: [
    {
      producto_id: 7,
      descripcion_cliente: "Piñata",
      precio_fijado_admin: 95,
      componentes: [
        {
          componente_id: 2,
          cantidad: 0.5,
          costo_unitario_congelado: 20,
          minutos_unitarios_congelados: 10,
        },
      ],
    },
  ],
};
const pedidoPublico: CreatePedidoPublicoDto = {
  cliente_nuevo: { nombre: "Ana" },
  productos: [{ producto_id: 7, origen: "catalogo", es_modificacion: false }],
};
const fecha = { fecha_entrega_acordada: "2026-08-20" };
const cotizacion = {
  ...fecha,
  lineas: [{ producto_pedido_id: 2, precio_fijado_admin: 90 }],
};
const problema: ProblemDetails = {
  type: "https://ania.test/problems/CONFLICT",
  status: 409,
  title: "Conflicto",
  detail: "La fecha no está disponible",
  code: "CONFLICT",
};

function simularRespuesta(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  tokenMock.mockReset().mockResolvedValue("pilot-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const productos = [
  {
    endpoint: "getOpcionesPedidoPublicas" as const,
    ruta: "/productos/7/opciones-pedido",
    protegido: false,
    respuesta: opciones,
    ejecutar: (api: ProductApi) => api.getProductOrderOptions(7),
  },
  {
    endpoint: "getProductoInfoPedido" as const,
    ruta: "/productos/7/info-pedido",
    protegido: true,
    respuesta: informacion,
    ejecutar: (api: ProductApi) => api.getProductOrderInfo(7),
  },
];

describe("Contratos generados de productos", () => {
  it.each(productos)("$endpoint coordina la llamada y conserva el response", async (caso) => {
    const endpoint = vi.spyOn(contrato, caso.endpoint);
    const fetchMock = simularRespuesta(caso.respuesta);

    await expect(caso.ejecutar(new ProductApi())).resolves.toBe(caso.respuesta);
    expect(endpoint).toHaveBeenCalledExactlyOnceWith({ path: { id: 7 } });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${API_BASE_URL}${caso.ruta}`, {
      method: "GET",
      ...(caso.protegido ? { headers: { Authorization: "Bearer pilot-token" } } : {}),
    });
    expect(tokenMock).toHaveBeenCalledTimes(caso.protegido ? 1 : 0);
  });

  it.each(productos)("$endpoint conserva null y el log ante un error", async (caso) => {
    const endpoint = vi.spyOn(contrato, caso.endpoint);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = simularRespuesta(problema, 409);

    await expect(caso.ejecutar(new ProductApi())).resolves.toBeNull();
    expect(endpoint).toHaveBeenCalledExactlyOnceWith({ path: { id: 7 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledExactlyOnceWith("Error fetching data:", expect.any(ApiError));
    const error = log.mock.calls[0]?.[1];
    expect(error).toMatchObject({ status: 409, problem: problema, message: problema.detail });
  });
});

const pedidos = [
  {
    endpoint: "createPedido" as const,
    ruta: "/pedidos",
    protegido: true,
    parametros: { body: pedidoAdmin },
    ejecutar: (api: OrdersApi) => api.createOrder(pedidoAdmin),
  },
  {
    endpoint: "crearSolicitud" as const,
    ruta: "/pedidos/solicitud",
    protegido: false,
    parametros: { body: pedidoPublico },
    ejecutar: (api: OrdersApi) => api.createOrderPublico(pedidoPublico),
  },
  {
    endpoint: "crearSolicitudAutenticada" as const,
    ruta: "/pedidos/solicitud-autenticada",
    protegido: true,
    parametros: { body: pedidoPublico },
    ejecutar: (api: OrdersApi) => api.createOrderPublicoAutenticado(pedidoPublico),
  },
  {
    endpoint: "confirmar" as const,
    ruta: "/pedidos/7/confirmar",
    protegido: true,
    parametros: { path: { pedidoId: 7 }, body: {} },
    ejecutar: (api: OrdersApi) => api.confirmarPedido(7),
  },
  {
    endpoint: "confirmar" as const,
    ruta: "/pedidos/7/confirmar",
    protegido: true,
    parametros: { path: { pedidoId: 7 }, body: fecha },
    ejecutar: (api: OrdersApi) => api.confirmarPedido(7, fecha),
  },
  {
    endpoint: "cotizar" as const,
    ruta: "/pedidos/7/cotizar",
    protegido: true,
    parametros: { path: { pedidoId: 7 }, body: cotizacion },
    ejecutar: (api: OrdersApi) => api.cotizarPedido(7, cotizacion),
  },
];

describe("Contratos generados de pedidos", () => {
  it.each(pedidos)("$endpoint conserva request, response y autenticación", async (caso) => {
    const endpoint = vi.spyOn(contrato, caso.endpoint);
    const original = structuredClone(caso.parametros.body);
    const fetchMock = simularRespuesta(detalle, 201);

    await expect(caso.ejecutar(new OrdersApi())).resolves.toBe(detalle);
    expect(endpoint).toHaveBeenCalledExactlyOnceWith(caso.parametros);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${API_BASE_URL}${caso.ruta}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(caso.protegido ? { Authorization: "Bearer pilot-token" } : {}),
      },
      body: JSON.stringify(caso.parametros.body),
    });
    expect(caso.parametros.body).toEqual(original);
    expect(tokenMock).toHaveBeenCalledTimes(caso.protegido ? 1 : 0);
  });

  it.each(pedidos)("$endpoint propaga ApiError sin modificar el payload", async (caso) => {
    const endpoint = vi.spyOn(contrato, caso.endpoint);
    const original = structuredClone(caso.parametros.body);
    const fetchMock = simularRespuesta(problema, 409);

    await expect(caso.ejecutar(new OrdersApi())).rejects.toMatchObject({
      status: 409,
      message: problema.detail,
      problem: problema,
    });
    expect(endpoint).toHaveBeenCalledExactlyOnceWith(caso.parametros);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(caso.parametros.body).toEqual(original);
  });

  it("subirImagenesLinea conserva FormData, sus archivos y el boundary del navegador", async () => {
    const endpoint = vi.spyOn(contrato, "subirImagenesLinea");
    const archivos = [new File(["foto"], "referencia.png", { type: "image/png" })];
    const imagenes = [{ id: 1, url: "/foto.png", alt: null, orden: 0 }];
    const fetchMock = simularRespuesta(imagenes, 201);

    await expect(new OrdersApi().uploadModificacionImagenes(7, 2, archivos)).resolves.toBe(
      imagenes,
    );
    expect(endpoint).toHaveBeenCalledExactlyOnceWith({
      path: { pedidoId: 7, pedidoProductoId: 2 },
      body: expect.any(FormData),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${API_BASE_URL}/pedidos/7/productos/2/imagenes`);
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBeInstanceOf(FormData);
    expect(opciones.body.getAll("imagenes")).toEqual(archivos);
    expect(new Headers(opciones.headers).get("Authorization")).toBe("Bearer pilot-token");
    expect(new Headers(opciones.headers).has("Content-Type")).toBe(false);
    expect(tokenMock).toHaveBeenCalledTimes(1);
  });
});
