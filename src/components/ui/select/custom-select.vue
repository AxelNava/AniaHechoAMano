<script setup lang="ts">
interface OptionSelect {
  index: string;
  value: string;
  text: string;
}
interface Props {
  name: string;
  id: string;
  options?: OptionSelect[];
  optionPlaceholder?: string;
  onChange?: (event: Event) => void;
  defaultValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  optionPlaceholder: "Selecciona una opción",
});
</script>
<template>
  <select name="{{props.name}}" id="{{props.id}}">
    <option value="" disabled selected>{{ props.optionPlaceholder }}</option>
    <option
      v-for="optionProp in props.options"
      :key="optionProp.index"
      value="{{optionProp.value}}"
      :selected="props.defaultValue !== null && optionProp.value === props.defaultValue"
    >
      {{ optionProp.text }}
    </option>
  </select>
</template>

<style scoped></style>
