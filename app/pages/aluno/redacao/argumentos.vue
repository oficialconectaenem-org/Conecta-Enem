<script setup>
definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Banco de Argumentos — Conecta Enem'
})

const { data, pending, error } = useLazyFetch('/api/student/redacao/arguments')
const argumentsList = computed(() => data.value?.arguments || [])

const searchQuery = ref('')
const selectedAxis = ref('')

const axes = computed(() => {
  const set = new Set()
  argumentsList.value.forEach(a => { if (a.axis) set.add(a.axis) })
  return Array.from(set)
})

const filteredArguments = computed(() => {
  return argumentsList.value.filter(arg => {
    const matchesSearch = !searchQuery.value ||
      arg.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      arg.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesAxis = !selectedAxis.value || arg.axis === selectedAxis.value
    return matchesSearch && matchesAxis
  })
})
</script>

<template>
  <div class="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">
    <!-- NAVEGACAO / VOLTAR -->
    <div>
      <NuxtLink to="/aluno/redacao" class="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline mb-2">
        <span class="material-symbols-rounded text-base">arrow_back</span> Voltar para Redação
      </NuxtLink>
      <h1 class="text-2xl font-black text-[var(--student-text)] sm:text-3xl flex items-center gap-2.5">
        <span class="material-symbols-rounded text-purple-600 text-3xl">chat_bubble</span>
        Banco de Argumentos
      </h1>
      <p class="mt-1 text-sm text-[var(--student-text-secondary)]">
        Explore teses e argumentos estratégicos cadastrados pelos professores para enriquecer seu texto.
      </p>
    </div>

    <!-- BARRA DE BUSCA E FILTRO -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <span class="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[var(--student-text-muted)]">
          search
        </span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Buscar argumentos por palavra-chave..."
          class="h-12 w-full rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] pl-11 pr-4 text-sm text-[var(--student-text)] placeholder-[var(--student-text-muted)] outline-none transition focus:border-[var(--student-primary-solid)]"
        />
      </div>

      <select
        v-if="axes.length > 0"
        v-model="selectedAxis"
        class="h-12 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] px-4 text-sm font-semibold text-[var(--student-text)] outline-none"
      >
        <option value="">Todos os Eixos</option>
        <option v-for="ax in axes" :key="ax" :value="ax">{{ ax }}</option>
      </select>
    </div>

    <!-- CARREGANDO -->
    <div v-if="pending" class="py-12 text-center text-zinc-400">
      <span class="material-symbols-rounded text-4xl animate-spin">progress_activity</span>
      <p class="mt-2 text-sm font-semibold">Carregando argumentos...</p>
    </div>

    <!-- VAZIO -->
    <div v-else-if="filteredArguments.length === 0" class="rounded-3xl border border-dashed border-[var(--student-border)] p-12 text-center">
      <span class="material-symbols-rounded text-5xl text-[var(--student-text-muted)]">chat_bubble</span>
      <p class="mt-3 text-base font-bold text-[var(--student-text)]">Nenhum argumento encontrado</p>
      <p class="mt-1 text-xs text-[var(--student-text-secondary)]">Em breve novos conteúdos serão disponibilizados.</p>
    </div>

    <!-- LISTA DE ARGUMENTOS -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="arg in filteredArguments"
        :key="arg.id"
        class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div v-if="arg.axis" class="mb-3">
            <span class="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-black uppercase tracking-wider">
              {{ arg.axis }}
            </span>
          </div>

          <h3 class="text-lg font-extrabold text-[var(--student-text)] leading-snug">
            {{ arg.title }}
          </h3>

          <p class="mt-3 text-sm leading-relaxed text-[var(--student-text-secondary)]">
            {{ arg.content }}
          </p>

          <div v-if="arg.application" class="mt-4 rounded-2xl bg-[var(--student-surface-secondary)] p-3.5 border border-[var(--student-border)] text-xs text-[var(--student-text-secondary)]">
            <strong class="text-purple-700 dark:text-purple-400 block mb-1">💡 Como aplicar no desenvolvimento:</strong>
            {{ arg.application }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
