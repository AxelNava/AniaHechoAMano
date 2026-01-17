<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types'

defineProps<{
  breadcrumbs: BreadcrumbItemType[]
}>()
</script>

<template>
  <Breadcrumb v-if="breadcrumbs.length > 0">
    <BreadcrumbList>
      <template v-for="(item, index) in breadcrumbs" :key="index">
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === breadcrumbs.length - 1">
            {{ item.title }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else :as-child="true">
            <a :href="item.href">
              {{ item.title }}
            </a>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
