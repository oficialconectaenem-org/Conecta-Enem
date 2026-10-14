<script setup>
definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

useSeoMeta({
  title: 'Relatórios — Painel do Professor | Conecta Enem'
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight dark:text-zinc-100">
          Relatórios & Desempenho
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Visualize métricas detalhadas de evolução e engajamento dos seus alunos.
        </p>
      </div>
    </div>

    <!-- Placeholder inicial para Relatórios -->
    <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-purple-600 mb-4 dark:bg-purple-950/50 dark:text-purple-400">
        <span class="material-symbols-rounded text-3xl">insights</span>
      </div>
      <h3 class="text-base font-black text-slate-900 dark:text-zinc-100">Módulo de Relatórios</h3>
      <p class="mt-1 text-xs text-slate-500 max-w-md mx-auto dark:text-zinc-400">
        Gráficos de evolução das médias por competência do ENEM, taxa de entrega de redações e comparativos de desempenho por turma.
      </p>
      <div class="mt-6">
        <NuxtLink
          to="/professor"
          class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition"
        >
          <span class="material-symbols-rounded text-base">dashboard</span>
          <span>Voltar ao Dashboard</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
