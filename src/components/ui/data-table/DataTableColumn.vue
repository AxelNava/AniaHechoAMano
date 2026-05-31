<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import type { DataTableColumnDefinition } from "./types";

defineOptions({
  name: "DataTableColumn",
});

defineProps<DataTableColumnDefinition<TRow>>();

defineSlots<{
  default?: (props: { row: TRow; value: unknown }) => unknown;
}>();
</script>

<template></template>
