<script setup>
import QuestionForm from '~/components/admin/questions/QuestionForm.vue'
import { useQuestions } from '~/composables/useQuestions'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Editar Questão — Conecta Enem Admin'
})

const route = useRoute()
const { getQuestion } = useQuestions()

const question = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''

  try {
    const data = await getQuestion(route.params.id)
    question.value = data
  } catch (e) {
    console.error('Erro ao carregar questão:', e)
    error.value = e?.data?.statusMessage || e?.message || 'Erro ao carregar os dados da questão.'
  } finally {
    loading.value = false
  }
}

function onUpdated() {
  navigateTo('/admin/questoes')
}

function onCancel() {
  navigateTo('/admin/questoes')
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="space-y-6">
    <!-- BREADCRUMB / VOLTAR -->
    <div class="flex items-center gap-2 text-sm text-zinc-500">
      <NuxtLink
        to="/admin/questoes"
        class="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline"
      >
        <span class="material-symbols-rounded text-base">arrow_back</span>
        Voltar para Banco de Questões
      </NuxtLink>
    </div>

    <!-- CARREGANDO -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-12 text-center"
    >
      <span class="material-symbols-rounded animate-spin text-3xl text-purple-600">
        progress_activity
      </span>
      <p class="mt-3 text-sm font-semibold text-zinc-600">
        Carregando dados da questão...
      </p>
    </div>

    <!-- ERRO -->
    <div
      v-else-if="error"
      class="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700"
    >
      <span class="material-symbols-rounded text-3xl">error</span>
      <p class="mt-2 font-bold">{{ error }}</p>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
        @click="load"
      >
        Tentar novamente
      </button>
    </div>

    <!-- FORMULÁRIO DE EDIÇÃO -->
    <QuestionForm
      v-else
      :question="question"
      :edit="true"
      @success="onUpdated"
      @cancel="onCancel"
    />
  </div>
</template>