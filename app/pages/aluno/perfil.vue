<script setup>
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'aluno',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Meu Perfil — Conecta Enem'
})

const authStore = useAuthStore()
const { logout } = useAuth()
const loggingOut = ref(false)

const user = computed(() => authStore.user || { name: 'Aluno', email: '', role: 'STUDENT' })

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
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-8 font-sans">
    <div>
      <h1 class="text-2xl font-black text-[var(--student-text)] sm:text-3xl">
        Meu Perfil
      </h1>
      <p class="mt-1 text-sm text-[var(--student-text-secondary)]">
        Gerencie sua conta e sessão de acesso ao Conecta Enem.
      </p>
    </div>

    <!-- CARD DE INFORMAÇÕES PESSOAIS -->
    <div class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-surface)] p-6 sm:p-8 space-y-6 shadow-xs">
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-xl font-black text-white shadow-md shadow-purple-900/20">
          {{ user.name ? user.name.slice(0, 2).toUpperCase() : 'AL' }}
        </div>
        <div>
          <h2 class="text-lg font-bold text-[var(--student-text)]">{{ user.name }}</h2>
          <p class="text-xs text-[var(--student-text-secondary)]">{{ user.email }}</p>
          <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Estudante
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--student-border)]">
        <div class="p-3.5 rounded-xl bg-[var(--student-surface-secondary)]/50 border border-[var(--student-border)]">
          <span class="text-xs text-[var(--student-text-secondary)] block">Nome Completo</span>
          <span class="text-sm font-bold text-[var(--student-text)] mt-0.5 block">{{ user.name }}</span>
        </div>
        <div class="p-3.5 rounded-xl bg-[var(--student-surface-secondary)]/50 border border-[var(--student-border)]">
          <span class="text-xs text-[var(--student-text-secondary)] block">E-mail Cadastrado</span>
          <span class="text-sm font-bold text-[var(--student-text)] mt-0.5 block truncate">{{ user.email }}</span>
        </div>
      </div>
    </div>

    <!-- CARD DE SESSÃO & SEGURANÇA -->
    <div class="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span class="material-symbols-rounded">logout</span>
            <span>Encerrar Sessão</span>
          </h3>
          <p class="text-xs text-[var(--student-text-secondary)] mt-1">
            Desconecte sua conta deste navegador e termine a sessão com segurança.
          </p>
        </div>

        <button
          type="button"
          @click="handleLogout"
          :disabled="loggingOut"
          class="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-red-900/20 hover:bg-red-500 transition cursor-pointer disabled:opacity-50 shrink-0 active:scale-98"
        >
          <span class="material-symbols-rounded text-base">logout</span>
          <span>{{ loggingOut ? 'Saindo...' : 'Sair da Conta' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
