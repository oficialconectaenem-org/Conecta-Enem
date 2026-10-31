<script setup>
definePageMeta({
  layout: 'professor',
  middleware: 'teacher'
})

// Redireciona imediatamente para o módulo oficial de redações e correções
await navigateTo('/professor/redacoes', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[400px]">
    <span class="material-symbols-rounded animate-spin text-3xl text-purple-600">progress_activity</span>
  </div>
</template>
