import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types'

export const useAppStore = defineStore('app', () => {
  const user = ref<User | null>(null)
  const sidebarOpen = ref(true)
  const processing = ref(false)
  const animationFlag = ref(true) // La flag mencionada en el requerimiento
  const lastVisitTimestamp = ref(localStorage.getItem('ania_last_visit'))
  
  const isFirstVisit = computed(() => {
    if (!lastVisitTimestamp.value) return true
    const lastVisitTime = parseInt(lastVisitTimestamp.value, 10)
    const thirtyMinutes = 30 * 60 * 1000
    return Date.now() - lastVisitTime > thirtyMinutes
  })

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
    const now = Date.now().toString()
    localStorage.setItem('ania_last_visit', now)
    lastVisitTimestamp.value = now
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
