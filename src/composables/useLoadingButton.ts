import { ref, computed } from 'vue'

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingButtonOptions {
  errorDuration?: number
  successDuration?: number
}

export function useLoadingButton(options: LoadingButtonOptions = {}) {
  const { errorDuration = 5000, successDuration = 2000 } = options

  const status = ref<LoadingStatus>('idle')
  const message = ref('')
  let errorTimeout: ReturnType<typeof setTimeout> | null = null
  let successTimeout: ReturnType<typeof setTimeout> | null = null

  const isLoading = computed(() => status.value === 'loading')

  const clearTimers = () => {
    if (errorTimeout) {
      clearTimeout(errorTimeout)
      errorTimeout = null
    }
    if (successTimeout) {
      clearTimeout(successTimeout)
      successTimeout = null
    }
  }

  const reset = () => {
    clearTimers()
    status.value = 'idle'
    message.value = ''
  }

  const setError = (msg: string) => {
    clearTimers()
    status.value = 'error'
    message.value = msg

    errorTimeout = setTimeout(() => {
      status.value = 'idle'
      message.value = ''
    }, errorDuration)
  }

  const setSuccess = (msg: string) => {
    clearTimers()
    status.value = 'success'
    message.value = msg

    successTimeout = setTimeout(() => {
      status.value = 'idle'
      message.value = ''
    }, successDuration)
  }

  const execute = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    clearTimers()
    status.value = 'loading'
    message.value = 'Procesando...'

    try {
      const result = await fn()
      setSuccess('Completado')
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error'
      setError(errorMessage)
    } finally {
      status.value = 'idle'
    }
  }

  return {
    status,
    message,
    isLoading,
    execute,
    reset,
    setError,
    setSuccess,
  }
}