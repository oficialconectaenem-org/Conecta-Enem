<script setup>
const features = [
  { icon: 'play_lesson', title: 'Videoaulas Estruturadas', description: 'Conteúdos organizados por matérias, módulos e aulas em uma sequência pedagógica clara.', tone: 'violet' },
  { icon: 'quiz', title: 'Banco de Questões ENEM', description: 'Milhares de questões com filtros por disciplina, tema, ano e comentários detalhados.', tone: 'sky' },
  { icon: 'edit_note', title: 'Laboratório de Redação', description: 'Escreva com textos motivadores reais, consulte bancos de argumentos e receba correções.', tone: 'emerald' },
  { icon: 'auto_stories', title: 'Repertórios Socioculturais', description: 'Banco completo com pensadores, livros, dados e citações para enriquecer seus textos.', tone: 'rose' },
  { icon: 'school', title: 'Turmas de Professores', description: 'Participe de turmas exclusivas com professores para envio e correção direta de redações.', tone: 'orange' },
  { icon: 'monitoring', title: 'Análise de Desempenho & IA', description: 'Acompanhe notas médias, curva de evolução e receba diagnósticos das 5 competências por inteligência artificial.', tone: 'fuchsia' }
]
</script>

<template>
  <section id="recursos" class="relative bg-white py-24 sm:py-28 transition-colors duration-200 dark:bg-zinc-950">
    <div class="mx-auto max-w-7xl px-5 lg:px-8">
      <div class="mx-auto max-w-2xl text-center space-y-3">
        <span class="landing-eyebrow">Tudo em um só lugar</span>
        <h2 class="text-3xl font-black tracking-[-.035em] text-zinc-950 sm:text-4xl dark:text-white">
          Ferramentas completas para estudar com alto rendimento
        </h2>
        <p class="leading-relaxed text-zinc-600 text-sm sm:text-base dark:text-zinc-400">
          Aprenda conteúdos, pratique exercícios, consulte repertórios e acompanhe sua nota dentro de uma única plataforma intuitiva.
        </p>
      </div>

      <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="landing-feature-card group flex flex-col justify-between"
        >
          <div>
            <div :class="`landing-feature-icon landing-feature-icon--${feature.tone} shadow-xs transition-transform group-hover:scale-110`">
              <span class="material-symbols-rounded text-2xl">{{ feature.icon }}</span>
            </div>
            <h3 class="mt-6 text-lg font-extrabold text-zinc-900 group-hover:text-purple-700 transition-colors dark:text-zinc-100 dark:group-hover:text-purple-400">
              {{ feature.title }}
            </h3>
            <p class="mt-2.5 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {{ feature.description }}
            </p>
          </div>

          <div class="mt-6 pt-4 border-t border-zinc-100/80 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>Conhecer recurso</span>
            <span class="material-symbols-rounded text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
