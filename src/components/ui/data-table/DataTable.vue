<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import { computed, Fragment, type VNode } from "vue";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-vue-next";
import DataTableColumn from "./DataTableColumn.vue";
import type {
  DataTableParsedColumnNode,
  DataTableResolvedColumn,
  DataTableRowKey,
  DataTableSort,
} from "./types";

const props = withDefaults(
  defineProps<{
    rows: TRow[];
    rowKey: DataTableRowKey<TRow>;
    emptyMessage?: string;
    tableClass?: string;
  }>(),
  {
    emptyMessage: "No hay dato",
    tableClass: "",
  }
);

const slots = defineSlots<{
  default?: () => VNode[];
  toolbar?: () => unknown;
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

const coerceBoolean = (value: unknown): boolean => {
  // Vue renders a bare boolean attribute (`sortable`) as an empty string in raw vnode props.
  return value === true || value === "";
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
    sortable: coerceBoolean(rawProps.sortable ?? rawProps["sortable"]),
    sortKey:
      (rawProps.sortKey as string | undefined) ?? (rawProps["sort-key"] as string | undefined),
    sortAscLabel:
      (rawProps.sortAscLabel as string | undefined) ??
      (rawProps["sort-asc-label"] as string | undefined),
    sortDescLabel:
      (rawProps.sortDescLabel as string | undefined) ??
      (rawProps["sort-desc-label"] as string | undefined),
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
      sortable: nodeProps.sortable === true,
      // nodeProps.sortable is already coerced to a boolean in normalizeColumnProps.
      sortKey: nodeProps.sortKey,
      sortAscLabel: nodeProps.sortAscLabel,
      sortDescLabel: nodeProps.sortDescLabel,
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

const sort = defineModel<DataTableSort | null>("sort", { default: null });

const resolveSortKey = (column: DataTableResolvedColumn<TRow>): string => {
  if (column.sortKey) {
    return column.sortKey;
  }
  return "prop" in column && typeof column.prop === "string" ? column.prop : column.id;
};

const sortDirectionFor = (
  column: DataTableResolvedColumn<TRow>,
): DataTableSort["direction"] | null => {
  const current = sort.value;
  if (!current || current.key !== resolveSortKey(column)) {
    return null;
  }
  return current.direction;
};

const toggleSort = (column: DataTableResolvedColumn<TRow>): void => {
  const key = resolveSortKey(column);
  const direction = sortDirectionFor(column);

  if (direction === null) {
    sort.value = { key, direction: "asc" };
    return;
  }

  if (direction === "asc") {
    sort.value = { key, direction: "desc" };
    return;
  }

  sort.value = null;
};

const sortTooltipFor = (column: DataTableResolvedColumn<TRow>): string => {
  const ascLabel = column.sortAscLabel ?? "menor a mayor";
  const descLabel = column.sortDescLabel ?? "mayor a menor";
  const direction = sortDirectionFor(column);

  if (direction === "asc") {
    return `Ordenado de ${ascLabel} (clic para ${descLabel})`;
  }

  if (direction === "desc") {
    return `Ordenado de ${descLabel} (clic para quitar el orden)`;
  }

  return `Ordenar de ${ascLabel}`;
};
</script>

<template>
  <div class="hidden">
    <slot />
  </div>
  <div class="overflow-x-auto">
    <div
      v-if="$slots.toolbar"
      class="flex items-center justify-end gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3"
    >
      <slot name="toolbar" />
    </div>
    <table :class="['min-w-full divide-y divide-gray-200', tableClass]">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in resolvedColumns"
            :key="column.id"
            :aria-sort="
              column.sortable
                ? sortDirectionFor(column) === 'asc'
                  ? 'ascending'
                  : sortDirectionFor(column) === 'desc'
                    ? 'descending'
                    : 'none'
                : undefined
            "
            :class="[
              'px-4 py-3 text-left text-sm font-medium tracking-normal text-gray-600',
              column.headerClass,
            ]"
          >
            <button
              v-if="column.sortable"
              type="button"
              :title="sortTooltipFor(column)"
              :aria-label="sortTooltipFor(column)"
              class="group inline-flex items-center gap-1 rounded transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              @click="toggleSort(column)"
            >
              <span>{{ column.label }}</span>
              <ArrowUp
                v-if="sortDirectionFor(column) === 'asc'"
                class="h-3.5 w-3.5 shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <ArrowDown
                v-else-if="sortDirectionFor(column) === 'desc'"
                class="h-3.5 w-3.5 shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <ArrowUpDown
                v-else
                class="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600"
                aria-hidden="true"
              />
            </button>
            <template v-else>{{ column.label }}</template>
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
          class="align-middle transition-colors hover:bg-gray-50"
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
