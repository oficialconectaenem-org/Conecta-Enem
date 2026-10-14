<script setup>
import QuestionManagement from '~/components/admin/questions/index.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Banco de Questões — Conecta Enem Admin'
})
</script>

<template>
  <QuestionManagement />
</template>