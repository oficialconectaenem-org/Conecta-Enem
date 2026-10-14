<script setup>
import { useAuthStore } from '~/stores/auth'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Redação — Área do Aluno | Conecta Enem'
})

const authStore = useAuthStore()
const { getMe } = useAuth()

const userName = computed(() => {
  const name = authStore.user?.name?.trim()
  if (!name) return 'Aluno'
  return name.split(/\s+/)[0]
})

const redacaoActions = [
  {
    title: 'Nova Redação & Correção com IA',
    description: 'Escreva na folha oficial de 30 linhas do ENEM com correção instantânea por IA e envio ao professor.',
    icon: 'edit_square',
    to: '/aluno/redacao/nova'
  },
  {
    title: 'Minhas redações',
    description: 'Veja as suas redações antigas.',
    icon: 'description',
    to: '/aluno/redacao/minhas'
  },
  {
    title: 'Argumentos',
    description: 'Veja argumentos fortes para suas redações.',
    icon: 'chat_bubble',
    to: '/aluno/redacao/argumentos'
  },
  {
    title: 'Repertórios',
    description: 'Veja repertórios socioculturais para enriquecer seus textos.',
    icon: 'auto_stories',
    to: '/aluno/redacao/repertorios'
  }
]

onMounted(() => {
  if (!authStore.user) {
    getMe().catch(() => null)
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6 sm:py-8">
    <!-- HERO BANNER CARD DA SEÇÃO DE REDAÇÃO -->
    <section class="relative overflow-hidden rounded-3xl bg-[var(--student-primary-solid)] p-8 text-white shadow-xl shadow-purple-900/15 sm:p-10">
      <!-- DECORAÇÃO DE FUNDO SUAVE -->
      <div class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-950/20 blur-2xl"></div>

      <!-- CONTEÚDO CENTRALIZADO -->
      <div class="relative flex flex-col items-center justify-center text-center py-4 sm:py-6">
        <div class="flex items-center gap-3.5">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-purple-700 shadow-lg shadow-black/10">
            <span class="material-symbols-rounded text-3xl">edit_note</span>
          </div>
          <span class="text-3xl font-black tracking-tight sm:text-4xl">
            Laboratório de <span class="text-purple-200">Redação</span>
          </span>
        </div>

        <p class="mt-4 max-w-md text-xs font-semibold text-purple-100 sm:text-sm">
          Desenvolva textos nota 1000 com correções por competências, argumentos e repertórios.
        </p>
      </div>
    </section>

    <!-- SAUDAÇÃO -->
    <section class="mt-8">
      <h2 class="text-lg font-medium text-[var(--student-text)] sm:text-xl">
        Vamos praticar redação, <strong class="font-black text-[var(--student-text)]">{{ userName }}</strong>?
      </h2>
    </section>

    <!-- LISTA DE BOTÕES ESPECÍFICOS DE REDAÇÃO -->
    <section class="mt-5 space-y-3.5">
      <NuxtLink
        v-for="card in redacaoActions"
        :key="card.title"
        :to="card.to"
        class="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--student-primary-solid)] hover:shadow-md hover:shadow-purple-700/5 cursor-pointer"
      >
        <!-- ÍCONE + TEXTOS -->
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] transition group-hover:scale-105 group-hover:bg-[var(--student-primary-solid)] group-hover:text-white">
            <span class="material-symbols-rounded text-2xl">
              {{ card.icon }}
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-[var(--student-text)] transition group-hover:text-[var(--student-primary-text)]">
                {{ card.title }}
              </h3>
              <span
                v-if="card.badge"
                class="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-0.5 text-[10px] font-black tracking-wide text-white shadow-xs"
              >
                <span class="material-symbols-rounded text-xs">bolt</span>
                {{ card.badge }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-[var(--student-text-secondary)] truncate sm:text-sm">
              {{ card.description }}
            </p>
          </div>
        </div>

        <!-- SETA DIREITA -->
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--student-text-muted)] transition group-hover:text-[var(--student-primary-text)] group-hover:translate-x-1">
          <span class="material-symbols-rounded text-2xl">
            chevron_right
          </span>
        </div>
      </NuxtLink>
    </section>
  </div>
</template>
