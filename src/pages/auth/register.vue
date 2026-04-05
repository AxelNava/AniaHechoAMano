<script setup lang="ts">
import InputError from '@/components/input-error.vue'
import TextLink from '@/components/text-link.vue'
import { Button, Input, Label } from '@/components/ui'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { LoaderCircle } from 'lucide-vue-next'
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const password = ref('')
const password_confirmation = ref('')
const errors = ref<{ name?: string; email?: string; password?: string; password_confirmation?: string }>({})
const processing = ref(false)

const submit = () => {
  processing.value = true
  errors.value = {}
  
  setTimeout(() => {
    processing.value = false
  }, 1000)
}
</script>

<template>
  <AuthLayout title="Create an account" description="Enter your details below to create your account">
    <form @submit.prevent="submit" class="flex flex-col gap-6">
      <div class="grid gap-6">
        <div class="grid gap-2">
          <Label for="name">Name</Label>
          <Input
            id="name"
            type="text"
            v-model="name"
            required
            autofocus
            tabindex="1"
            autocomplete="name"
            placeholder="Full name"
          />
          <InputError :message="errors.name" />
        </div>

        <div class="grid gap-2">
          <Label for="email">Email address</Label>
          <Input
            id="email"
            type="email"
            v-model="email"
            required
            tabindex="2"
            autocomplete="email"
            placeholder="email@example.com"
          />
          <InputError :message="errors.email" />
        </div>

        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            v-model="password"
            required
            tabindex="3"
            autocomplete="new-password"
            placeholder="Password"
          />
          <InputError :message="errors.password" />
        </div>

        <div class="grid gap-2">
          <Label for="password_confirmation">Confirm password</Label>
          <Input
            id="password_confirmation"
            type="password"
            v-model="password_confirmation"
            required
            tabindex="4"
            autocomplete="new-password"
            placeholder="Confirm password"
          />
          <InputError :message="errors.password_confirmation" />
        </div>

        <Button type="submit" class="mt-2 w-full" tabindex="5" :disabled="processing">
          <LoaderCircle v-if="processing" class="h-4 w-4 animate-spin" />
          Create account
        </Button>
      </div>

      <div class="text-center text-sm text-muted-foreground">
        Already have an account?
        <TextLink href="/login" tabindex="6">
          Log in
        </TextLink>
      </div>
    </form>
  </AuthLayout>
</template>
