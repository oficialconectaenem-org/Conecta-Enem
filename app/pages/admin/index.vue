<script setup>
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: 'Painel Administrativo — Conecta Enem'
})

const activeSection = ref('dashboard')

const components = {
  dashboard: defineAsyncComponent(() =>
    import('~/components/admin/AdminDashboard.vue')
  ),

  subjects: defineAsyncComponent(() =>
    import('~/components/admin/subjects/SubjectList.vue')
  ),

  topics: defineAsyncComponent(() =>
    import('~/components/admin/topics/TopicList.vue')
  ),

  questions: defineAsyncComponent(() =>
    import('~/components/admin/questions/index.vue')
  ),

  lessons: defineAsyncComponent(() =>
    import('~/components/admin/lessons/LessonList.vue')
  ),

  students: defineAsyncComponent(() =>
    import('~/components/admin/users/UserManager.vue')
  ),

  users: defineAsyncComponent(() =>
    import('~/components/admin/users/UserManager.vue')
  ),

  redacao: defineAsyncComponent(() =>
    import('~/components/admin/redacao/RedacaoManager.vue')
  )
}

const currentComponent = computed(() => {
  return components[activeSection.value] || components.dashboard
})

function changeSection(section) {
  activeSection.value = section
}

provide('adminNavigation', {
  activeSection,
  changeSection
})
</script>

<template>
  <section class="admin-content">
    <component :is="currentComponent" />
  </section>
</template>

<style scoped>
.admin-content {
  width: 100%;
  min-height: 100%;
}
</style>