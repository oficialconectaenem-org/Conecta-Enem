<script setup>
import { useAuth } from '~/composables/useAuth'

const { loginAdmin } = useAuth()

const form = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    await loginAdmin({
      email: form.email.trim().toLowerCase(),
      password: form.password
    })

    await navigateTo('/admin')
  }
  catch (err) {
    const statusCode =
      err?.statusCode ||
      err?.data?.statusCode

    if (statusCode === 401) {
      error.value = 'Email ou senha incorretos.'
      return
    }

    if (statusCode === 403) {
      error.value =
        err?.data?.statusMessage ||
        'Esta conta não possui acesso administrativo.'

      return
    }

    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível realizar o login.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <form
    class="space-y-5"
    @submit.prevent="handleSubmit"
  >
    <div>
      <div
        class="mb-4 inline-flex rounded-full bg-purple-100 border border-purple-200 text-purple-800 dark:bg-purple-950/70 dark:border-purple-800 dark:text-purple-300 px-3 py-1.5 text-xs font-bold"
      >
        Área Administrativa
      </div>

      <h1
        class="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
      >
        Acesso administrativo
      </h1>

      <p
        class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400"
      >
        Entre com sua conta para gerenciar o conteúdo do Conecta Enem.
      </p>
    </div>

    <!-- Email -->
    <div class="space-y-2">
      <label
        for="admin-email"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Email
      </label>

      <input
        id="admin-email"
        v-model="form.email"
        type="email"
        autocomplete="email"
        required
        placeholder="seuemail@exemplo.com"
        class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:focus:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
      >
    </div>

    <!-- Senha -->
    <div class="space-y-2">
      <label
        for="admin-password"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Senha
      </label>

      <div class="relative">
        <input
          id="admin-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          required
          placeholder="Digite sua senha"
          class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-20 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:focus:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
        >

        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition cursor-pointer"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? 'Ocultar' : 'Mostrar' }}
        </button>
      </div>
    </div>

    <!-- Erro -->
    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
    >
      {{ error }}
    </div>

    <!-- Entrar -->
    <button
      type="submit"
      :disabled="loading"
      class="w-full rounded-xl bg-purple-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-purple-900/40 transition hover:-translate-y-0.5 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
    >
      {{ loading ? 'Entrando...' : 'Entrar' }}
    </button>

    <NuxtLink
      to="/"
      class="block text-center text-sm text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
    >
      Voltar para o Conecta Enem
    </NuxtLink>
  </form>
</template>