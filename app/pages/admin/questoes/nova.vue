<script setup>
import QuestionForm from '~/components/admin/questions/QuestionForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Nova Questão — Conecta Enem Admin'
})

function onCreated() {
  navigateTo('/admin/questoes')
}

function onCancel() {
  navigateTo('/admin/questoes')
}
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

    <!-- FORMULÁRIO -->
    <QuestionForm
      @success="onCreated"
      @cancel="onCancel"
    />
  </div>
</template>