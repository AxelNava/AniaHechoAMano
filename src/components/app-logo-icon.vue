<script setup lang="ts">
import logo from "@/assets/images/logo.jpg";

defineProps<{
  class?: string;
}>();
</script>

<template>
  <img :src="logo" :class="$props.class" alt="" aria-hidden="true" />
</template>
