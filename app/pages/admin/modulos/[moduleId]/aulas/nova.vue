<script setup>
import LessonForm from '~/components/admin/LessonForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Nova Aula — Conecta Enem Admin'
})

const route = useRoute()
const router = useRouter()
const moduleId = route.params.moduleId

// Busca info do módulo para mostrar breadcrumb
const { data: moduleData } = await useFetch(`/api/modules/${moduleId}`, {
  credentials: 'include'
}).catch(() => ({ data: ref(null) }))

const module = computed(() => moduleData.value?.module || null)

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
      <span class="font-bold text-zinc-900">Nova aula</span>
    </div>

    <!-- CABEÇALHO -->
    <div>
      <h1 class="text-2xl font-black tracking-tight text-zinc-900">Nova Aula</h1>
      <p class="mt-1 text-sm text-zinc-500">
        Adicione uma nova aula ao módulo
        <strong class="text-zinc-700">{{ module?.name }}</strong>.
      </p>
    </div>

    <!-- FORMULÁRIO -->
    <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <LessonForm
        :module-id="moduleId"
        @success="onSuccess"
        @cancel="router.push(`/admin/modulos/${moduleId}`)"
      />
    </div>
  </div>
</template>
