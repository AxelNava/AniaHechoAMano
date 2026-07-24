import { computed } from "vue";
import { storeToRefs } from "pinia";
import { usePedidoClienteStore } from "@/stores/pedidoClienteStore";
import type { ProductoInfoPedidoDto } from "@/types/orders/createOrderDto";
import type { CreatePedidoEntregaInput } from "@/types/orders/entregaDto";
import type { CreatePedidoPublicoDto } from "@/types/orders/createPedidoPublicoDto";
import type { PedidoClienteLinea, ResumenPedidoEnviado } from "@/types/orders/pedidoCliente";

const generarUid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Devuelve la entrega solo si tiene algún campo con contenido; si no, `undefined`. */
const construirEntrega = (
  entrega: CreatePedidoEntregaInput,
): CreatePedidoEntregaInput | undefined => {
  const limpia: CreatePedidoEntregaInput = {};
  let tieneDatos = false;

  (Object.keys(entrega) as (keyof CreatePedidoEntregaInput)[]).forEach((clave) => {
    const valor = entrega[clave]?.trim();
    if (valor) {
      limpia[clave] = valor;
      tieneDatos = true;
    }
  });

  return tieneDatos ? limpia : undefined;
};

interface AgregarLineaOpciones {
  esModificacion?: boolean;
  descripcion?: string;
  fotos?: File[];
}

/**
 * API del "carrito" del cliente final. Es la capa de lógica sobre
 * `pedidoClienteStore`: agrega/quita líneas, calcula totales y minutos, y
 * construye el `CreatePedidoPublicoDto` que consume `ordersApi.createOrderPublico`.
 *
 * Adapta la idea de `useOrderForm` (multi-producto) al flujo público, añadiendo
 * `es_modificacion`, fotos por línea y el snapshot de info para el resumen.
 */
export function usePedidoCliente() {
  const store = usePedidoClienteStore();
  const { lineas, contacto, entrega, fechaSolicitada, mapsUrlOmitida, fotosPorLinea } =
    storeToRefs(store);

  const hayModificaciones = computed(() =>
    lineas.value.some((linea) => linea.es_modificacion),
  );

  const requiereAnticipo = computed(() =>
    lineas.value.some((linea) => linea.info.requiere_anticipo),
  );

  const estaVacio = computed(() => lineas.value.length === 0);

  /** Suma de minutos estimados de las líneas — alimenta a disponibilidad. */
  const minutosTotales = computed(() =>
    lineas.value.reduce((total, linea) => total + linea.info.tiempo_total_estimado_minutos, 0),
  );

  const precioTotalSugerido = computed(() =>
    lineas.value.reduce((total, linea) => total + linea.info.precio_base, 0),
  );

  const agregarLinea = (info: ProductoInfoPedidoDto, opciones: AgregarLineaOpciones = {}) => {
    const uid = generarUid();
    const esModificacion = opciones.esModificacion ?? false;

    const linea: PedidoClienteLinea = {
      uid,
      producto_id: info.id,
      origen: "catalogo",
      es_modificacion: esModificacion,
      descripcion_cliente: opciones.descripcion?.trim() ?? "",
      info: {
        nombre: info.nombre,
        precio_base: info.precio_base,
        tiempo_total_estimado_minutos: info.tiempo_total_estimado_minutos,
        categoria_id: info.categoria_id,
        categoria: info.categoria,
        permite_modificaciones: info.permite_modificaciones,
        requiere_anticipo: info.requiere_anticipo,
      },
    };

    lineas.value = [...lineas.value, linea];

    if (esModificacion && opciones.fotos?.length) {
      store.setFotosLinea(uid, opciones.fotos);
    }

    return uid;
  };

  const construirPayload = (): CreatePedidoPublicoDto => {
    const payload: CreatePedidoPublicoDto = {
      cliente_nuevo: {
        nombre: contacto.value.nombre.trim(),
        telefono: contacto.value.telefono.trim() || undefined,
        tipo_red_social: contacto.value.tipo_red_social || undefined,
        url_perfil: contacto.value.url_perfil.trim() || undefined,
        // Espejamos `url_perfil` en `red_social_contacto` para que las vistas
        // admin existentes (que leen ese campo) muestren algo de contacto.
        red_social_contacto: contacto.value.url_perfil.trim() || undefined,
      },
      productos: lineas.value.map((linea) => ({
        producto_id: linea.producto_id,
        origen: linea.origen,
        es_modificacion: linea.es_modificacion,
        descripcion_cliente: linea.descripcion_cliente.trim() || undefined,
      })),
    };

    const entregaLimpia = construirEntrega(entrega.value);
    if (entregaLimpia) {
      payload.entrega = entregaLimpia;
    }

    if (mapsUrlOmitida.value) {
      payload.maps_url_omitida = true;
    }

    // Solo los pedidos 100% fijos llevan fecha (los que tienen modificación se
    // cotizan luego → sin fecha firme).
    if (!hayModificaciones.value && fechaSolicitada.value) {
      payload.fecha_entrega_solicitada = fechaSolicitada.value;
    }

    return payload;
  };

  /** Snapshot serializable para la pantalla de confirmación tras enviar. */
  const construirResumen = (
    referenciaPublica: string,
    fotosPendientes: boolean,
  ): ResumenPedidoEnviado => ({
    referencia_publica: referenciaPublica,
    hay_modificaciones: hayModificaciones.value,
    requiere_anticipo: requiereAnticipo.value,
    contacto_nombre: contacto.value.nombre.trim(),
    tipo_red_social: contacto.value.tipo_red_social,
    url_perfil: contacto.value.url_perfil.trim(),
    fecha_solicitada: hayModificaciones.value ? null : fechaSolicitada.value,
    lineas: lineas.value.map((linea) => ({
      nombre: linea.info.nombre,
      es_modificacion: linea.es_modificacion,
      precio_base: linea.info.precio_base,
    })),
    fotos_pendientes: fotosPendientes,
  });

  return {
    // Estado (refs del store, aptos para v-model)
    lineas,
    contacto,
    entrega,
    fechaSolicitada,
    mapsUrlOmitida,
    fotosPorLinea,
    // Derivados
    hayModificaciones,
    requiereAnticipo,
    estaVacio,
    minutosTotales,
    precioTotalSugerido,
    // Acciones
    agregarLinea,
    quitarLinea: store.quitarLinea,
    setFotosLinea: store.setFotosLinea,
    limpiarCarrito: store.limpiarCarrito,
    construirPayload,
    construirResumen,
  };
}
