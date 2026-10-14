<script setup>
import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'default',
  middleware: [
    () => {
      const authStore = useAuthStore()
      if (authStore.user?.active) {
        if (authStore.user.role === 'TEACHER') {
          return navigateTo('/professor', { replace: true })
        }
        if (authStore.user.role === 'ADMIN') {
          return navigateTo('/admin', { replace: true })
        }
        return navigateTo('/aluno', { replace: true })
      }
    }
  ]
})

const authStore = useAuthStore()
const { getMe } = useAuth()
const isRedirecting = ref(false)

function resolveTargetRoute(user) {
  if (user?.role === 'TEACHER') return '/professor'
  if (user?.role === 'ADMIN') return '/admin'
  return '/aluno'
}

// Execução imediata no client: se já há usuário no store/localStorage, redireciona sem exibir a landing page
if (import.meta.client) {
  const currentUser = authStore.user
  if (currentUser?.active) {
    isRedirecting.value = true
    navigateTo(resolveTargetRoute(currentUser), { replace: true })
  }
}

onMounted(async () => {
  if (authStore.user?.active) {
    isRedirecting.value = true
    navigateTo(resolveTargetRoute(authStore.user), { replace: true })
    return
  }

  try {
    const user = await getMe()
    if (user && user.active) {
      isRedirecting.value = true
      navigateTo(resolveTargetRoute(user), { replace: true })
    }
  } catch {
    // Não autenticado: permanece na landing page
    isRedirecting.value = false
  }
})
</script>

<template>
  <div v-if="isRedirecting || authStore.user?.active" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] text-white">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mb-4"></div>
    <p class="text-sm font-medium text-zinc-400">Entrando no Conecta Enem...</p>
  </div>

  <div v-else>
    <LandingHeader />
    <LandingHero />
    <LandingFeatures />
    <LandingHowItWorks />
    <LandingEssay />
    <LandingCta />
    <LandingFooter />
  </div>
</template>