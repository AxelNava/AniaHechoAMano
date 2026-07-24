// Espejo manual de los DTO de agenda (admin) del backend
// (`src/disponibilidad/dto/agenda-config.dto.ts` y `bloqueo.dto.ts`).
// Endpoints admin aislados (hoy sin proteger): `/api/agenda/config`,
// `/api/agenda/bloqueos`.
//
// Nota de forma: en el backend `updated_at`/`creado_en` se declaran como `Date`,
// pero viajan por HTTP como string ISO (JSON) — aquí se tipan como `string`, que
// es la forma real que recibe el cliente.

/** Tipo de bloqueo de agenda (espejo del enum Prisma `TipoBloqueoAgenda`). */
export type TipoBloqueoAgenda = "FERIADO" | "PERSONAL" | "OCUPADO";

/** Configuración de agenda (singleton) tal como se devuelve al admin. */
export interface AgendaConfigDto {
  id: number;
  capacidad_minutos_dia: number;
  dias_anticipacion_min: number;
  activo: boolean;
  updated_at: string;
}

/**
 * Actualización parcial del singleton de agenda (`PUT /api/agenda/config`).
 * Todos los campos son opcionales; solo se aplican los presentes.
 */
export interface UpdateAgendaConfigDto {
  capacidad_minutos_dia?: number;
  dias_anticipacion_min?: number;
  activo?: boolean;
}

/** Bloqueo de agenda tal como se devuelve al admin. */
export interface BloqueoDto {
  id: number;
  fecha: string;
  tipo: TipoBloqueoAgenda;
  motivo: string | null;
  creado_en: string;
}

/** Alta de un bloqueo de agenda (`POST /api/agenda/bloqueos`). */
export interface CreateBloqueoDto {
  fecha: string;
  tipo: TipoBloqueoAgenda;
  motivo?: string;
}

/**
 * Filtro opcional por rango para listar bloqueos (`GET /api/agenda/bloqueos`).
 * Espejo de `BloqueosQueryDto` del backend (`src/disponibilidad/dto/bloqueo.dto.ts`).
 * Ambos límites son días ISO "YYYY-MM-DD" e inclusivos.
 */
export interface BloqueosQueryDto {
  desde?: string;
  hasta?: string;
}
