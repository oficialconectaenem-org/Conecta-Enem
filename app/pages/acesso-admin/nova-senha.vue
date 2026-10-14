<script setup>
definePageMeta({
  middleware: [
    () => navigateTo('/acesso-admin', { redirectCode: 301 })
  ]
})
await navigateTo('/acesso-admin', { replace: true })
</script>

<template>
  <div></div>
</template>
