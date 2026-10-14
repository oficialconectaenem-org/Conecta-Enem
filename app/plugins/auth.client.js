import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore()
  const { getMe } = useAuth()
  const router = useRouter()

  // Salva última rota acessada pelo usuário para retornar na reabertura do app
  router.afterEach((to) => {
    if (import.meta.client && authStore.user?.active) {
      if (to.path.startsWith('/aluno') || to.path.startsWith('/professor') || to.path.startsWith('/admin')) {
        try {
          localStorage.setItem('conectar_enem_last_path', to.fullPath)
        } catch {
          // Ignora erro de localStorage
        }
      }
    }
  })

  // Ao iniciar o app: se estiver na raiz "/" e já houver usuário salvo no storage, redireciona de imediato
  const currentPath = window.location.pathname
  if (currentPath === '/' && authStore.user?.active) {
    let target = '/aluno'
    if (authStore.user.role === 'TEACHER') target = '/professor'
    else if (authStore.user.role === 'ADMIN') target = '/admin'
    else {
      try {
        const lastPath = localStorage.getItem('conectar_enem_last_path')
        if (lastPath && lastPath.startsWith('/aluno')) {
          target = lastPath
        }
      } catch {
        target = '/aluno'
      }
    }

    navigateTo(target, { replace: true })
  }

  // Validação silenciosa em segundo plano para manter os dados atualizados ou limpar se expirou
  if (authStore.user?.active) {
    getMe().catch((err) => {
      // Se a sessão expirou no servidor (401/403), remove o estado local
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        authStore.clearUser()
        navigateTo('/login', { replace: true })
      }
    })
  }
})
