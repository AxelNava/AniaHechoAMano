// Espejo manual de los DTO de salida de disponibilidad del backend
// (`src/disponibilidad/dto/disponibilidad-response.dto.ts`). Las fechas son
// strings de calendario "YYYY-MM-DD" en la TZ de negocio.

/**
 * Resultado de evaluar UN día (`POST /api/disponibilidad/evaluar`). `motivos`
 * viene vacío cuando `disponible` es `true`; `sugerencias` son días alternativos
 * ("YYYY-MM-DD") ofrecidos cuando el día pedido no está disponible.
 */
export interface DisponibilidadResponseDto {
  disponible: boolean;
  motivos: string[];
  sugerencias: string[];
}

/** Disponibilidad de un día dentro de un rango consultado por el calendario. */
export interface DiaDisponibilidadDto {
  fecha: string;
  disponible: boolean;
  motivos: string[];
}

/**
 * Respuesta de `GET /api/disponibilidad/dias`. El calendario del cliente deriva
 * `diasDisponibles`/`diasDeshabilitados` de `dias[]` y usa `min_fecha` como día
 * mínimo seleccionable (lead-time).
 */
export interface DiasDisponibilidadResponseDto {
  desde: string;
  hasta: string;
  min_fecha: string;
  dias_anticipacion_min: number;
  capacidad_minutos_dia: number;
  dias: DiaDisponibilidadDto[];
}
