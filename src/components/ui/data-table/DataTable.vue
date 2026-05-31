<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import { computed, Fragment, type VNode } from "vue";
import DataTableColumn from "./DataTableColumn.vue";
import type {
  DataTableParsedColumnNode,
  DataTableResolvedColumn,
  DataTableRowKey,
} from "./types";

const props = withDefaults(
  defineProps<{
    rows: TRow[];
    rowKey: DataTableRowKey<TRow>;
    emptyMessage?: string;
    tableClass?: string;
  }>(),
  {
    emptyMessage: "No hay registros disponibles",
    tableClass: "",
  }
);

const slots = defineSlots<{
  default?: () => VNode[];
}>();

const resolveRowKey = (row: TRow): string | number => {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row);
  }

  const key = row[props.rowKey];
  return typeof key === "number" || typeof key === "string" ? key : String(key);
};

const resolveCellValue = (row: TRow, column: DataTableResolvedColumn<TRow>): unknown => {
  if ("accessor" in column && typeof column.accessor === "function") {
    return column.accessor(row);
  }

  if ("prop" in column && column.prop !== undefined) {
    return row[column.prop];
  }

  return undefined;
};

const flattenNodes = (nodes: VNode[]): VNode[] => {
  const result: VNode[] = [];

  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...flattenNodes(node.children as VNode[]));
      continue;
    }

    result.push(node);
  }

  return result;
};

const normalizeColumnProps = (
  rawProps: DataTableParsedColumnNode<TRow> & Record<string, unknown>,
): DataTableParsedColumnNode<TRow> => {
  return {
    id: (rawProps.id as string | undefined) ?? (rawProps["id"] as string | undefined),
    label: (rawProps.label as string | undefined) ?? (rawProps["label"] as string | undefined),
    prop: (rawProps.prop as keyof TRow | undefined) ?? (rawProps["prop"] as keyof TRow | undefined),
    accessor:
      (rawProps.accessor as ((row: TRow) => unknown) | undefined) ??
      (rawProps["accessor"] as ((row: TRow) => unknown) | undefined),
    headerClass:
      (rawProps.headerClass as string | undefined) ??
      (rawProps["header-class"] as string | undefined),
    cellClass:
      (rawProps.cellClass as string | undefined) ?? (rawProps["cell-class"] as string | undefined),
    cellComponent:
      (rawProps.cellComponent as DataTableParsedColumnNode<TRow>["cellComponent"]) ??
      (rawProps["cell-component"] as DataTableParsedColumnNode<TRow>["cellComponent"]),
  };
};

const slotColumns = computed<DataTableResolvedColumn<TRow>[]>(() => {
  const defaultNodes = slots.default ? flattenNodes(slots.default()) : [];
  const columnNodes = defaultNodes.filter((node) => node.type === DataTableColumn);
  const parsedColumns: DataTableResolvedColumn<TRow>[] = [];

  columnNodes.forEach((node, index) => {
    const nodeProps = normalizeColumnProps(
      (node.props ?? {}) as DataTableParsedColumnNode<TRow> & Record<string, unknown>,
    );
    const children = node.children as
      | {
          default?: (props: { row: TRow; value: unknown }) => unknown;
        }
      | null;

    const hasAccessor = typeof nodeProps.accessor === "function";
    const hasProp = nodeProps.prop !== undefined;
    if (!hasAccessor && !hasProp) {
      return;
    }

    const columnId =
      typeof nodeProps.id === "string" && nodeProps.id.length > 0
        ? nodeProps.id
        : typeof nodeProps.prop === "string"
          ? nodeProps.prop
          : `column-${index}`;

    const baseColumn = {
      id: columnId,
      label: nodeProps.label ?? "",
      headerClass: nodeProps.headerClass,
      cellClass: nodeProps.cellClass,
      cellComponent: nodeProps.cellComponent,
      cellSlot: children?.default,
    };

    if (hasAccessor) {
      parsedColumns.push({
        ...baseColumn,
        accessor: nodeProps.accessor!,
      });
      return;
    }

    parsedColumns.push({
      ...baseColumn,
      prop: nodeProps.prop!,
    });
  });

  return parsedColumns;
});

const resolvedColumns = computed<DataTableResolvedColumn<TRow>[]>(() => {
  return slotColumns.value;
});

const hasRows = computed(() => props.rows.length > 0);
</script>

<template>
  <div class="hidden">
    <slot />
  </div>
  <div class="overflow-x-auto">
    <table :class="['min-w-full divide-y divide-gray-200', tableClass]">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in resolvedColumns"
            :key="column.id"
            :class="[
              'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600',
              column.headerClass,
            ]"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        <tr v-if="!hasRows">
          <td :colspan="resolvedColumns.length" class="px-4 py-8 text-center text-sm text-gray-500">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr
          v-for="row in rows"
          v-else
          :key="resolveRowKey(row)"
          class="align-top transition-colors hover:bg-gray-50"
        >
          <td
            v-for="column in resolvedColumns"
            :key="`${resolveRowKey(row)}-${column.id}`"
            :class="['px-4 py-4 text-sm text-gray-700', column.cellClass]"
          >
            <component
              :is="column.cellComponent"
              :row="row"
              :value="resolveCellValue(row, column)"
              v-if="column.cellComponent"
            />
            <component
              :is="{
                render: () => column.cellSlot?.({ row, value: resolveCellValue(row, column) }),
              }"
              v-else-if="column.cellSlot"
            />
            <template v-else>
              {{ resolveCellValue(row, column) }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
