<script setup lang="ts">
import InputError from '@/components/input-error.vue'
import TextLink from '@/components/text-link.vue'
import { Button, Checkbox, Input, Label } from '@/components/ui'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Head, useForm } from '@inertiajs/vue3'
import { LoaderCircle } from 'lucide-vue-next'

defineProps<{
  status?: string
  canResetPassword?: boolean
}>()

const form = useForm({
  email: '',
  password: '',
  remember: false,
})

const submit = () => {
  form.post('/login', {
    onFinish: () => {
      form.reset('password')
    },
  })
}
</script>

<template>
  <AuthLayout title="Log in to your account" description="Enter your email and password below to log in">
    <Head title="Log in" />

    <form @submit.prevent="submit" class="flex flex-col gap-6">
      <div class="grid gap-6">
        <div class="grid gap-2">
          <Label for="email">Email address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            v-model="form.email"
            required
            autofocus
            tabindex="1"
            autocomplete="email"
            placeholder="email@example.com"
          />
          <InputError :message="form.errors.email" />
        </div>

        <div class="grid gap-2">
          <div class="flex items-center">
            <Label for="password">Password</Label>
            <TextLink v-if="canResetPassword" href="/forgot-password" class="ml-auto text-sm" tabindex="5">
              Forgot password?
            </TextLink>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            v-model="form.password"
            required
            tabindex="2"
            autocomplete="current-password"
            placeholder="Password"
          />
          <InputError :message="form.errors.password" />
        </div>

        <div class="flex items-center space-x-3">
          <Checkbox id="remember" name="remember" v-model:checked="form.remember" tabindex="3" />
          <Label for="remember">Remember me</Label>
        </div>

        <Button type="submit" class="mt-4 w-full" tabindex="4" :disabled="form.processing">
          <LoaderCircle v-if="form.processing" class="h-4 w-4 animate-spin" />
          Log in
        </Button>
      </div>

      <div class="text-center text-sm text-muted-foreground">
        Don't have an account?
        <TextLink href="/register" tabindex="5">
          Sign up
        </TextLink>
      </div>
    </form>

    <div v-if="status" class="mb-4 text-center text-sm font-medium text-green-600">
      {{ status }}
    </div>
  </AuthLayout>
</template>
