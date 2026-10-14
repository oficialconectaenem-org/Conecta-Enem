<template>
  <section id="redacao" class="relative isolate overflow-hidden bg-gradient-to-br from-[#1b0c36] via-[#24104c] to-[#120526] py-24 text-white sm:py-32">
    <div id="analise" class="absolute top-0"></div>
    <div class="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-fuchsia-600/25 blur-3xl" />
    <div class="absolute -bottom-48 left-1/3 -z-10 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
    
    <div class="relative mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
      <div class="space-y-4">
        <span class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-fuchsia-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <span class="material-symbols-rounded text-sm">edit_note</span>
          Laboratório de Redação
        </span>
        <h2 class="text-3xl font-black tracking-[-.035em] sm:text-5xl leading-tight">
          Sua redação merece um plano claro de evolução rumo aos <span class="bg-gradient-to-r from-fuchsia-400 to-purple-300 bg-clip-text text-transparent">1000 pontos</span>.
        </h2>
        <p class="max-w-xl text-sm sm:text-base leading-relaxed text-purple-100/90">
          Escolha propostas com temas atuais e textos motivadores autênticos, consulte argumentos e receba correções completas estruturadas pelas 5 competências do ENEM.
        </p>
        
        <div class="pt-2 flex flex-wrap gap-2.5">
          <span class="rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs">5 Competências Oficiais</span>
          <span class="rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs">Bancos de Argumentos</span>
          <span class="rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs">Repertórios por Eixo Temático</span>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <article class="group rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/15 hover:border-purple-300/40">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/20 text-fuchsia-300 text-2xl border border-fuchsia-400/20 group-hover:scale-110 transition-transform">
            <span class="material-symbols-rounded text-2xl">auto_fix_high</span>
          </div>
          <h3 class="text-lg font-bold text-white">Critérios ENEM</h3>
          <p class="mt-2.5 text-xs sm:text-sm leading-relaxed text-purple-100/80">
            Estrutura analítica detalhada com notas discriminadas em cada competência (C1 a C5) e dicas práticas de melhoria.
          </p>
        </article>

        <article class="group rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/15 hover:border-purple-300/40">
          <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 text-2xl border border-purple-400/20 group-hover:scale-110 transition-transform">
            <span class="material-symbols-rounded text-2xl">school</span>
          </div>
          <h3 class="text-lg font-bold text-white">Turmas & Professores</h3>
          <p class="mt-2.5 text-xs sm:text-sm leading-relaxed text-purple-100/80">
            Conecte-se com sua sala de aula, envie suas redações e receba feedbacks individuais do seu professor.
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
