import { defineStore } from 'pinia'

const STORAGE_USER_KEY = 'conectar_enem_user'
const STORAGE_TOKEN_KEY = 'conectar_enem_auth_token'

function getInitialUser() {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(STORAGE_USER_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      return null
    }
  }
  return null
}

export const useAuthStore = defineStore(
  'auth',
  {
    state: () => ({
      user: getInitialUser(),
      loading: false,
      initialized: false
    }),

    getters: {
      isLoggedIn(state) {
        return !!state.user
      },

      isTeacher(state) {
        return state.user?.role === 'TEACHER'
      },

      isStudent(state) {
        return state.user?.role === 'STUDENT'
      },

      isAdmin(state) {
        return state.user?.role === 'ADMIN'
      }
    },

    actions: {
      setUser(user) {
        this.user = user
        if (import.meta.client) {
          try {
            if (user) {
              localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
            } else {
              localStorage.removeItem(STORAGE_USER_KEY)
            }
          } catch {
            // Ignora erros de localStorage restrito
          }
        }
      },

      clearUser() {
        this.user = null
        if (import.meta.client) {
          try {
            localStorage.removeItem(STORAGE_USER_KEY)
            localStorage.removeItem(STORAGE_TOKEN_KEY)
          } catch {
            // Ignora erros de localStorage
          }
        }
      }
    }
  }
)