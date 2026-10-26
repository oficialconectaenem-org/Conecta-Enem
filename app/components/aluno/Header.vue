<script setup>
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

const authStore = useAuthStore()
const { getMe, logout } = useAuth()
const loggingOut = ref(false)

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await logout()
  } catch (err) {
    console.error('Erro ao sair:', err)
  } finally {
    loggingOut.value = false
  }
}

const userName = computed(() => {
  return authStore.user?.name || 'Aluno'
})

const userInitials = computed(() => {
  const name = userName.value.trim()
  if (!name || name === 'Aluno') return 'A'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
})

onMounted(() => {
  if (!authStore.user) {
    getMe().catch(() => null)
  }
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-[72px] w-full items-center justify-between border-b border-[var(--student-border)] bg-[var(--student-surface)]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8"
  >
    <!-- LOGO (EXIBIDO APENAS EM MOBILE QUANDO A SIDEBAR ESTÁ OCULTA) -->
    <div class="flex items-center gap-3 lg:hidden">
      <NuxtLink
        to="/aluno"
        class="flex items-center gap-3"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-[var(--student-surface-secondary)] border border-[var(--student-border)] shadow-xs"
        >
          <img
            src="/images/logo conta.png"
            alt="Logo Conecta Enem"
            class="h-full w-full object-contain"
          />
        </div>

        <div>
          <h1 class="text-base font-black tracking-tight text-[var(--student-text)] leading-tight">
            Conecta Enem
          </h1>
          <p class="text-xs font-medium text-[var(--student-text-muted)]">
            Área do aluno
          </p>
        </div>
      </NuxtLink>
    </div>

    <!-- ACTIONS (DIREITA) -->
    <div class="ml-auto flex items-center gap-2 sm:gap-3">
      <!-- ALTERNAR TEMA (CLARO/ESCURO) -->
      <CommonThemeToggle />

      <!-- AVATAR DO USUÁRIO -->
      <NuxtLink
        to="/aluno/perfil"
        aria-label="Abrir perfil"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-xs font-black text-white shadow-md shadow-purple-900/20 transition hover:scale-105"
      >
        {{ userInitials }}
      </NuxtLink>


    </div>
  </header>
</template>
