import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import type { ProductoOpcionesPedidoPublicoDto } from "@/types/products/ProductoOpcionesPedidoPublicoDto";

const opcionesFijas = (): ProductoOpcionesPedidoPublicoDto => ({
  id: 1,
  nombre: "Piñata dinosaurio",
  precio_base: 250,
  permite_modificaciones: true,
  requiere_anticipo: false,
});

const opcionesAnticipo = (): ProductoOpcionesPedidoPublicoDto => ({
  ...opcionesFijas(),
  id: 2,
  nombre: "Pastel personalizado",
  precio_base: 500,
  requiere_anticipo: true,
});

describe("usePedidoCliente — carrito del cliente", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it("agrega solo el snapshot público seguro y calcula el precio total", () => {
    const cliente = usePedidoCliente();

    cliente.agregarLinea(opcionesFijas());
    cliente.agregarLinea(opcionesAnticipo());

    expect(cliente.lineas.value).toHaveLength(2);
    expect(cliente.hayModificaciones.value).toBe(false);
    expect(cliente.requiereAnticipo.value).toBe(true);
    expect(cliente.precioTotalSugerido.value).toBe(750);
    expect(cliente.lineas.value[0].info).toEqual({
      nombre: "Piñata dinosaurio",
      precio_base: 250,
      permite_modificaciones: true,
      requiere_anticipo: false,
    });
    expect("minutosTotales" in cliente).toBe(false);
  });

  it("marca hayModificaciones y guarda las fotos por línea", () => {
    const cliente = usePedidoCliente();
    const foto = new File(["x"], "ref.png", { type: "image/png" });

    const uid = cliente.agregarLinea(opcionesFijas(), {
      esModificacion: true,
      descripcion: "En tonos verdes",
      fotos: [foto],
    });

    expect(cliente.hayModificaciones.value).toBe(true);
    expect(cliente.fotosPorLinea.value[uid]).toHaveLength(1);
  });

  it("construye el payload público con la fecha solo si NO hay modificaciones", () => {
    const cliente = usePedidoCliente();
    cliente.contacto.value.nombre = "Ana";
    cliente.contacto.value.url_perfil = "facebook.com/ana";
    cliente.fechaSolicitada.value = "2026-08-20";
    cliente.agregarLinea(opcionesFijas());

    const payload = cliente.construirPayload();

    expect(payload.cliente_nuevo?.nombre).toBe("Ana");
    expect(payload.cliente_nuevo?.url_perfil).toBe("facebook.com/ana");
    expect(payload.productos[0]).toMatchObject({
      producto_id: 1,
      origen: "catalogo",
      es_modificacion: false,
    });
    expect(payload.fecha_entrega_solicitada).toBe("2026-08-20");
  });

  it("omite la fecha en el payload cuando hay una modificación", () => {
    const cliente = usePedidoCliente();
    cliente.contacto.value.nombre = "Ana";
    cliente.fechaSolicitada.value = "2026-08-20";
    cliente.agregarLinea(opcionesFijas(), { esModificacion: true, descripcion: "Cambios" });

    const payload = cliente.construirPayload();

    expect(payload.fecha_entrega_solicitada).toBeUndefined();
    expect(payload.productos[0].es_modificacion).toBe(true);
    expect(payload.productos[0].descripcion_cliente).toBe("Cambios");
  });

  it("persiste una línea segura sin fotos ni claves internas", async () => {
    const cliente = usePedidoCliente();
    const foto = new File(["x"], "ref.png", { type: "image/png" });
    cliente.agregarLinea(opcionesFijas(), { esModificacion: true, fotos: [foto] });

    await nextTick();
    const guardado = JSON.parse(sessionStorage.getItem("ania_pedido_cliente") ?? "{}");
    const lineaSerializada = JSON.stringify(guardado.lineas[0]);

    expect(guardado.lineas[0].producto_id).toBe(1);
    expect(lineaSerializada).not.toContain("ref.png");
    for (const claveSensible of ["categoria", "componentes", "costo", "tiempo", "minutos"]) {
      expect(lineaSerializada).not.toContain(claveSensible);
    }
  });
});
