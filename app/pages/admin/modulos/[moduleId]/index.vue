<script setup>
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const route = useRoute()
const router = useRouter()
const moduleId = route.params.moduleId

const { getLessons, deleteLesson } = useLessons()

const lessons = ref([])
const loading = ref(true)
const error = ref('')
const moduleInfo = ref(null)
const deletingId = ref(null)
const showDeleteModal = ref(false)
const lessonToDelete = ref(null)

async function loadLessons() {
  loading.value = true
  error.value = ''
  try {
    const res = await getLessons(moduleId)
    lessons.value = res?.lessons || []
    if (lessons.value.length) {
      moduleInfo.value = lessons.value[0]?.module || null
    }
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Erro ao carregar aulas.'
  } finally {
    loading.value = false
  }
}

function confirmDelete(lesson) {
  lessonToDelete.value = lesson
  showDeleteModal.value = true
}

async function doDelete() {
  if (!lessonToDelete.value) return
  deletingId.value = lessonToDelete.value.id
  try {
    await deleteLesson(lessonToDelete.value.id)
    showDeleteModal.value = false
    lessonToDelete.value = null
    await loadLessons()
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Erro ao excluir aula.'
    showDeleteModal.value = false
  } finally {
    deletingId.value = null
  }
}

function getYoutubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\n?#]+)/)
  return m ? m[1] : null
}

useSeoMeta({ title: 'Aulas do Módulo — Admin | Conecta Enem' })

onMounted(loadLessons)
</script>

<template>
  <div class="space-y-6">
    <!-- BREADCRUMB -->
    <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
      <NuxtLink to="/admin" class="transition hover:text-purple-600">Admin</NuxtLink>
      <span class="material-symbols-rounded text-base">chevron_right</span>
      <NuxtLink
        v-if="moduleInfo?.subject"
        :to="`/admin/materias/${moduleInfo.subject.id}`"
        class="transition hover:text-purple-600"
      >
        {{ moduleInfo.subject.name }}
      </NuxtLink>
      <span v-if="moduleInfo?.subject" class="material-symbols-rounded text-base">chevron_right</span>
      <span class="font-bold text-zinc-900">{{ moduleInfo?.name || 'Módulo' }}</span>
    </div>

    <!-- CABEÇALHO -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-zinc-900">
          {{ moduleInfo?.name || 'Aulas do Módulo' }}
        </h1>
        <p class="mt-1 text-sm text-zinc-500">
          {{ lessons.length }} aula{{ lessons.length !== 1 ? 's' : '' }} cadastrada{{ lessons.length !== 1 ? 's' : '' }}
        </p>
      </div>

      <NuxtLink
        :to="`/admin/modulos/${moduleId}/aulas/nova`"
        class="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700"
      >
        <span class="material-symbols-rounded text-lg">add</span>
        Nova aula
      </NuxtLink>
    </div>

    <!-- ERRO -->
    <div
      v-if="error"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <span class="material-symbols-rounded mt-0.5 text-lg">error</span>
      <p>{{ error }}</p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="i in 4"
        :key="i"
        class="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
      ></div>
    </div>

    <!-- VAZIO -->
    <div
      v-else-if="!loading && lessons.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-14 text-center"
    >
      <span class="material-symbols-rounded text-5xl text-zinc-300">play_circle</span>
      <p class="mt-3 text-base font-bold text-zinc-600">Nenhuma aula cadastrada</p>
      <p class="mt-1 text-sm text-zinc-400">Clique em "Nova aula" para começar.</p>
      <NuxtLink
        :to="`/admin/modulos/${moduleId}/aulas/nova`"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700"
      >
        <span class="material-symbols-rounded text-lg">add</span>
        Nova aula
      </NuxtLink>
    </div>

    <!-- LISTA DE AULAS -->
    <div v-else class="space-y-3">
      <div
        v-for="lesson in lessons"
        :key="lesson.id"
        class="group flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md sm:flex-row sm:items-center"
      >
        <!-- THUMBNAIL -->
        <div class="shrink-0">
          <img
            v-if="getYoutubeId(lesson.videoUrl)"
            :src="`https://img.youtube.com/vi/${getYoutubeId(lesson.videoUrl)}/mqdefault.jpg`"
            :alt="lesson.title"
            class="h-24 w-full rounded-xl object-cover sm:h-16 sm:w-28"
          />
          <div
            v-else
            class="flex h-16 w-28 items-center justify-center rounded-xl bg-zinc-100"
          >
            <span class="material-symbols-rounded text-2xl text-zinc-400">play_circle</span>
          </div>
        </div>

        <!-- INFO -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-black text-zinc-500">
              #{{ lesson.order }}
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-bold"
              :class="lesson.active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'"
            >
              {{ lesson.active ? 'Ativa' : 'Inativa' }}
            </span>
          </div>

          <h2 class="mt-1.5 truncate text-sm font-bold text-zinc-900">{{ lesson.title }}</h2>

          <p v-if="lesson.description" class="mt-0.5 line-clamp-1 text-xs text-zinc-500">
            {{ lesson.description }}
          </p>

          <a
            v-if="lesson.videoUrl"
            :href="lesson.videoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 transition hover:underline"
          >
            <span class="material-symbols-rounded text-sm">smart_display</span>
            Ver vídeo
          </a>
        </div>

        <!-- AÇÕES -->
        <div class="flex shrink-0 gap-2">
          <NuxtLink
            :to="`/admin/modulos/${moduleId}/aulas/${lesson.id}/editar`"
            class="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
          >
            <span class="material-symbols-rounded text-base">edit</span>
            Editar
          </NuxtLink>

          <button
            type="button"
            :disabled="deletingId === lesson.id"
            class="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            @click="confirmDelete(lesson)"
          >
            <span class="material-symbols-rounded text-base">delete</span>
            Excluir
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showDeleteModal = false"></div>
        <div class="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
            <span class="material-symbols-rounded text-2xl text-red-500">delete</span>
          </div>
          <h3 class="mt-4 text-lg font-black text-zinc-900">Excluir aula?</h3>
          <p class="mt-2 text-sm text-zinc-500">
            Tem certeza que deseja excluir <strong class="text-zinc-700">"{{ lessonToDelete?.title }}"</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div class="mt-5 flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
              @click="showDeleteModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="!!deletingId"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
              @click="doDelete"
            >
              <span
                v-if="deletingId"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              {{ deletingId ? 'Excluindo...' : 'Sim, excluir' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>