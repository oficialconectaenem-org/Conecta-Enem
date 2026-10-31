<script setup>
useHead({
  script: [
    {
      innerHTML: `(function(){try{var s=localStorage.getItem('conecta_theme')||'system';var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s==='system'&&p)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}})();`
    }
  ]
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="#9333ea" :height="3" />
    <AppLaunchAnimation />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
