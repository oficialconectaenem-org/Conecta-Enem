<script setup>
const props = defineProps({
  moduleId: {
    type: String,
    required: true
  },
  lesson: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['success', 'cancel'])

const { createLesson, updateLesson } = useLessons()

const isEdit = computed(() => !!props.lesson)

const form = reactive({
  moduleId: props.moduleId,
  title: props.lesson?.title || '',
  description: props.lesson?.description || '',
  videoUrl: props.lesson?.videoUrl || '',
  order: props.lesson?.order || '',
  active: props.lesson?.active ?? true
})

const errors = ref({})
const submitting = ref(false)
const globalError = ref('')

// Preview do YouTube
const youtubeId = computed(() => {
  const url = form.videoUrl?.trim()
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\n?#]+)/)
  return match ? match[1] : null
})

async function submit() {
  errors.value = {}
  globalError.value = ''
  submitting.value = true

  try {
    const payload = {
      moduleId: form.moduleId,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      videoUrl: form.videoUrl?.trim() || null,
      order: form.order ? Number(form.order) : undefined,
      active: form.active
    }

    if (isEdit.value) {
      await updateLesson(props.lesson.id, payload)
    } else {
      await createLesson(payload)
    }

    emit('success')
  } catch (err) {
    const fieldErrors = err?.data?.data?.errors || err?.data?.errors
    if (fieldErrors) {
      errors.value = fieldErrors
    } else {
      globalError.value = err?.data?.statusMessage || err?.message || 'Ocorreu um erro ao salvar a aula.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form
    class="space-y-5"
    @submit.prevent="submit"
  >
    <!-- ERRO GLOBAL -->
    <div
      v-if="globalError"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <span class="material-symbols-rounded mt-0.5 text-lg text-red-500">error</span>
      <p>{{ globalError }}</p>
    </div>

    <!-- TÍTULO -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">
        Título da aula <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.title"
        type="text"
        required
        placeholder="Ex: Introdução ao Tema"
        maxlength="150"
        class="h-11 w-full rounded-xl border px-4 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        :class="errors.title ? 'border-red-400 bg-red-50 dark:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'"
      />
      <p v-if="errors.title" class="mt-1.5 text-xs text-red-500">{{ errors.title[0] }}</p>
    </div>

    <!-- DESCRIÇÃO -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">
        Descrição <span class="text-zinc-400 dark:text-zinc-500 font-normal">(opcional)</span>
      </label>
      <textarea
        v-model="form.description"
        placeholder="Descreva brevemente o conteúdo desta aula..."
        rows="3"
        maxlength="1000"
        class="w-full resize-none rounded-xl border px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        :class="errors.description ? 'border-red-400 bg-red-50 dark:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'"
      ></textarea>
      <div class="flex justify-between mt-1">
        <p v-if="errors.description" class="text-xs text-red-500">{{ errors.description[0] }}</p>
        <p class="ml-auto text-xs text-zinc-400 dark:text-zinc-500">{{ (form.description || '').length }}/1000</p>
      </div>
    </div>

    <!-- URL DO VÍDEO -->
    <div>
      <label class="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">
        URL do Vídeo <span class="text-zinc-400 dark:text-zinc-500 font-normal">(YouTube)</span>
      </label>
      <input
        v-model="form.videoUrl"
        type="url"
        placeholder="https://youtube.com/watch?v=..."
        class="h-11 w-full rounded-xl border px-4 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        :class="errors.videoUrl ? 'border-red-400 bg-red-50 dark:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'"
      />
      <p v-if="errors.videoUrl" class="mt-1.5 text-xs text-red-500">{{ errors.videoUrl[0] }}</p>

      <!-- PREVIEW DO YOUTUBE -->
      <div
        v-if="youtubeId"
        class="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
      >
        <div class="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
          <span class="material-symbols-rounded text-base text-purple-600">smart_display</span>
          <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Pré-visualização</span>
        </div>
        <img
          :src="`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`"
          :alt="form.title"
          class="w-full object-cover"
        />
      </div>
    </div>

    <!-- ORDEM + STATUS (grid responsivo) -->
    <div class="grid gap-4 sm:grid-cols-2">
      <!-- ORDEM -->
      <div>
        <label class="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">
          Ordem <span class="text-zinc-400 dark:text-zinc-500 font-normal">(opcional)</span>
        </label>
        <input
          v-model="form.order"
          type="number"
          min="1"
          placeholder="Auto"
          class="h-11 w-full rounded-xl border px-4 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          :class="errors.order ? 'border-red-400 bg-red-50 dark:bg-red-950/40' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'"
        />
        <p v-if="errors.order" class="mt-1.5 text-xs text-red-500">{{ errors.order[0] }}</p>
      </div>

      <!-- STATUS -->
      <div>
        <label class="mb-1.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">Status</label>
        <div class="flex h-11 items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4">
          <button
            type="button"
            role="switch"
            :aria-checked="form.active"
            class="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
            :class="form.active ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'"
            @click="form.active = !form.active"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
              :class="form.active ? 'translate-x-5' : 'translate-x-0.5'"
            ></span>
          </button>
          <span
            class="text-sm font-semibold"
            :class="form.active ? 'text-purple-700 dark:text-purple-300' : 'text-zinc-500 dark:text-zinc-400'"
          >
            {{ form.active ? 'Ativa' : 'Inativa' }}
          </span>
        </div>
      </div>
    </div>

    <!-- BOTÕES -->
    <div class="flex flex-col-reverse gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 px-6 text-sm font-bold text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
        @click="emit('cancel')"
      >
        Cancelar
      </button>

      <button
        type="submit"
        :disabled="submitting"
        class="flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
      >
        <span
          v-if="submitting"
          class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        ></span>
        {{ submitting ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Criar aula') }}
      </button>
    </div>
  </form>
</template>
