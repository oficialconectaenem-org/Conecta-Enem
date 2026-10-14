<script setup>
definePageMeta({
  layout: 'aluno',
  middleware: [
    () => navigateTo('/aluno/redacao/nova')
  ]
})

await navigateTo('/aluno/redacao/nova', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh] p-8 text-center font-sans">
    <div class="inline-flex items-center gap-3 text-purple-600 font-bold">
      <span class="material-symbols-rounded animate-spin text-2xl">progress_activity</span>
      <span>Redirecionando para Nova Redação com IA...</span>
    </div>
  </div>
</template>

<style scoped>
</style>
