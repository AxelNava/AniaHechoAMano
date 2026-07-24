/** Día en formato ISO corto `YYYY-MM-DD` (sin hora, sin zona horaria). */
export type DiaISO = string

/** Mes visible en formato `YYYY-MM`. */
export type MesISO = string

export interface CeldaDia {
  /** `YYYY-MM-DD` del día. */
  iso: DiaISO
  /** Número de día del mes (1-31). */
  dia: number
  /** false si el día está deshabilitado (no seleccionable). */
  seleccionable: boolean
  /** true si es el día actualmente seleccionado. */
  seleccionado: boolean
  /** true si corresponde al día de hoy (solo resaltado visual). */
  esHoy: boolean
  /**
   * true si el día está en la lista `diasResaltados` (marca puramente visual,
   * p.ej. días bloqueados en la agenda del admin). No afecta la selectividad.
   */
  resaltado: boolean
}
