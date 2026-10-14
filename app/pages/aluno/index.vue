<script setup>
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'aluno',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Início — Área do Aluno | Conecta Enem'
})

const authStore = useAuthStore()
const { getMe } = useAuth()

const userName = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return 'Aluno'
  return name.split(/\s+/)[0]
})

const generalActions = [
  {
    title: 'Laboratório de Redação',
    description: 'Escreva novas redações na folha de 30 linhas e consulte suas notas.',
    icon: 'edit_note',
    to: '/aluno/redacao'
  },
  {
    title: 'Banco de Questões',
    description: 'Pratique com questões comentadas do ENEM por disciplina.',
    icon: 'quiz',
    to: '/aluno/questoes'
  },
  {
    title: 'Aulas & Módulos',
    description: 'Assista a videoaulas preparatórias e cronogramas.',
    icon: 'play_lesson',
    to: '/aluno/aulas'
  }
]

onMounted(() => {
  if (!authStore.user) {
    getMe().catch(() => null)
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-10 lg:py-10">
    <!-- HERO BANNER COM GRADIENTE & VIDRO -->
    <section class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-800 via-purple-700 to-indigo-800 p-6 text-white shadow-2xl shadow-purple-950/20 sm:p-10">
      <div class="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/15 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-fuchsia-950/40 blur-2xl"></div>
      <div class="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(120deg,black,transparent_65%)] dark:hidden"></div>

      <div class="relative flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="max-w-2xl space-y-4 text-center md:text-left">
          <div class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-purple-100 backdrop-blur-md">
            <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Plataforma 100% Gratuita para o ENEM
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-.045em] leading-[1.05]">
            Olá, <span class="text-purple-200">{{ userName }}</span>! Pronto para estudar?
          </h1>
          <p class="max-w-xl text-sm font-medium text-purple-100/90 leading-relaxed">
            Pratique com redações ilimitadas, resolva questões oficiais comentadas e assista às aulas para garantir sua vaga na faculdade.
          </p>
          <div class="flex flex-col justify-center gap-3 pt-2 sm:flex-row md:justify-start">
            <NuxtLink to="/aluno/redacao/nova" class="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-purple-800 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-purple-50">
              <span class="material-symbols-rounded text-lg">edit_square</span>
              Come&ccedil;ar reda&ccedil;&atilde;o
            </NuxtLink>
            <NuxtLink to="/aluno/questoes" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15">
              <span class="material-symbols-rounded text-lg">quiz</span>
              Praticar quest&otilde;es
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- TRILHAS DE ESTUDO & FERRAMENTAS -->
    <section class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[.16em] text-[var(--student-primary-text)]">Plano de estudos</p>
          <h2 class="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[var(--student-text)]">
            Ferramentas de Aprendizado
          </h2>
          <p class="text-xs text-[var(--student-text-secondary)] mt-0.5">
            Acesse rapidamente as principais áreas de treino e estudo
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="card in generalActions"
          :key="card.title"
          :to="card.to"
          class="student-card student-card-interactive group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl p-5 transition-all duration-200 hover:border-[var(--student-primary-solid)] cursor-pointer"
        >
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] transition-all duration-200 group-hover:scale-105 group-hover:bg-[var(--student-primary-solid)] group-hover:text-white">
                <span class="material-symbols-rounded text-2xl">
                  {{ card.icon }}
                </span>
              </div>
              <span
                v-if="card.badge"
                class="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-black text-purple-600 dark:text-purple-300 border border-purple-500/20"
              >
                {{ card.badge }}
              </span>
              <span v-else class="material-symbols-rounded text-[var(--student-text-muted)] text-xl transition-transform group-hover:translate-x-1 group-hover:text-[var(--student-primary-text)]">
                arrow_forward
              </span>
            </div>

            <div class="space-y-1">
              <h3 class="text-base font-black text-[var(--student-text)] group-hover:text-[var(--student-primary-text)] transition-colors">
                {{ card.title }}
              </h3>
              <p class="text-xs text-[var(--student-text-secondary)] leading-relaxed">
                {{ card.description }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex items-center gap-1 text-xs font-black text-[var(--student-primary-text)]">
            <span>Acessar agora</span>
            <span class="material-symbols-rounded text-sm">chevron_right</span>
          </div>
        </NuxtLink>
      </div>
    </section>


  </div>
</template>
