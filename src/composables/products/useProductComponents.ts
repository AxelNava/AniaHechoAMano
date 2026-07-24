import { computed, ref, type ComputedRef, type Ref } from "vue";
import { toast } from "vue-sonner";
import { ComponentsApi } from "@/services/products/componentsApi";
import { useComponentsStore } from "@/stores/componentsStore";
import type { ComponenteDto } from "@/types/products/ComponenteDto";
import type { ComponentsDto } from "@/types/products/ComponentsDto";

// Fila local de la receta: `uid` es solo un identificador estable para `:key`.
// Los datos del componente (nombre, unidad, etc.) se resuelven desde el store.
export interface FilaReceta {
  uid: string;
  componente_id: number | null;
  cantidad: number;
}

// Datos editables de un componente desde el formulario de edición de la receta.
export interface DatosEdicionComponente {
  nombre: string;
  tipo: string;
  descripcion: string;
  unidad_medida: string;
  requiere_pedido_previo: boolean;
}

const crearUid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `fila-receta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// Nombre que recibe la copia de un componente creada para un producto concreto.
export function nombreCopiaComponente(nombreOriginal: string, nombreProducto: string): string {
  return `${nombreOriginal} - copia para ${nombreProducto}`;
}

// Serializa la receta al JSON string que espera el backend en `multipart/form-data`.
export function serializarComponentes(receta: ComponentsDto[]): string {
  return JSON.stringify(
    receta.map((componente) => ({
      componente_id: componente.componente_id,
      cantidad: Number(componente.cantidad),
    })),
  );
}

interface UseProductComponents {
  filas: Ref<FilaReceta[]>;
  recetaValida: ComputedRef<ComponentsDto[]>;
  guardando: Ref<boolean>;
  setReceta: (componentes: ComponentsDto[]) => void;
  agregarFila: () => void;
  quitarFila: (index: number) => void;
  seleccionarComponente: (index: number, id: number) => boolean;
  esDuplicado: (index: number) => boolean;
  crearCopiaParaProducto: (
    index: number,
    datos: DatosEdicionComponente,
    nombreProducto: string,
  ) => Promise<boolean>;
  editarComponenteGlobal: (index: number, datos: DatosEdicionComponente) => Promise<boolean>;
}

export function useProductComponents(): UseProductComponents {
  const componentsStore = useComponentsStore();
  const componentsApi = new ComponentsApi();

  const filas = ref<FilaReceta[]>([]);
  const guardando = ref(false);

  // Solo filas con componente elegido y cantidad numérica positiva.
  const recetaValida = computed<ComponentsDto[]>(() =>
    filas.value
      .filter((fila) => {
        const cantidad = Number(fila.cantidad);
        return typeof fila.componente_id === "number" && Number.isFinite(cantidad) && cantidad > 0;
      })
      .map((fila) => ({
        componente_id: fila.componente_id as number,
        cantidad: Number(fila.cantidad),
      })),
  );

  const setReceta = (componentes: ComponentsDto[]) => {
    filas.value = componentes.map((componente) => ({
      uid: crearUid(),
      componente_id: componente.componente_id,
      cantidad: Number(componente.cantidad),
    }));
  };

  const agregarFila = () => {
    filas.value.push({ uid: crearUid(), componente_id: null, cantidad: 1 });
  };

  const quitarFila = (index: number) => {
    filas.value.splice(index, 1);
  };

  const esDuplicado = (index: number) => {
    const fila = filas.value[index];
    if (!fila || fila.componente_id === null) return false;

    return filas.value.some(
      (otra, otroIndex) => otroIndex !== index && otra.componente_id === fila.componente_id,
    );
  };

  const seleccionarComponente = (index: number, id: number) => {
    const fila = filas.value[index];
    if (!fila) return false;

    const yaUsado = filas.value.some(
      (otra, otroIndex) => otroIndex !== index && otra.componente_id === id,
    );
    if (yaUsado) {
      toast.error("Ese componente ya está en otra fila de la receta");
      return false;
    }

    fila.componente_id = id;
    return true;
  };

  const esComponenteValido = (resultado: ComponenteDto | null): resultado is ComponenteDto =>
    // `useFetch` no comprueba `response.ok`: un ProblemDetails (4xx) llega como
    // "resultado". Solo tratamos como éxito una respuesta con `id` numérico.
    resultado !== null && typeof resultado.id === "number";

  const crearCopiaParaProducto = async (
    index: number,
    datos: DatosEdicionComponente,
    nombreProducto: string,
  ): Promise<boolean> => {
    const fila = filas.value[index];
    if (!fila || typeof fila.componente_id !== "number") return false;

    const original = componentsStore.components.find(
      (componente) => componente.id === fila.componente_id,
    );
    if (!original) {
      toast.error("No se encontró el componente original");
      return false;
    }

    guardando.value = true;
    try {
      // La copia usa el nombre ORIGINAL del store como base, aunque el usuario
      // haya editado el campo nombre en el formulario.
      const copia = await componentsApi.createComponentes({
        tipo: datos.tipo,
        nombre: nombreCopiaComponente(original.nombre, nombreProducto),
        descripcion: datos.descripcion,
        unidad_medida: datos.unidad_medida,
        requiere_pedido_previo: datos.requiere_pedido_previo,
        activo: true,
        forzarCreacion: true,
      });

      if (!esComponenteValido(copia)) {
        toast.error("No se pudo crear la copia del componente");
        return false;
      }

      componentsStore.addComponent(copia);
      fila.componente_id = copia.id;
      toast.success("Copia del componente creada para este producto");
      return true;
    } finally {
      guardando.value = false;
    }
  };

  const editarComponenteGlobal = async (
    index: number,
    datos: DatosEdicionComponente,
  ): Promise<boolean> => {
    const fila = filas.value[index];
    if (!fila || typeof fila.componente_id !== "number") return false;

    guardando.value = true;
    try {
      const actualizado = await componentsApi.updateComponente(fila.componente_id, {
        tipo: datos.tipo,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        unidad_medida: datos.unidad_medida,
        requiere_pedido_previo: datos.requiere_pedido_previo,
      });

      if (!esComponenteValido(actualizado)) {
        toast.error("No se pudo actualizar el componente");
        return false;
      }

      componentsStore.updateComponent(fila.componente_id, actualizado);
      toast.success("Componente actualizado para todos los productos");
      return true;
    } finally {
      guardando.value = false;
    }
  };

  return {
    filas,
    recetaValida,
    guardando,
    setReceta,
    agregarFila,
    quitarFila,
    seleccionarComponente,
    esDuplicado,
    crearCopiaParaProducto,
    editarComponenteGlobal,
  };
}
