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
// Persistencia: el borrador serializable vive solo en sessionStorage para
// sobrevivir navegación y redirects OIDC dentro de la misma pestaña. Las fotos y
// el resumen de confirmación permanecen exclusivamente en memoria.
// ────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ania_pedido_cliente";

interface EstadoPersistido {
  lineas: PedidoClienteLinea[];
  contacto: ContactoClienteInput;
  entrega: CreatePedidoEntregaInput;
  fechaSolicitada: string | null;
  mapsUrlOmitida: boolean;
  intentosOmitirMaps: number;
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

type Registro = Record<string, unknown>;

const esRegistro = (valor: unknown): valor is Registro =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);
const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");
const redesValidas = ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "OTRO", ""] as const;

const sanearLinea = (valor: unknown): PedidoClienteLinea | null => {
  if (!esRegistro(valor) || !esRegistro(valor.info)) return null;
  const { info } = valor;
  if (
    typeof valor.uid !== "string" ||
    !valor.uid ||
    typeof valor.producto_id !== "number" ||
    !Number.isInteger(valor.producto_id) ||
    valor.producto_id <= 0 ||
    (valor.origen !== "catalogo" && valor.origen !== "personalizado") ||
    typeof valor.es_modificacion !== "boolean" ||
    typeof valor.descripcion_cliente !== "string" ||
    typeof info.nombre !== "string" ||
    typeof info.precio_base !== "number" ||
    !Number.isFinite(info.precio_base) ||
    typeof info.permite_modificaciones !== "boolean" ||
    typeof info.requiere_anticipo !== "boolean"
  ) {
    return null;
  }
  return {
    uid: valor.uid,
    producto_id: valor.producto_id,
    origen: valor.origen,
    es_modificacion: valor.es_modificacion,
    descripcion_cliente: valor.descripcion_cliente,
    info: {
      nombre: info.nombre,
      precio_base: info.precio_base,
      permite_modificaciones: info.permite_modificaciones,
      requiere_anticipo: info.requiere_anticipo,
    },
  };
};

const sanearContacto = (valor: unknown): ContactoClienteInput => {
  const dato = esRegistro(valor) ? valor : {};
  const red = redesValidas.find((opcion) => opcion === dato.tipo_red_social) ?? "";
  return {
    nombre: texto(dato.nombre),
    telefono: texto(dato.telefono),
    tipo_red_social: red,
    url_perfil: texto(dato.url_perfil),
  };
};

const sanearEntrega = (valor: unknown): CreatePedidoEntregaInput => {
  const dato = esRegistro(valor) ? valor : {};
  return {
    calle: texto(dato.calle),
    numero_casa: texto(dato.numero_casa),
    referencia: texto(dato.referencia),
    municipio: texto(dato.municipio),
    maps_url: texto(dato.maps_url),
    notas: texto(dato.notas),
  };
};

const quitarClave = (storage: Storage | undefined): void => {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // El almacenamiento puede estar bloqueado; el estado en memoria sigue usable.
  }
};

/** Elimina únicamente el borrador privado propiedad de esta aplicación. */
export const eliminarBorradorPedidoCliente = (): void => {
  quitarClave(typeof localStorage === "undefined" ? undefined : localStorage);
  quitarClave(typeof sessionStorage === "undefined" ? undefined : sessionStorage);
};

const cargarEstado = (): Partial<EstadoPersistido> => {
  // El borrador legado puede contener PII: se elimina sin leerlo ni migrarlo.
  quitarClave(typeof localStorage === "undefined" ? undefined : localStorage);
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const valor: unknown = JSON.parse(raw);
    if (!esRegistro(valor)) return {};
    const lineas = Array.isArray(valor.lineas)
      ? valor.lineas.map(sanearLinea).filter((linea): linea is PedidoClienteLinea => linea !== null)
      : [];
    return {
      lineas,
      contacto: sanearContacto(valor.contacto),
      entrega: sanearEntrega(valor.entrega),
      fechaSolicitada: typeof valor.fechaSolicitada === "string" ? valor.fechaSolicitada : null,
      mapsUrlOmitida: typeof valor.mapsUrlOmitida === "boolean" ? valor.mapsUrlOmitida : false,
      intentosOmitirMaps:
        typeof valor.intentosOmitirMaps === "number" &&
        Number.isInteger(valor.intentosOmitirMaps) &&
        valor.intentosOmitirMaps >= 0
          ? valor.intentosOmitirMaps
          : 0,
    };
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
  const ultimoResumen = ref<ResumenPedidoEnviado | null>(null);

  // Estado NO serializable (solo memoria): fotos `File[]` por `uid` de línea.
  const fotosPorLinea = ref<Record<string, File[]>>({});

  const persistir = () => {
    if (typeof sessionStorage === "undefined") return;
    const estado: EstadoPersistido = {
      lineas: lineas.value.map(sanearLinea).filter((linea): linea is PedidoClienteLinea => !!linea),
      contacto: sanearContacto(contacto.value),
      entrega: sanearEntrega(entrega.value),
      fechaSolicitada: typeof fechaSolicitada.value === "string" ? fechaSolicitada.value : null,
      mapsUrlOmitida: mapsUrlOmitida.value === true,
      intentosOmitirMaps:
        Number.isInteger(intentosOmitirMaps.value) && intentosOmitirMaps.value >= 0
          ? intentosOmitirMaps.value
          : 0,
    };
    const activo =
      estado.lineas.length > 0 ||
      Object.values(estado.contacto).some(Boolean) ||
      Object.values(estado.entrega).some(Boolean) ||
      !!estado.fechaSolicitada ||
      estado.mapsUrlOmitida ||
      estado.intentosOmitirMaps > 0;
    try {
      if (activo) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Modo privado/cuota: el flujo continúa en memoria durante la sesión.
    }
  };

  watch(
    [lineas, contacto, entrega, fechaSolicitada, mapsUrlOmitida, intentosOmitirMaps],
    persistir,
    {
      deep: true,
    },
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
    eliminarBorradorPedidoCliente();
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
