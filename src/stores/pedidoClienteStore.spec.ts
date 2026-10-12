import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { eliminarBorradorPedidoCliente, usePedidoClienteStore } from "@/stores/pedidoClienteStore";

const KEY = "ania_pedido_cliente";
const lineaSegura = {
  uid: "linea-1",
  producto_id: 7,
  origen: "catalogo" as const,
  es_modificacion: false,
  descripcion_cliente: "Azul",
  info: {
    nombre: "Piñata",
    precio_base: 250,
    permite_modificaciones: true,
    requiere_anticipo: false,
  },
};

const nuevoStore = () => {
  setActivePinia(createPinia());
  return usePedidoClienteStore();
};

describe("pedidoClienteStore — persistencia privada por pestaña", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("elimina el borrador local legado sin importar su PII ni tocar otras claves", () => {
    localStorage.setItem(KEY, JSON.stringify({ contacto: { nombre: "Legado" } }));
    localStorage.setItem("preferencias", "conservar");

    const store = nuevoStore();

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem("preferencias")).toBe("conservar");
    expect(store.contacto.nombre).toBe("");
  });

  it("persiste y restaura en sessionStorage solo el borrador serializable seguro", async () => {
    const setLocal = vi.spyOn(localStorage, "setItem");
    const store = nuevoStore();
    store.lineas = [lineaSegura];
    store.contacto.nombre = "Ana";
    store.entrega.calle = "Centro";
    store.fechaSolicitada = "2026-08-20";
    store.fotosPorLinea = { "linea-1": [new File(["x"], "privada.png")] };
    store.ultimoResumen = {
      referencia_publica: "PED-1",
      hay_modificaciones: false,
      requiere_anticipo: false,
      contacto_nombre: "Ana",
      tipo_red_social: "",
      url_perfil: "",
      fecha_solicitada: null,
      lineas: [],
      fotos_pendientes: false,
    };

    await nextTick();

    const raw = sessionStorage.getItem(KEY) ?? "";
    expect(raw).not.toContain("ultimoResumen");
    expect(raw).not.toContain("privada.png");
    expect(setLocal.mock.calls.some(([key]) => key === KEY)).toBe(false);

    const restaurado = nuevoStore();
    expect(restaurado.lineas).toEqual([lineaSegura]);
    expect(restaurado.contacto.nombre).toBe("Ana");
    expect(restaurado.entrega.calle).toBe("Centro");
    expect(restaurado.fechaSolicitada).toBe("2026-08-20");
    expect(restaurado.ultimoResumen).toBeNull();
    setLocal.mockRestore();
  });

  it("sanea snapshots y descarta líneas y campos malformados", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        lineas: [
          {
            ...lineaSegura,
            categoria: "secreta",
            componentes: [{ costo: 10 }],
            info: { ...lineaSegura.info, tiempo_total_estimado_minutos: 30, costo_interno: 5 },
          },
          { ...lineaSegura, uid: 42 },
        ],
        contacto: { nombre: 123, telefono: "555", extra: "fuera" },
        entrega: { calle: "Centro", notas: false },
        fechaSolicitada: 123,
        mapsUrlOmitida: "sí",
        intentosOmitirMaps: -1,
        ultimoResumen: { contacto_nombre: "No cargar" },
      }),
    );

    const store = nuevoStore();

    expect(store.lineas).toEqual([lineaSegura]);
    expect(store.contacto).toEqual({
      nombre: "",
      telefono: "555",
      tipo_red_social: "",
      url_perfil: "",
    });
    expect(store.entrega).toMatchObject({ calle: "Centro", notas: "" });
    expect(store.fechaSolicitada).toBeNull();
    expect(store.mapsUrlOmitida).toBe(false);
    expect(store.intentosOmitirMaps).toBe(0);
    expect(store.ultimoResumen).toBeNull();
  });

  it("limpia ambas ubicaciones y el carrito activo sin borrar el resumen en memoria", async () => {
    localStorage.setItem(KEY, "legado");
    sessionStorage.setItem(KEY, "borrador");
    localStorage.setItem("oidc", "local");
    sessionStorage.setItem("oidc", "session");
    eliminarBorradorPedidoCliente();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem("oidc")).toBe("local");
    expect(sessionStorage.getItem("oidc")).toBe("session");

    const store = nuevoStore();
    store.lineas = [lineaSegura];
    store.contacto.nombre = "Ana";
    store.ultimoResumen = { referencia_publica: "PED-1" } as never;
    await nextTick();
    store.limpiarCarrito();

    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(store.contacto.nombre).toBe("");
    expect(store.ultimoResumen).toEqual({ referencia_publica: "PED-1" });
  });

  it("continúa en memoria cuando el almacenamiento falla", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    const store = nuevoStore();

    store.lineas = [lineaSegura];
    await expect(nextTick()).resolves.toBeUndefined();
    expect(store.lineas).toEqual([lineaSegura]);
    vi.restoreAllMocks();
  });
});
