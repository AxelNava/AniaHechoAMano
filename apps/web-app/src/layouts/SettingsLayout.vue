<script setup lang="ts">
import Heading from '@/components/heading.vue'
import { Button, Separator } from '@/components/ui'
import { Link, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()
const currentPath = computed(() => page.url)

const sidebarNavItems = [
  {
    title: 'Profile',
    href: '/settings/profile',
  },
  {
    title: 'Password',
    href: '/settings/password',
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
  },
]
</script>

<template>
  <div class="px-4 py-6">
    <Heading title="Settings" description="Manage your profile and account settings" />
    <div class="flex flex-col lg:flex-row lg:space-x-12">
      <aside class="w-full max-w-xl lg:w-48">
        <nav class="flex flex-col space-y-1">
          <Button
            v-for="item in sidebarNavItems"
            :key="item.href"
            size="sm"
            variant="ghost"
            as-child
            :class="[
              'w-full justify-start',
              currentPath === item.href ? 'bg-muted' : ''
            ]"
          >
            <Link :href="item.href">
              {{ item.title }}
            </Link>
          </Button>
        </nav>
      </aside>
      <Separator class="my-6 lg:hidden" />
      <div class="flex-1 md:max-w-2xl">
        <section class="max-w-xl space-y-12">
          <slot />
        </section>
      </div>
    </div>
  </div>
</template>
