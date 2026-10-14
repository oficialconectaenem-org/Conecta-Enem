<script setup>
import LessonForm from '~/components/admin/LessonForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Editar Aula — Conecta Enem Admin'
})

const route = useRoute()
const router = useRouter()
const moduleId = route.params.moduleId
const lessonId = route.params.id

const { getLesson } = useLessons()

const lesson = ref(null)
const loading = ref(true)
const fetchError = ref('')

onMounted(async () => {
  try {
    const res = await getLesson(lessonId)
    lesson.value = res?.lesson || null
  } catch (err) {
    fetchError.value = err?.data?.statusMessage || 'Erro ao carregar aula.'
  } finally {
    loading.value = false
  }
})

const module = computed(() => lesson.value?.module || null)

function onSuccess() {
  router.push(`/admin/modulos/${moduleId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- BREADCRUMB -->
    <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
      <NuxtLink to="/admin" class="hover:text-purple-600 transition">Admin</NuxtLink>
      <span class="material-symbols-rounded text-base">chevron_right</span>
      <NuxtLink
        v-if="module?.subject"
        :to="`/admin/materias/${module.subject.id}`"
        class="hover:text-purple-600 transition"
      >
        {{ module.subject.name }}
      </NuxtLink>
      <span v-if="module?.subject" class="material-symbols-rounded text-base">chevron_right</span>
      <NuxtLink
        :to="`/admin/modulos/${moduleId}`"
        class="hover:text-purple-600 transition"
      >
        {{ module?.name || 'Módulo' }}
      </NuxtLink>
      <span class="material-symbols-rounded text-base">chevron_right</span>
      <span class="font-bold text-zinc-900">Editar aula</span>
    </div>

    <!-- CABEÇALHO -->
    <div>
      <h1 class="text-2xl font-black tracking-tight text-zinc-900">Editar Aula</h1>
      <p v-if="lesson" class="mt-1 text-sm text-zinc-500">
        Editando: <strong class="text-zinc-700">{{ lesson.title }}</strong>
      </p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      <p class="mt-3 text-sm text-zinc-500">Carregando aula...</p>
    </div>

    <!-- ERRO -->
    <div
      v-else-if="fetchError"
      class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600"
    >
      <span class="material-symbols-rounded text-2xl text-red-400">error</span>
      <p class="mt-2">{{ fetchError }}</p>
      <NuxtLink
        :to="`/admin/modulos/${moduleId}`"
        class="mt-4 inline-block font-bold text-red-600 hover:underline"
      >
        ← Voltar
      </NuxtLink>
    </div>

    <!-- FORMULÁRIO -->
    <div v-else-if="lesson" class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <LessonForm
        :module-id="moduleId"
        :lesson="lesson"
        @success="onSuccess"
        @cancel="router.push(`/admin/modulos/${moduleId}`)"
      />
    </div>
  </div>
</template>
