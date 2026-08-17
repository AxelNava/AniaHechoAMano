import { computed, readonly, shallowRef } from "vue";
import { toast } from "vue-sonner";
import { emergenciasApi } from "@/services/disponibilidad/emergenciasApi";
import { ApiError } from "@/services/http/apiClient";
import type {
  BloqueoEmergenciaDetalleDto,
  BloqueoEmergenciaListItemDto,
  CreateBloqueoEmergenciaDto,
  MarcarContactadoDto,
  PedidoAfectadoDto,
} from "@/types/disponibilidad/emergenciaDto";

const mensajeError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const convertirALista = ({
  afectados: _afectados,
  dias_bloqueados: _dias,
  dias_con_bloqueo_manual: _manuales,
  ...item
}: BloqueoEmergenciaDetalleDto): BloqueoEmergenciaListItemDto => item;

export function useBloqueosEmergencia() {
  const emergencias = shallowRef<BloqueoEmergenciaListItemDto[]>([]);
  const detalle = shallowRef<BloqueoEmergenciaDetalleDto | null>(null);
  const cargandoLista = shallowRef(false);
  const cargandoDetalle = shallowRef(false);
  const creando = shallowRef(false);
  const contactosEnCurso = shallowRef<ReadonlySet<number>>(new Set());
  const hayContactosEnCurso = computed(() => contactosEnCurso.value.size > 0);
  let tokenLista = 0,
    tokenDetalle = 0;

  const sincronizarAfectado = (afectado: PedidoAfectadoDto) => {
    if (!detalle.value) return;
    const afectados = detalle.value.afectados.map((actual) =>
      actual.id === afectado.id ? afectado : actual,
    );
    const pendientes_contacto = afectados.filter((actual) => !actual.contactado).length;
    const id = detalle.value.id;
    detalle.value = { ...detalle.value, afectados, pendientes_contacto };
    emergencias.value = emergencias.value.map((item) =>
      item.id === id ? { ...item, pendientes_contacto } : item,
    );
  };

  const cargarEmergencias = async (): Promise<boolean> => {
    if (creando.value || hayContactosEnCurso.value) return false;
    const token = ++tokenLista;
    cargandoLista.value = true;
    try {
      const data = await emergenciasApi.getEmergencias();
      if (token !== tokenLista) return false;
      emergencias.value = data;
      return true;
    } catch (error) {
      if (token !== tokenLista) return false;
      toast.error(mensajeError(error, "No se pudieron cargar las emergencias."));
      return false;
    } finally {
      if (token === tokenLista) cargandoLista.value = false;
    }
  };

  const cargarDetalle = async (emergenciaId: number): Promise<boolean> => {
    if (creando.value || hayContactosEnCurso.value) return false;
    const token = ++tokenDetalle;
    detalle.value = null;
    cargandoDetalle.value = true;
    try {
      const data = await emergenciasApi.getEmergencia(emergenciaId);
      if (token !== tokenDetalle) return false;
      detalle.value = data;
      return true;
    } catch (error) {
      if (token !== tokenDetalle) return false;
      toast.error(mensajeError(error, "No se pudo cargar la emergencia."));
      return false;
    } finally {
      if (token === tokenDetalle) cargandoDetalle.value = false;
    }
  };

  const crearEmergencia = async (
    dto: CreateBloqueoEmergenciaDto,
  ): Promise<BloqueoEmergenciaDetalleDto | null> => {
    if (creando.value || cargandoLista.value || cargandoDetalle.value || hayContactosEnCurso.value)
      return null;
    creando.value = true;
    try {
      const creada = await emergenciasApi.createEmergencia(dto);
      const item = convertirALista(creada);
      const existe = emergencias.value.some((actual) => actual.id === item.id);
      detalle.value = creada;
      emergencias.value = existe
        ? emergencias.value.map((actual) => (actual.id === item.id ? item : actual))
        : [item, ...emergencias.value];
      toast.success("Emergencia creada.");
      return creada;
    } catch (error) {
      toast.error(mensajeError(error, "No se pudo crear la emergencia."));
      return null;
    } finally {
      creando.value = false;
    }
  };

  const marcarContactado = async (
    emergenciaId: number,
    afectadoId: number,
    dto: MarcarContactadoDto,
  ): Promise<boolean> => {
    if (cargandoLista.value || cargandoDetalle.value || creando.value) return false;
    if (contactosEnCurso.value.has(afectadoId)) return false;
    const anterior =
      detalle.value?.id === emergenciaId
        ? detalle.value.afectados.find((afectado) => afectado.id === afectadoId)
        : undefined;
    if (!anterior) return false;
    if (anterior.contactado === dto.contactado) return true;

    contactosEnCurso.value = new Set([...contactosEnCurso.value, afectadoId]);
    sincronizarAfectado({
      ...anterior,
      contactado: dto.contactado,
      contactado_en: dto.contactado ? anterior.contactado_en : null,
    });
    try {
      const actualizado = await emergenciasApi.marcarContactado(emergenciaId, afectadoId, dto);
      sincronizarAfectado(actualizado);
      toast.success("Estado de contacto actualizado.");
      return true;
    } catch (error) {
      sincronizarAfectado(anterior);
      toast.error(mensajeError(error, "No se pudo actualizar el estado de contacto."));
      return false;
    } finally {
      const pendientes = new Set(contactosEnCurso.value);
      pendientes.delete(afectadoId);
      contactosEnCurso.value = pendientes;
    }
  };

  return {
    emergencias: readonly(emergencias),
    detalle: readonly(detalle),
    cargandoLista: readonly(cargandoLista),
    cargandoDetalle: readonly(cargandoDetalle),
    creando: readonly(creando),
    contactosEnCurso: readonly(contactosEnCurso),
    hayContactosEnCurso,
    cargarEmergencias,
    cargarDetalle,
    crearEmergencia,
    marcarContactado,
  };
}
