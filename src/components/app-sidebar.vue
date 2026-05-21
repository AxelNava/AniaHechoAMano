<script setup lang="ts">
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
</script>

<template>
  <Sidebar variant="inset">
    <SidebarHeader>
       <div class="p-4 font-bold text-[#701548]">Ania</div>
    </SidebarHeader>
    <SidebarContent>
      <nav class="flex flex-col gap-2 p-4">
        <router-link
          to="/admin/products"
          class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors"
          active-class="bg-gray-100 text-[#701548]"
        >
          <span>Productos</span>
        </router-link>
        <router-link
          to="/admin/components"
          class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors"
          active-class="bg-gray-100 text-[#701548]"
        >
          <span>Componentes</span>
        </router-link>
      </nav>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
