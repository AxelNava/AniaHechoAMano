<script setup lang="ts">
import InputError from '@/components/input-error.vue'
import { Button, Input, Label } from '@/components/ui'
import AppLayout from '@/layouts/AppLayout.vue'
import SettingsLayout from '@/layouts/SettingsLayout.vue'
import { Head, useForm, usePage, Link } from '@inertiajs/vue3'
import type { BreadcrumbItem, SharedData } from '@/types'
import { computed } from 'vue'

defineProps<{
  mustVerifyEmail?: boolean
  status?: string
}>()

const page = usePage<SharedData>()
const user = computed(() => page.props.auth.user)

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Profile settings',
    href: '/settings/profile',
  },
]

const form = useForm({
  name: user.value.name,
  email: user.value.email,
})

const submit = () => {
  form.patch('/settings/profile', {
    preserveScroll: true,
  })
}
</script>

<template>
  <AppLayout :breadcrumbs="breadcrumbs">
    <Head title="Profile settings" />

    <SettingsLayout>
      <div class="space-y-6">
        <div class="mb-8 space-y-0.5">
          <h2 class="text-xl font-semibold tracking-tight">Profile information</h2>
          <p class="text-sm text-muted-foreground">Update your name and email address</p>
        </div>

        <form @submit.prevent="submit" class="space-y-6">
          <div class="grid gap-2">
            <Label for="name">Name</Label>
            <Input
              id="name"
              class="mt-1 block w-full"
              v-model="form.name"
              required
              autocomplete="name"
              placeholder="Full name"
            />
            <InputError :message="form.errors.name" />
          </div>

          <div class="grid gap-2">
            <Label for="email">Email address</Label>
            <Input
              id="email"
              type="email"
              class="mt-1 block w-full"
              v-model="form.email"
              required
              autocomplete="username"
              placeholder="Email address"
            />
            <InputError :message="form.errors.email" />
          </div>

          <div v-if="mustVerifyEmail && user.email_verified_at === null">
            <p class="-mt-4 text-sm text-muted-foreground">
              Your email address is unverified.
              <Link
                href="/email/verification-notification"
                method="post"
                as="button"
                class="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
              >
                Click here to resend the verification email.
              </Link>
            </p>
            <div v-if="status === 'verification-link-sent'" class="mt-2 text-sm font-medium text-green-600">
              A new verification link has been sent to your email address.
            </div>
          </div>

          <div class="flex items-center gap-4">
            <Button :disabled="form.processing">Save</Button>
            <Transition
              enter-active-class="transition ease-in-out"
              enter-from-class="opacity-0"
              leave-active-class="transition ease-in-out"
              leave-to-class="opacity-0"
            >
              <p v-if="form.recentlySuccessful" class="text-sm text-neutral-600">Saved</p>
            </Transition>
          </div>
        </form>
      </div>
    </SettingsLayout>
  </AppLayout>
</template>
