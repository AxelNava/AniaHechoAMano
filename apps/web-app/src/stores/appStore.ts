import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types'

export const useAppStore = defineStore('app', () => {
  const user = ref<User | null>(null)
  const sidebarOpen = ref(true)
  const processing = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  function setUser(userData: User | null) {
    user.value = userData
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setSidebarOpen(value: boolean) {
    sidebarOpen.value = value
  }

  function setProcessing(value: boolean) {
    processing.value = value
  }

  return {
    user,
    sidebarOpen,
    processing,
    isLoggedIn,
    setUser,
    toggleSidebar,
    setSidebarOpen,
    setProcessing
  }
})
