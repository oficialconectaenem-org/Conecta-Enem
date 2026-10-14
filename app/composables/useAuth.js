import { useAuthStore } from '~/stores/auth'

const TOKEN_KEY = 'conectar_enem_auth_token'

function getStoredToken() {
  if (import.meta.client) {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }
  return null
}

function setStoredToken(token) {
  if (import.meta.client) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    } catch {
      // Ignora erro de storage privado
    }
  }
}

export function useAuth() {
  const authStore = useAuthStore()

  function getAuthHeaders() {
    const token = getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function registerStudent(payload) {
    const response = await $fetch('/api/auth/register/student', {
      method: 'POST',
      body: payload
    })

    if (response.token) {
      setStoredToken(response.token)
    }

    if (response.user) {
      authStore.setUser(response.user)
    }

    return response
  }

  async function registerTeacher(payload) {
    const response = await $fetch('/api/auth/register/teacher', {
      method: 'POST',
      body: payload
    })

    if (response.token) {
      setStoredToken(response.token)
    }

    if (response.user) {
      authStore.setUser(response.user)
    }

    return response
  }

  async function login(payload) {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: payload
    })

    if (response.token) {
      setStoredToken(response.token)
    }

    if (response.user) {
      authStore.setUser(response.user)
    }

    return response
  }

  async function loginAdmin(payload) {
    const response = await $fetch('/api/auth/admin-login', {
      method: 'POST',
      body: payload
    })

    if (response.token) {
      setStoredToken(response.token)
    }

    if (response.user) {
      authStore.setUser(response.user)
    }

    return response
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      }).catch(() => null)
    } finally {
      setStoredToken(null)
      authStore.clearUser()
      await navigateTo('/login', { replace: true })
    }
  }

  async function getMe() {
    const response = await $fetch('/api/auth/me', {
      headers: getAuthHeaders()
    })

    authStore.setUser(response.user)
    return response.user
  }

  return {
    registerStudent,
    registerTeacher,
    login,
    loginAdmin,
    logout,
    getMe,
    getStoredToken
  }
}