<script setup>
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const token = computed(() => route.params.token)

const authStore = useAuthStore()
const { getMe } = useAuth()

const loading = ref(true)
const joining = ref(false)
const invite = ref(null)
const error = ref('')
const joinedSuccess = ref(false)
const alreadyMember = ref(false)

useSeoMeta({
  title: () => invite.value?.name ? `Convite: ${invite.value.name} — Conecta Enem` : 'Convite para Turma — Conecta Enem'
})

async function fetchInvite() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch(`/api/invite/${token.value}`)
    if (res?.invite) {
      invite.value = res.invite
    }
  } catch (err) {
    console.error('Erro ao buscar convite:', err)
    error.value = err.data?.statusMessage || 'Convite não encontrado ou link expirado.'
  } finally {
    loading.value = false
  }
}

async function handleJoin() {
  if (!authStore.isLoggedIn) {
    await navigateTo(`/login?redirect=/convite/${token.value}`)
    return
  }

  joining.value = true
  error.value = ''

  try {
    const res = await $fetch(`/api/invite/${token.value}/join`, {
      method: 'POST'
    })

    if (res?.alreadyMember) {
      alreadyMember.value = true
    } else {
      joinedSuccess.value = true
    }
  } catch (err) {
    console.error('Erro ao ingressar:', err)
    error.value = err.data?.statusMessage || 'Erro ao ingressar na turma.'
  } finally {
    joining.value = false
  }
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

onMounted(async () => {
  if (!authStore.user) {
    await getMe().catch(() => null)
  }
  await fetchInvite()
})
</script>

<template>
  <main class="w-full max-w-lg mx-auto p-4 sm:p-6 font-sans">
    <!-- Card Central de Convite -->
    <div class="w-full">
      <!-- Loading State -->
      <div v-if="loading" class="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-xl text-center space-y-4 animate-pulse">
        <div class="h-16 w-16 bg-slate-100 dark:bg-zinc-800 rounded-3xl mx-auto"></div>
        <div class="h-6 bg-slate-100 dark:bg-zinc-800 rounded w-3/4 mx-auto"></div>
        <div class="h-4 bg-slate-100 dark:bg-zinc-800 rounded w-1/2 mx-auto"></div>
        <div class="h-12 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-full mt-6"></div>
      </div>

      <!-- Erro ou Link Expirado/Inválido -->
      <div v-else-if="error && !invite" class="rounded-3xl border border-red-100 dark:border-red-900/50 bg-white dark:bg-zinc-900 p-8 shadow-xl text-center space-y-4">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
          <span class="material-symbols-rounded text-3xl">link_off</span>
        </div>
        <h1 class="text-xl font-black text-slate-900 dark:text-zinc-100">Convite Indisponível</h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
          {{ error }}
        </p>
        <div class="pt-4">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
          >
            <span class="material-symbols-rounded text-base">home</span>
            <span>Ir para o Início</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Sucesso ao Ingressar -->
      <div v-else-if="joinedSuccess || alreadyMember" class="rounded-3xl border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-zinc-900 p-8 shadow-xl text-center space-y-4">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <span class="material-symbols-rounded text-3xl">verified</span>
        </div>
        <h1 class="text-xl font-black text-slate-900 dark:text-zinc-100">
          {{ alreadyMember ? 'Você já faz parte desta turma!' : 'Matrícula Realizada com Sucesso!' }}
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          Você agora está conectado à turma <strong class="text-slate-800 dark:text-zinc-200">{{ invite?.name }}</strong> do professor <strong class="text-slate-800 dark:text-zinc-200">{{ invite?.teacherName }}</strong>.
        </p>
        <div class="pt-4">
          <NuxtLink
            to="/aluno"
            class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3.5 text-xs font-black text-white hover:bg-purple-700 transition shadow-lg shadow-purple-600/25"
          >
            <span class="material-symbols-rounded text-base">school</span>
            <span>Acessar Área do Aluno</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Detalhes do Convite e Ação de Entrada -->
      <div v-else-if="invite" class="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl">
        <!-- Ícone e Tag -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold">
            <span class="material-symbols-rounded text-2xl">groups</span>
          </div>
          <span class="rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-3 py-1 text-xs font-black text-purple-700 dark:text-purple-300">
            Convite Oficial
          </span>
        </div>

        <!-- Título e Professor -->
        <div>
          <span class="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Você foi convidado para:</span>
          <h1 class="mt-1 text-2xl font-black text-slate-900 dark:text-zinc-100 leading-tight">
            {{ invite.name }}
          </h1>
          <p class="mt-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
            <span class="material-symbols-rounded text-purple-600 dark:text-purple-400 text-base">person</span>
            Professor: <strong class="text-slate-800 dark:text-zinc-200">{{ invite.teacherName }}</strong>
          </p>
        </div>

        <p v-if="invite.description" class="mt-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 p-3.5 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed border border-slate-100 dark:border-zinc-700/60">
          {{ invite.description }}
        </p>

        <!-- Informações de Limite / Status -->
        <div class="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 p-3">
            <span class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Alunos na turma</span>
            <p class="mt-0.5 font-black text-slate-800 dark:text-zinc-200">
              {{ invite.currentStudents }}
              <span v-if="invite.maxStudents" class="text-slate-400 dark:text-zinc-500 font-normal">/ {{ invite.maxStudents }}</span>
            </p>
          </div>

          <div class="rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 p-3">
            <span class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Validade</span>
            <p class="mt-0.5 font-bold text-slate-800 dark:text-zinc-200 text-[11px] truncate">
              {{ invite.expiresAt ? formatDate(invite.expiresAt) : 'Sem data limite' }}
            </p>
          </div>
        </div>

        <!-- Alertas de Limite ou Expiração -->
        <div v-if="!invite.canJoin" class="mt-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3.5 text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
          <span class="material-symbols-rounded text-base shrink-0">warning</span>
          <span v-if="invite.isExpired">Este convite expirou e não aceita mais novos alunos.</span>
          <span v-else-if="invite.isFull">Esta turma atingiu a lotação máxima permitida.</span>
          <span v-else>Esta turma não está aceitando novos alunos no momento.</span>
        </div>

        <div v-if="error" class="mt-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3.5 text-xs text-red-700 dark:text-red-300 font-semibold">
          {{ error }}
        </div>

        <!-- Botões de Ação -->
        <div class="mt-6 space-y-2.5">
          <button
            v-if="invite.canJoin"
            type="button"
            :disabled="joining"
            @click="handleJoin"
            class="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3.5 px-4 text-sm font-black text-white hover:bg-purple-700 shadow-lg shadow-purple-600/25 transition disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            <span v-if="joining" class="material-symbols-rounded animate-spin text-base">progress_activity</span>
            <span v-else class="material-symbols-rounded text-base">how_to_reg</span>
            <span>{{ joining ? 'Entrando na Turma...' : 'Ingressar na Turma' }}</span>
          </button>

          <NuxtLink
            v-if="!authStore.isLoggedIn"
            :to="`/cadastro?redirect=/convite/${token}`"
            class="w-full block text-center rounded-2xl border border-slate-200 dark:border-zinc-700 py-3 px-4 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            Não tem uma conta? Cadastre-se grátis
          </NuxtLink>
        </div>
      </div>
    </div>
  </main>
</template>
