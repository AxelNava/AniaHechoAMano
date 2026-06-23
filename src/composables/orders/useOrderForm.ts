import { ref, computed } from "vue";
import type {
  CreateOrderComponenteInput,
  CreateOrderProductoInput,
  CreateOrderProductoPayload,
  ProductoInfoPedidoDto,
} from "@/types/orders/createOrderDto";

const generateUid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const mapComponentesActuales = (info: ProductoInfoPedidoDto): CreateOrderComponenteInput[] =>
  info.componentes.map((componente) => ({
    componente_id: componente.componente_id,
    nombre: componente.nombre,
    unidad_medida: componente.unidad_medida,
    cantidad: componente.cantidad,
    costo_unitario_congelado: componente.costo_unitario_actual ?? 0,
    minutos_unitarios_congelados: componente.minutos_unitarios_actuales,
  }));

export function useOrderForm() {
  const productos = ref<CreateOrderProductoInput[]>([]);

  const addCatalogItem = (info: ProductoInfoPedidoDto) => {
    productos.value.push({
      uid: generateUid(),
      origen: "catalogo",
      producto_id: info.id,
      nombre: info.nombre,
      categoria_id: info.categoria_id ?? undefined,
      descripcion_cliente: info.nombre,
      precio_fijado_admin: info.precio_base,
      tiempo_total_estimado_minutos: info.tiempo_total_estimado_minutos,
      componentes: mapComponentesActuales(info),
    });
  };

  const addCustomItem = () => {
    productos.value.push({
      uid: generateUid(),
      origen: "personalizado",
      nombre: "Producto personalizado",
      descripcion_cliente: "",
      precio_fijado_admin: null,
      tiempo_total_estimado_minutos: null,
      componentes: [],
    });
  };

  const removeItem = (uid: string) => {
    productos.value = productos.value.filter((item) => item.uid !== uid);
  };

  const duplicateItem = (uid: string) => {
    const item = productos.value.find((p) => p.uid === uid);
    if (!item) return;

    productos.value.push({
      ...item,
      uid: generateUid(),
      componentes: item.componentes.map((componente) => ({ ...componente })),
    });
  };

  const precioTotalSugerido = computed(() =>
    productos.value.reduce((total, item) => total + (item.precio_fijado_admin ?? 0), 0),
  );

  const buildProductosPayload = (): CreateOrderProductoPayload[] =>
    productos.value.map((item) => ({
      producto_id: item.producto_id,
      categoria_id: item.categoria_id,
      descripcion_cliente: item.descripcion_cliente,
      precio_fijado_admin:
        typeof item.precio_fijado_admin === "number" ? item.precio_fijado_admin : undefined,
      tiempo_total_estimado_minutos:
        typeof item.tiempo_total_estimado_minutos === "number"
          ? item.tiempo_total_estimado_minutos
          : undefined,
      foto_referencia_url: item.foto_referencia_url,
      componentes: item.componentes.length
        ? item.componentes.map((componente) => ({
            componente_id: componente.componente_id,
            cantidad: componente.cantidad,
            costo_unitario_congelado: componente.costo_unitario_congelado,
            minutos_unitarios_congelados: componente.minutos_unitarios_congelados,
          }))
        : undefined,
    }));

  return {
    productos,
    addCatalogItem,
    addCustomItem,
    removeItem,
    duplicateItem,
    precioTotalSugerido,
    buildProductosPayload,
  };
}
