export interface ProductImportErrorDto {
  readonly hoja: string;
  readonly fila: number;
  readonly campo: string;
  readonly mensaje: string;
}

export interface ProductImportActionSummaryDto {
  readonly crear: number;
  readonly actualizar: number;
  readonly total: number;
}

export interface ProductImportRelationSummaryDto {
  readonly componentes: number;
  readonly etiquetas: number;
}

export interface ProductImportSummaryDto {
  readonly categorias: ProductImportActionSummaryDto;
  readonly etiquetas: ProductImportActionSummaryDto;
  readonly componentes: ProductImportActionSummaryDto;
  readonly productos: ProductImportActionSummaryDto;
  readonly relaciones: ProductImportRelationSummaryDto;
}

export interface ProductImportPreviewDto {
  readonly valido: boolean;
  readonly sha256: string;
  readonly resumen: ProductImportSummaryDto;
  readonly errores: readonly ProductImportErrorDto[];
}

export interface ProductImportConfirmationDto {
  readonly sha256: string;
  readonly resumen: ProductImportSummaryDto;
}

export type ImportError = ProductImportErrorDto;
export type ImportActionSummary = ProductImportActionSummaryDto;
export type ImportRelationSummary = ProductImportRelationSummaryDto;
export type ImportSummary = ProductImportSummaryDto;
export type ImportPreview = ProductImportPreviewDto;
export type ImportConfirmation = ProductImportConfirmationDto;
