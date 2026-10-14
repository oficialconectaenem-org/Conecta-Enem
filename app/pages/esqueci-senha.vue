<script setup>
import AuthPanel from '~/components/auth/AuthPanel.vue'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Recuperar Senha — Conecta Enem',
  description: 'Recupere o acesso à sua conta de Aluno ou Professor no Conecta Enem.'
})

const route = useRoute()
const role = ref(route.query.role === 'TEACHER' ? 'TEACHER' : 'STUDENT')
const email = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

async function handleSubmit() {
  error.value = ''
  successMessage.value = ''

  const normalizedEmail = email.value.trim().toLowerCase()
  if (!normalizedEmail) {
    error.value = 'Por favor, informe seu e-mail.'
    return
  }

  loading.value = true

  try {
    const res = await $fetch('/api/auth/esqueci-senha', {
      method: 'POST',
      body: {
        email: normalizedEmail,
        role: role.value
      }
    })

    if (res?.success) {
      successMessage.value = res.message || 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e a pasta de spam.'
    }
  } catch (err) {
    console.error('Erro na recuperação de senha:', err)
    error.value = err.data?.statusMessage || err.message || 'Não foi possível solicitar a recuperação. Verifique os dados e tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPanel
    title="Recupere seu acesso com segurança."
    description="Informe seu e-mail cadastrado e enviaremos imediatamente um link exclusivo para você criar uma nova senha."
    footer-text="Preparação gratuita para o ENEM."
  >
    <div class="space-y-6">
      <!-- Cabeçalho -->
      <div>
        <!-- Seletor Aluno / Professor -->
        <div class="mb-4 inline-flex rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 transition-colors">
          <button
            type="button"
            @click="role = 'STUDENT'"
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer"
            :class="role === 'STUDENT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'"
          >
            Aluno
          </button>
          <button
            type="button"
            @click="role = 'TEACHER'"
            class="px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer"
            :class="role === 'TEACHER' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'"
          >
            Professor
          </button>
        </div>

        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Esqueceu sua senha?
        </h1>

        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
          Enviaremos um link de recuperação via e-mail para a sua conta de
          <strong class="text-purple-600 dark:text-purple-300 font-semibold">{{ role === 'TEACHER' ? 'Professor' : 'Aluno' }}</strong>.
        </p>
      </div>

      <!-- Alerta de Sucesso -->
      <div
        v-if="successMessage"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200 p-5 space-y-3"
      >
        <div class="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <span class="material-symbols-rounded text-xl">check_circle</span>
          <span>E-mail Enviado com Sucesso!</span>
        </div>
        <p class="text-xs leading-relaxed text-emerald-700 dark:text-emerald-200/90">
          {{ successMessage }}
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar para o Login</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Formulário de Envio -->
      <form
        v-else
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-2">
          <label
            for="forgot-email"
            class="text-sm font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between"
          >
            <span>E-mail cadastrado</span>
            <span class="text-xs text-slate-400 dark:text-zinc-500 font-normal">Ex: seuemail@exemplo.com</span>
          </label>

          <input
            id="forgot-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="Digite o e-mail da sua conta"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>

        <!-- Alerta de Erro -->
        <div
          v-if="error"
          class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 flex items-center gap-2"
        >
          <span class="material-symbols-rounded text-base shrink-0">error</span>
          <span>{{ error }}</span>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-xl bg-purple-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-purple-900/20 dark:shadow-purple-900/40 transition hover:-translate-y-0.5 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="material-symbols-rounded animate-spin text-lg">progress_activity</span>
          <span>{{ loading ? 'Enviando e-mail...' : 'Enviar Link de Recuperação' }}</span>
        </button>

        <!-- Voltar ao login -->
        <div class="pt-2 text-center">
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Lembrou da senha? Entrar agora</span>
          </NuxtLink>
        </div>
      </form>
    </div>
  </AuthPanel>
</template>
