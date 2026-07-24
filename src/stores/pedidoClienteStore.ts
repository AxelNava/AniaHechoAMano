import { ref, watch } from "vue";
import { defineStore } from "pinia";
import type { CreatePedidoEntregaInput } from "@/types/orders/entregaDto";
import type {
  ContactoClienteInput,
  PedidoClienteLinea,
  ResumenPedidoEnviado,
} from "@/types/orders/pedidoCliente";

// ────────────────────────────────────────────────────────────────────────────
// STORE DEL CARRITO DEL CLIENTE (flujo público de pedido).
//
// Fuente de verdad compartida entre `ProductoDetalleView` (agrega líneas), el
// wizard (`PedidoWizardView` + pasos) y la confirmación. Es un singleton de
// Pinia, así que SOBREVIVE la navegación SPA ("agregar otro producto" no pierde
// el carrito).
//
// Persistencia: solo la porción SERIALIZABLE se guarda en localStorage (estilo
// `appStore`). Las fotos de modificación son `File[]` y NO serializan → viven
// solo en memoria (`fotosPorLinea`). Consecuencia documentada: un reload
// completo del navegador conserva las líneas/contacto/dirección/fecha pero
// PIERDE las fotos aún no subidas (el wizard es de un solo montaje).
// ────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ania_pedido_cliente";

interface EstadoPersistido {
  lineas: PedidoClienteLinea[];
  contacto: ContactoClienteInput;
  entrega: CreatePedidoEntregaInput;
  fechaSolicitada: string | null;
  mapsUrlOmitida: boolean;
  intentosOmitirMaps: number;
  ultimoResumen: ResumenPedidoEnviado | null;
}

const contactoVacio = (): ContactoClienteInput => ({
  nombre: "",
  telefono: "",
  tipo_red_social: "",
  url_perfil: "",
});

const entregaVacia = (): CreatePedidoEntregaInput => ({
  calle: "",
  numero_casa: "",
  referencia: "",
  municipio: "",
  maps_url: "",
  notas: "",
});

const cargarEstado = (): Partial<EstadoPersistido> => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<EstadoPersistido>) : {};
  } catch {
    return {};
  }
};

export const usePedidoClienteStore = defineStore("pedidoCliente", () => {
  const guardado = cargarEstado();

  // Estado serializable (persistido)
  const lineas = ref<PedidoClienteLinea[]>(guardado.lineas ?? []);
  const contacto = ref<ContactoClienteInput>({ ...contactoVacio(), ...guardado.contacto });
  const entrega = ref<CreatePedidoEntregaInput>({ ...entregaVacia(), ...guardado.entrega });
  const fechaSolicitada = ref<string | null>(guardado.fechaSolicitada ?? null);
  const mapsUrlOmitida = ref<boolean>(guardado.mapsUrlOmitida ?? false);
  const intentosOmitirMaps = ref<number>(guardado.intentosOmitirMaps ?? 0);
  const ultimoResumen = ref<ResumenPedidoEnviado | null>(guardado.ultimoResumen ?? null);

  // Estado NO serializable (solo memoria): fotos `File[]` por `uid` de línea.
  const fotosPorLinea = ref<Record<string, File[]>>({});

  const persistir = () => {
    if (typeof localStorage === "undefined") return;
    const estado: EstadoPersistido = {
      lineas: lineas.value,
      contacto: contacto.value,
      entrega: entrega.value,
      fechaSolicitada: fechaSolicitada.value,
      mapsUrlOmitida: mapsUrlOmitida.value,
      intentosOmitirMaps: intentosOmitirMaps.value,
      ultimoResumen: ultimoResumen.value,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
      // Silencioso: si localStorage falla (modo privado/cuota) el flujo sigue
      // funcionando en memoria durante la sesión.
    }
  };

  watch(
    [lineas, contacto, entrega, fechaSolicitada, mapsUrlOmitida, intentosOmitirMaps, ultimoResumen],
    persistir,
    { deep: true },
  );

  const setFotosLinea = (uid: string, files: File[]) => {
    if (files.length) {
      fotosPorLinea.value[uid] = files;
    } else {
      delete fotosPorLinea.value[uid];
    }
  };

  const quitarLinea = (uid: string) => {
    lineas.value = lineas.value.filter((linea) => linea.uid !== uid);
    delete fotosPorLinea.value[uid];
  };

  /** Vacía el carrito activo (líneas, fotos y campos del wizard) tras enviar. */
  const limpiarCarrito = () => {
    lineas.value = [];
    fotosPorLinea.value = {};
    contacto.value = contactoVacio();
    entrega.value = entregaVacia();
    fechaSolicitada.value = null;
    mapsUrlOmitida.value = false;
    intentosOmitirMaps.value = 0;
  };

  return {
    lineas,
    contacto,
    entrega,
    fechaSolicitada,
    mapsUrlOmitida,
    intentosOmitirMaps,
    ultimoResumen,
    fotosPorLinea,
    setFotosLinea,
    quitarLinea,
    limpiarCarrito,
  };
});
