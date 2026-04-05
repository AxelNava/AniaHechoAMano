<script setup lang="ts">
import InputError from '@/components/input-error.vue'
import TextLink from '@/components/text-link.vue'
import { Button, Input, Label } from '@/components/ui'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { LoaderCircle } from 'lucide-vue-next'
import { ref } from 'vue'

defineProps<{
  status?: string
}>()

const email = ref('')
const errors = ref<{ email?: string }>({})
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
  <AuthLayout title="Forgot password" description="Enter your email to receive a password reset link">
    <div v-if="status" class="mb-4 text-center text-sm font-medium text-green-600">
      {{ status }}
    </div>

    <div class="space-y-6">
      <form @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="email">Email address</Label>
          <Input
            id="email"
            type="email"
            v-model="email"
            required
            autofocus
            placeholder="email@example.com"
          />
          <InputError :message="errors.email" />
        </div>

        <div class="my-6 flex items-center justify-start">
          <Button class="w-full" :disabled="processing">
            <LoaderCircle v-if="processing" class="h-4 w-4 animate-spin" />
            Email password reset link
          </Button>
        </div>
      </form>

      <div class="space-x-1 text-center text-sm text-muted-foreground">
        <span>Or, return to</span>
        <TextLink href="/login">log in</TextLink>
      </div>
    </div>
  </AuthLayout>
</template>
