import type { Component } from "vue";

export type DataTableRowKey<TRow> = keyof TRow | ((row: TRow) => string | number);

type BaseColumn = {
  id?: string;
  label: string;
  headerClass?: string;
  cellClass?: string;
  cellComponent?: Component;
};

type ColumnWithProp<TRow, TProp extends keyof TRow = keyof TRow> = BaseColumn & {
  prop: TProp;
  accessor?: never;
};

type ColumnWithAccessor<TRow> = BaseColumn & {
  accessor: (row: TRow) => unknown;
  prop?: never;
};

export type DataTableColumnDefinition<TRow> = ColumnWithProp<TRow> | ColumnWithAccessor<TRow>;

export type DataTableResolvedColumn<TRow> = Omit<DataTableColumnDefinition<TRow>, "id"> & {
  id: string;
  cellSlot?: (props: { row: TRow; value: unknown }) => unknown;
};

export type DataTableParsedColumnNode<TRow> = {
  id?: string;
  label?: string;
  prop?: keyof TRow;
  accessor?: (row: TRow) => unknown;
  headerClass?: string;
  cellClass?: string;
  cellComponent?: DataTableColumnDefinition<TRow>["cellComponent"];
  cellSlot?: (props: { row: TRow; value: unknown }) => unknown;
};
