import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types'

export const useAppStore = defineStore('app', () => {
  const user = ref<User | null>(null)
  const sidebarOpen = ref(true)
  const processing = ref(false)
  const animationFlag = ref(true) // La flag mencionada en el requerimiento
  const isFirstVisit = ref(localStorage.getItem('ania_visited') === null)

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

  function setVisited() {
    localStorage.setItem('ania_visited', 'true')
    isFirstVisit.value = false
  }

  return {
    user,
    sidebarOpen,
    processing,
    animationFlag,
    isFirstVisit,
    isLoggedIn,
    setUser,
    toggleSidebar,
    setSidebarOpen,
    setProcessing,
    setVisited
  }
})
