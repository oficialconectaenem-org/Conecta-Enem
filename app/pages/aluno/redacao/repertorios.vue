<script setup>
definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Repertórios Socioculturais — Conecta Enem'
})

const { data, pending, error } = await useFetch('/api/student/redacao/repertoires')
const repertoires = computed(() => data.value?.repertoires || [])

const searchQuery = ref('')
const selectedAxis = ref('')

const axes = computed(() => {
  const set = new Set()
  repertoires.value.forEach(r => { if (r.axis) set.add(r.axis) })
  return Array.from(set)
})

const filteredRepertoires = computed(() => {
  return repertoires.value.filter(rep => {
    const matchesSearch = !searchQuery.value ||
      rep.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (rep.author && rep.author.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      rep.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesAxis = !selectedAxis.value || rep.axis === selectedAxis.value
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
        <span class="material-symbols-rounded text-purple-600 text-3xl">auto_stories</span>
        Repertórios Socioculturais
      </h1>
      <p class="mt-1 text-sm text-[var(--student-text-secondary)]">
        Filosofia, sociologia, literatura, legislação e história para fundamentar sua redação nota 1000.
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
          placeholder="Buscar repertórios (filósofo, livro, citação...)"
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
      <p class="mt-2 text-sm font-semibold">Carregando repertórios...</p>
    </div>

    <!-- VAZIO -->
    <div v-else-if="filteredRepertoires.length === 0" class="rounded-3xl border border-dashed border-[var(--student-border)] p-12 text-center">
      <span class="material-symbols-rounded text-5xl text-[var(--student-text-muted)]">auto_stories</span>
      <p class="mt-3 text-base font-bold text-[var(--student-text)]">Nenhum repertório encontrado</p>
      <p class="mt-1 text-xs text-[var(--student-text-secondary)]">Em breve novos repertórios serão adicionados.</p>
    </div>

    <!-- LISTA DE REPERTORIOS -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="rep in filteredRepertoires"
        :key="rep.id"
        class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div v-if="rep.axis" class="mb-3">
            <span class="inline-block px-3 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-black uppercase tracking-wider">
              {{ rep.axis }}
            </span>
          </div>

          <h3 class="text-lg font-extrabold text-[var(--student-text)] leading-snug">
            {{ rep.title }}
          </h3>

          <p v-if="rep.author" class="mt-1 text-xs font-bold text-purple-600">
            Autor / Referência: {{ rep.author }}
          </p>

          <p class="mt-3 text-sm leading-relaxed text-[var(--student-text-secondary)]">
            {{ rep.content }}
          </p>

          <blockquote v-if="rep.quote" class="mt-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 p-3.5 border-l-4 border-purple-600 text-xs italic text-[var(--student-text)]">
            "{{ rep.quote }}"
          </blockquote>
        </div>
      </div>
    </div>
  </div>
</template>
