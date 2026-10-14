<script setup>
import AuthPanel from '~/components/auth/AuthPanel.vue'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Criar Nova Senha — Conecta Enem',
  description: 'Cadastre sua nova senha de acesso ao Conecta Enem.'
})

const route = useRoute()
const token = computed(() => (route.query.token || '').toString())

const password = ref('')
const passwordConfirmation = ref('')
const showPassword = ref(false)
const showConfirmation = ref(false)

const loading = ref(false)
const error = ref('')
const successMessage = ref('')

async function handleSubmit() {
  error.value = ''
  successMessage.value = ''

  if (!token.value) {
    error.value = 'Token de recuperação não encontrado na URL. Verifique o link recebido no e-mail.'
    return
  }

  if (password.value.length < 8) {
    error.value = 'A nova senha deve possuir pelo menos 8 caracteres.'
    return
  }

  if (password.value !== passwordConfirmation.value) {
    error.value = 'As senhas não coincidem. Digite a mesma senha nos dois campos.'
    return
  }

  loading.value = true

  try {
    const res = await $fetch('/api/auth/redefinir-senha', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value
      }
    })

    if (res?.success) {
      successMessage.value = res.message || 'Sua senha foi redefinida com sucesso! Você já pode entrar.'
      setTimeout(() => {
        navigateTo('/login')
      }, 3000)
    }
  } catch (err) {
    console.error('Erro ao redefinir senha:', err)
    error.value = err.data?.statusMessage || err.message || 'Link inválido ou expirado. Solicite uma nova recuperação.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPanel
    title="Crie sua nova senha."
    description="Escolha uma senha forte com pelo menos 8 caracteres para proteger seus estudos e dados."
    footer-text="Preparação gratuita para o ENEM."
  >
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Redefinir Senha
        </h1>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
          Cadastre sua nova credencial de acesso para continuar seus estudos no Conecta Enem.
        </p>
      </div>

      <!-- Alerta de Sucesso -->
      <div
        v-if="successMessage"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40 p-6 text-center space-y-4"
      >
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400">
          <span class="material-symbols-rounded text-3xl">check_circle</span>
        </div>
        <h2 class="text-lg font-black text-slate-900 dark:text-white">Senha Alterada com Sucesso!</h2>
        <p class="text-xs text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
          {{ successMessage }} Redirecionando para a tela de login em instantes...
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-500 transition shadow-lg shadow-purple-900/20 dark:shadow-purple-900/40"
          >
            <span>Ir para o Login</span>
            <span class="material-symbols-rounded text-base">arrow_forward</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Token Ausente -->
      <div
        v-else-if="!token"
        class="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/40 p-5 space-y-3"
      >
        <div class="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
          <span class="material-symbols-rounded text-xl">warning</span>
          <span>Link Incompleto</span>
        </div>
        <p class="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
          O token de segurança não foi informado na URL. Por favor, clique novamente no link recebido em seu e-mail ou solicite um novo envio.
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/esqueci-senha"
            class="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition"
          >
            <span class="material-symbols-rounded text-sm">refresh</span>
            <span>Solicitar novo link de recuperação</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Formulário -->
      <form
        v-else
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <!-- Nova Senha -->
        <div class="space-y-2">
          <label for="new-password" class="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Nova Senha
          </label>
          <div class="relative">
            <input
              id="new-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              required
              placeholder="Mínimo de 8 caracteres"
              class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-20 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 cursor-pointer transition"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </div>

        <!-- Confirmação de Senha -->
        <div class="space-y-2">
          <label for="new-password-confirmation" class="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Confirmar Nova Senha
          </label>
          <div class="relative">
            <input
              id="new-password-confirmation"
              v-model="passwordConfirmation"
              :type="showConfirmation ? 'text' : 'password'"
              autocomplete="new-password"
              required
              placeholder="Digite a senha novamente"
              class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-20 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 cursor-pointer transition"
              @click="showConfirmation = !showConfirmation"
            >
              {{ showConfirmation ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
        </div>

        <!-- Erro -->
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
          <span>{{ loading ? 'Salvando nova senha...' : 'Confirmar e Salvar Nova Senha' }}</span>
        </button>

        <div class="pt-2 text-center">
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar para o Login</span>
          </NuxtLink>
        </div>
      </form>
    </div>
  </AuthPanel>
</template>
