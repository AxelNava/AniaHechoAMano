<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  tags: Record<string, string>
  className?: string
  classNameImg?: string
  urlTarget?: string
  imageSrc?: string
}>()

const tagsArray = computed(() => Object.values(props.tags))
</script>

<template>
  <div
    class="rounded-2xl relative shadow-[0_0_30px_20px_rgb(0_0_0/_0.1),0_0px_10px_-6px_rgb(0_0_0/_0.1)] grid grid-rows-subgrid hover:shadow-primary hover:cursor-pointer hover:[&>div>span]:-translate-y-10 hover:[&>div>span]:underline hover:[&>div>span]:opacity-100 hover:[&>div>img]:blur-[1px] hover:[&_h3>a]:underline transition-[color,box-shadow,background-color] duration-300"
    :class="className"
  >
    <div class="overflow-hidden relative aspect-video rounded-t-2xl">
      <img
        :src="imageSrc"
        alt=""
        class="bg-purple-300 ease-in-out transition-[filter] duration-200"
        :class="classNameImg"
      />
      <span
        class="opacity-0 absolute transition-all top-1/2 inset-x-2/8 text-center bg-text-page text-white rounded-2xl p-2"
        :aria-describedby="'my-id-' + title"
      >
        Ver detalles ->
      </span>
    </div>
    <div class="px-8 h-min container pb-4">
      <h3
        class="text-[1.3cqi] font-inter-var text-text-page font-[600]"
        :id="'my-id-' + title"
      >
        <a
          :href="urlTarget || '#'"
          class="after:absolute after:inset-0 after:content-[''] after:z-10"
        >
          {{ title }}
        </a>
      </h3>
      <span class="hidden font-inter-var text-text-page2 max-md:inline text-sm leading-10 opacity-90">
        Ver detalles ->
      </span>
      <p class="text-text-page2 my-4 text-base font-inter-var">
        <slot />
      </p>
      <div class="flex flex-wrap flex-row gap-2">
        <span
          v-for="(tag, index) in tagsArray"
          :key="index"
          class="bg-primary text-xs font-[600] bold text-text-page font-inter-var rounded-2xl p-2 px-6"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
