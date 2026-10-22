<script setup>
import { calculateEssayMetrics } from '#shared/utils/essay-metrics'

const props = defineProps({
  show: Boolean,
  essay: Object,
  saving: Boolean
})

const emit = defineEmits(['close', 'save'])
const metrics = computed(() => calculateEssayMetrics(props.essay?.content || '', props.essay?.title || ''))

const form = reactive({
  c1Score: 160,
  c2Score: 160,
  c3Score: 160,
  c4Score: 160,
  c5Score: 160,
  c1Comment: '',
  c2Comment: '',
  c3Comment: '',
  c4Comment: '',
  c5Comment: '',
  generalFeedback: ''
})

const scoreOptions = [0, 40, 80, 120, 160, 200]

const competencies = [
  { id: 'c1', key: 'c1Score', commentKey: 'c1Comment', title: 'Competência 1', desc: 'Domínio da norma padrão da língua escrita.' },
  { id: 'c2', key: 'c2Score', commentKey: 'c2Comment', title: 'Competência 2', desc: 'Compreensão do tema e aplicação das áreas do conhecimento.' },
  { id: 'c3', key: 'c3Score', commentKey: 'c3Comment', title: 'Competência 3', desc: 'Seleção, relação, organização e interpretação de informações/argumentos.' },
  { id: 'c4', key: 'c4Score', commentKey: 'c4Comment', title: 'Competência 4', desc: 'Conhecimento dos mecanismos linguísticos de argumentação.' },
  { id: 'c5', key: 'c5Score', commentKey: 'c5Comment', title: 'Competência 5', desc: 'Elaboração de proposta de intervenção social com 5 elementos.' }
]

watch(() => props.essay, (newEssay) => {
  if (newEssay?.correction) {
    form.c1Score = newEssay.correction.c1Score ?? 160
    form.c2Score = newEssay.correction.c2Score ?? 160
    form.c3Score = newEssay.correction.c3Score ?? 160
    form.c4Score = newEssay.correction.c4Score ?? 160
    form.c5Score = newEssay.correction.c5Score ?? 160
    form.c1Comment = newEssay.correction.c1Comment || ''
    form.c2Comment = newEssay.correction.c2Comment || ''
    form.c3Comment = newEssay.correction.c3Comment || ''
    form.c4Comment = newEssay.correction.c4Comment || ''
    form.c5Comment = newEssay.correction.c5Comment || ''
    form.generalFeedback = newEssay.correction.generalFeedback || ''
  } else {
    form.c1Score = 160
    form.c2Score = 160
    form.c3Score = 160
    form.c4Score = 160
    form.c5Score = 160
    form.c1Comment = ''
    form.c2Comment = ''
    form.c3Comment = ''
    form.c4Comment = ''
    form.c5Comment = ''
    form.generalFeedback = ''
  }
}, { immediate: true })

const totalScore = computed(() => {
  return Number(form.c1Score) + Number(form.c2Score) + Number(form.c3Score) + Number(form.c4Score) + Number(form.c5Score)
})

function handleSave() {
  emit('save', {
    ...form,
    totalScore: totalScore.value
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" @click="emit('close')"></div>

        <!-- Modal Box Max-Width Large -->
        <div class="relative w-full max-w-6xl max-h-[92vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden z-10 dark:bg-zinc-900 dark:border dark:border-zinc-800">
          <!-- Top Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0 dark:border-zinc-800 dark:bg-zinc-900">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 font-bold dark:bg-purple-950/70 dark:text-purple-300">
                <span class="material-symbols-rounded text-xl">rate_review</span>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 leading-tight dark:text-zinc-100">Avaliação de Redação ENEM</h3>
                <p class="text-xs text-slate-500 dark:text-zinc-400">
                  Aluno: <strong class="text-slate-700 dark:text-zinc-200">{{ essay?.student?.name }}</strong> • Turma: {{ essay?.classroom?.name }}
                </p>
              </div>
            </div>

            <!-- Score Pill -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-1.5 text-white shadow-md shadow-purple-600/20">
                <span class="text-xs font-bold text-purple-200">Nota Total:</span>
                <span class="text-lg font-black">{{ totalScore }} / 1000</span>
              </div>

              <button
                type="button"
                class="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                @click="emit('close')"
              >
                <span class="material-symbols-rounded text-xl">close</span>
              </button>
            </div>
          </div>

          <!-- Body Content: 2 Columns (Texto do Aluno à esquerda, Critérios à direita) -->
          <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Coluna 1: Redação do Aluno -->
            <div class="space-y-4 flex flex-col">
              <div class="rounded-2xl bg-purple-50/60 border border-purple-100 p-4 dark:bg-purple-950/20 dark:border-purple-900/40">
                <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Tema Proposto</span>
                <h4 class="text-sm font-black text-slate-900 mt-0.5 dark:text-zinc-100">{{ essay?.theme }}</h4>
              </div>

              <!-- Badges de Métricas Oficiais ENEM -->
              <div v-if="essay?.content" class="grid grid-cols-3 gap-2">
                <div class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-2 text-center shadow-2xs">
                  <span class="block text-[10px] font-black uppercase text-slate-400">Linhas ENEM</span>
                  <span class="text-xs font-black" :class="metrics.lines > 30 ? 'text-rose-600' : metrics.lines >= 8 ? 'text-emerald-600' : 'text-amber-600'">
                    {{ metrics.lines }} / 30
                  </span>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-2 text-center shadow-2xs">
                  <span class="block text-[10px] font-black uppercase text-slate-400">Parágrafos</span>
                  <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {{ metrics.paragraphs }} ({{ metrics.paragraphs === 4 ? 'Ideal' : 'Estrutura' }})
                  </span>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-2 text-center shadow-2xs">
                  <span class="block text-[10px] font-black uppercase text-slate-400">Palavras</span>
                  <span class="text-xs font-black text-purple-600 dark:text-purple-400">
                    {{ metrics.words }}
                  </span>
                </div>
              </div>

              <div class="flex-1 rounded-2xl border border-slate-200 bg-slate-50/30 p-5 overflow-y-auto dark:border-zinc-800 dark:bg-zinc-950/60 font-sans">
                <h5 v-if="essay?.title" class="text-center font-bold text-slate-800 mb-4 text-sm underline decoration-purple-300 dark:text-zinc-100">
                  {{ essay.title }}
                </h5>
                <div v-if="essay?.imageUrl" class="space-y-2">
                  <div class="rounded-xl border border-purple-200 bg-purple-50 p-2 text-center text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300 flex items-center justify-center gap-1.5">
                    <span class="material-symbols-rounded text-sm">photo_camera</span>
                    <span>Folha Manuscrita Enviada pelo Aluno</span>
                  </div>
                  <div class="bg-black/5 dark:bg-black/30 rounded-xl p-2 sm:p-3 text-center">
                    <img
                      :src="essay.imageUrl"
                      alt="Folha de redação manuscrita"
                      class="max-h-[800px] w-full mx-auto object-contain rounded-lg shadow-md"
                      style="image-rendering: -webkit-optimize-contrast;"
                    />
                  </div>
                </div>
                <div v-else class="prose prose-sm max-w-none text-slate-800 font-sans leading-relaxed whitespace-pre-wrap select-text text-sm dark:text-zinc-200 text-justify" style="text-align: justify; text-justify: inter-word;">
                  {{ essay?.content || 'Nenhum texto digitado.' }}
                </div>
              </div>
            </div>

            <!-- Coluna 2: Formulário de Correção por Competência (C1 a C5) -->
            <div class="space-y-4 overflow-y-auto pr-1">
              <div
                v-for="comp in competencies"
                :key="comp.id"
                class="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/90"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h5 class="text-xs font-black text-slate-900 dark:text-zinc-100">{{ comp.title }}</h5>
                    <p class="text-[11px] text-slate-400 dark:text-zinc-500">{{ comp.desc }}</p>
                  </div>
                  <span class="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg dark:bg-purple-950/60 dark:text-purple-300">
                    {{ form[comp.key] }} pts
                  </span>
                </div>

                <!-- Pontuação Rápida em Pílulas (0, 40, 80, 120, 160, 200) -->
                <div class="flex items-center gap-1.5 pt-1">
                  <button
                    v-for="score in scoreOptions"
                    :key="score"
                    type="button"
                    @click="form[comp.key] = score"
                    class="flex-1 min-h-[38px] py-1 rounded-xl text-xs font-bold transition text-center active:scale-95 cursor-pointer"
                    :class="form[comp.key] === score ? 'bg-purple-600 text-white font-black shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'"
                  >
                    {{ score }}
                  </button>
                </div>

                <!-- Comentário Específico -->
                <textarea
                  v-model="form[comp.commentKey]"
                  rows="1"
                  placeholder="Feedback específico para esta competência (opcional)..."
                  class="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-700 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 transition resize-none dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-600"
                ></textarea>
              </div>

              <!-- Comentário Geral / Orientações -->
              <div class="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/90">
                <label class="block text-xs font-black text-slate-900 dark:text-zinc-100">
                  Parecer Geral & Dicas para o Aluno
                </label>
                <textarea
                  v-model="form.generalFeedback"
                  rows="3"
                  placeholder="Escreva orientações gerais, pontos fortes e o que melhorar no próximo texto..."
                  class="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-700 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 transition dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-600"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Footer Ações -->
          <div class="border-t border-slate-100 p-4 px-6 bg-slate-50/50 flex items-center justify-between shrink-0 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
              @click="emit('close')"
            >
              Cancelar
            </button>

            <button
              type="button"
              :disabled="saving"
              @click="handleSave"
              class="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-600 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition disabled:opacity-50 active:scale-98"
            >
              <span v-if="saving" class="material-symbols-rounded animate-spin text-sm">progress_activity</span>
              <span v-else class="material-symbols-rounded text-sm">check</span>
              <span>{{ saving ? 'Salvando Correção...' : 'Concluir & Publicar Correção' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
