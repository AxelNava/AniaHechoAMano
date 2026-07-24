import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { usePedidoCliente } from "@/composables/pedido/usePedidoCliente";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";

const infoFija = (): ProductoInfoPedidoDto => ({
  id: 1,
  nombre: "Piñata dinosaurio",
  descripcion: "Piñata artesanal",
  precio_base: 250,
  categoria_id: 3,
  categoria: "Piñatas",
  permite_modificaciones: true,
  requiere_anticipo: false,
  tiempo_total_estimado_minutos: 120,
  componentes: [],
});

const infoAnticipo = (): ProductoInfoPedidoDto => ({
  ...infoFija(),
  id: 2,
  nombre: "Pastel personalizado",
  precio_base: 500,
  requiere_anticipo: true,
  tiempo_total_estimado_minutos: 90,
});

describe("usePedidoCliente — carrito del cliente", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("agrega una línea fija y calcula minutos/precio totales", () => {
    const cliente = usePedidoCliente();

    cliente.agregarLinea(infoFija());
    cliente.agregarLinea(infoAnticipo());

    expect(cliente.lineas.value).toHaveLength(2);
    expect(cliente.hayModificaciones.value).toBe(false);
    expect(cliente.requiereAnticipo.value).toBe(true);
    expect(cliente.minutosTotales.value).toBe(210);
    expect(cliente.precioTotalSugerido.value).toBe(750);
  });

  it("marca hayModificaciones y guarda las fotos por línea", () => {
    const cliente = usePedidoCliente();
    const foto = new File(["x"], "ref.png", { type: "image/png" });

    const uid = cliente.agregarLinea(infoFija(), {
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
    cliente.agregarLinea(infoFija());

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
    cliente.agregarLinea(infoFija(), { esModificacion: true, descripcion: "Cambios" });

    const payload = cliente.construirPayload();

    expect(payload.fecha_entrega_solicitada).toBeUndefined();
    expect(payload.productos[0].es_modificacion).toBe(true);
    expect(payload.productos[0].descripcion_cliente).toBe("Cambios");
  });

  it("persiste solo datos serializables en localStorage (sin las fotos File)", async () => {
    const cliente = usePedidoCliente();
    const foto = new File(["x"], "ref.png", { type: "image/png" });
    cliente.agregarLinea(infoFija(), { esModificacion: true, fotos: [foto] });

    // El watcher del store persiste en el siguiente tick, no de forma síncrona.
    await nextTick();
    const guardado = JSON.parse(localStorage.getItem("ania_pedido_cliente") ?? "{}");

    expect(guardado.lineas).toHaveLength(1);
    expect(guardado.lineas[0].producto_id).toBe(1);
    expect(JSON.stringify(guardado)).not.toContain("ref.png");
  });
});
