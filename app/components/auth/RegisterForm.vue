<script setup>
import { useAuth } from '~/composables/useAuth'
const props = defineProps({
  accountType: {
    type: String,
    required: true,
    validator: value => ['STUDENT', 'TEACHER'].includes(value)
  }
})

const route = useRoute()

const {
  registerStudent,
  registerTeacher
} = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirmation: ''
})

const showPassword = ref(false)
const showPasswordConfirmation = ref(false)

const loading = ref(false)
const error = ref('')

const isTeacher = computed(() => {
  return props.accountType === 'TEACHER'
})

const title = computed(() => {
  return isTeacher.value
    ? 'Cadastro de professor'
    : 'Crie sua conta'
})

const description = computed(() => {
  return isTeacher.value
    ? 'Crie sua conta como professor de redação no Conecta Enem.'
    : 'Comece gratuitamente sua preparação para o ENEM.'
})

const buttonText = computed(() => {
  if (loading.value) {
    return 'Criando conta...'
  }

  return isTeacher.value
    ? 'Criar conta de professor'
    : 'Criar minha conta'
})

async function handleSubmit() {
  error.value = ''

  if (form.password !== form.passwordConfirmation) {
    error.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true

  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password
    }

    const redirectUrl = route.query.redirect

    if (isTeacher.value) {
      await registerTeacher(payload)

      await navigateTo(redirectUrl || '/professor')
      return
    }

    await registerStudent(payload)

    await navigateTo(redirectUrl || '/aluno')
  }
  catch (err) {
    error.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Não foi possível criar sua conta.'
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
        v-if="isTeacher"
        class="mb-4 inline-flex rounded-full bg-purple-100 border border-purple-200 text-purple-800 dark:bg-purple-950/70 dark:border-purple-800 dark:text-purple-300 px-3 py-1.5 text-xs font-bold"
      >
        Professor de Redação
      </div>

      <h1
        class="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
      >
        {{ title }}
      </h1>

      <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
        {{ description }}
      </p>
    </div>

    <!-- Nome -->
    <div class="space-y-2">
      <label
        for="register-name"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Nome completo
      </label>

      <input
        id="register-name"
        v-model="form.name"
        type="text"
        autocomplete="name"
        required
        placeholder="Seu nome completo"
        class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
      >
    </div>

    <!-- Email -->
    <div class="space-y-2">
      <label
        for="register-email"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Email
      </label>

      <input
        id="register-email"
        v-model="form.email"
        type="email"
        autocomplete="email"
        required
        placeholder="seuemail@exemplo.com"
        class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
      >
    </div>

    <!-- Senha -->
    <div class="space-y-2">
      <label
        for="register-password"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Senha
      </label>

      <div class="relative">
        <input
          id="register-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          minlength="8"
          placeholder="Mínimo de 8 caracteres"
          class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-20 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
        >

        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 cursor-pointer transition"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? 'Ocultar' : 'Mostrar' }}
        </button>
      </div>
    </div>

    <!-- Confirmar senha -->
    <div class="space-y-2">
      <label
        for="register-password-confirmation"
        class="text-sm font-semibold text-slate-700 dark:text-zinc-300"
      >
        Confirmar senha
      </label>

      <div class="relative">
        <input
          id="register-password-confirmation"
          v-model="form.passwordConfirmation"
          :type="showPasswordConfirmation ? 'text' : 'password'"
          autocomplete="new-password"
          required
          minlength="8"
          placeholder="Digite novamente sua senha"
          class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 pr-20 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-white dark:placeholder:text-zinc-500"
        >

        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 cursor-pointer transition"
          @click="showPasswordConfirmation = !showPasswordConfirmation"
        >
          {{ showPasswordConfirmation ? 'Ocultar' : 'Mostrar' }}
        </button>
      </div>
    </div>

    <div
      v-if="isTeacher"
      class="rounded-xl border border-purple-200 bg-purple-50/80 dark:border-purple-900/60 dark:bg-purple-950/40 px-4 py-3"
    >
      <p class="text-sm leading-6 text-purple-800 dark:text-purple-300">
        Cadastro destinado a professores de redação do Conecta Enem.
      </p>
    </div>

    <!-- Erro -->
    <div
      v-if="error"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
    >
      {{ error }}
    </div>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="loading"
      class="w-full rounded-xl bg-purple-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-purple-900/20 dark:shadow-purple-900/40 transition hover:-translate-y-0.5 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {{ buttonText }}
    </button>

    <p class="text-center text-sm text-slate-600 dark:text-zinc-400">
      Já possui uma conta?

      <NuxtLink
        to="/login"
        class="font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 ml-1 transition"
      >
        Entrar
      </NuxtLink>
    </p>
  </form>
</template>