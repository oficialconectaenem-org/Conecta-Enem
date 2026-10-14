import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  if (authStore.user?.active) {
    return
  }

  try {
    let token = null
    if (import.meta.client) {
      try {
        token = localStorage.getItem('conectar_enem_auth_token')
      } catch {
        // Ignora
      }
    }

    const headers = {
      ...(import.meta.server ? useRequestHeaders(['cookie']) : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }

    const response = await $fetch('/api/auth/me', {
      headers,
      credentials: 'include'
    })

    const user = response?.user

    if (!user || !user.active) {
      authStore.clearUser()
      return navigateTo('/login')
    }

    authStore.setUser(user)
  } catch (error) {
    authStore.clearUser()
    return navigateTo('/login')
  }
})
