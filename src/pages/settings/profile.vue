<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useAuthStore } from "@/stores/authStore"
import { buildManageUrl } from "@/auth/oidcClient"
import AppLayout from "@/layouts/AppLayout.vue"
import SettingsLayout from "@/layouts/SettingsLayout.vue"
import type { BreadcrumbItem } from "@/types"

const authStore = useAuthStore()
const profile = computed(() => authStore.profile)
const manageUrl = buildManageUrl(import.meta.env.VITE_OIDC_AUTHORITY)

const claimText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null

const displayName = computed(
  () => claimText(profile.value?.name) ?? claimText(profile.value?.preferred_username) ?? "No disponible en esta sesión",
)
const displayEmail = computed(() => claimText(profile.value?.email) ?? "No disponible en esta sesión")

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Perfil",
    href: "/settings/profile",
  },
]

onMounted(() => {
  document.title = "Perfil"
})
</script>

<template>
  <AppLayout :breadcrumbs="breadcrumbs">
    <SettingsLayout>
      <div class="space-y-6">
        <div class="mb-8 space-y-0.5">
          <h2 class="text-xl font-semibold tracking-tight">Información del perfil</h2>
          <p class="text-sm text-muted-foreground">Consulta las claims de tu sesión y administra tu cuenta desde IdentityServer.</p>
        </div>

        <div class="space-y-6">
          <p class="text-sm leading-6 text-muted-foreground">
            Tu nombre y correo se muestran desde la sesión actual. Este sitio no modifica esos datos ni ofrece verificación local del correo; los cambios realizados en IdentityServer no actualizan automáticamente la sesión abierta.
          </p>

          <dl class="space-y-4">
            <div class="grid gap-1">
              <dt class="text-sm font-medium text-foreground">Nombre</dt>
              <dd class="text-sm text-muted-foreground">{{ displayName }}</dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-sm font-medium text-foreground">Correo electrónico</dt>
              <dd class="text-sm text-muted-foreground">{{ displayEmail }}</dd>
            </div>
          </dl>

          <div v-if="manageUrl" class="space-y-2">
            <a
              :href="manageUrl"
              class="inline-flex items-center rounded-md bg-[#ead9ea] px-4 py-2 text-sm font-medium text-[#701548] underline-offset-4 transition-colors hover:bg-[#e2cce2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#701548] focus-visible:ring-offset-2"
            >
              Administrar nombre y correo
            </a>
            <p class="text-sm text-muted-foreground">Se abrirá la administración hospedada en la misma pestaña.</p>
          </div>
          <p v-else role="status" class="text-sm text-muted-foreground">
            La administración de tu cuenta no está disponible porque falta una configuración válida de IdentityServer.
          </p>
        </div>
      </div>
    </SettingsLayout>
  </AppLayout>
</template>
