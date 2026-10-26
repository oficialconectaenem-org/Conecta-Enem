<template>
  <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09080e] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
    <!-- Barra Superior de Navegação Rápida com Logo / Voltar -->
    <header class="w-full z-40 px-5 pt-4 sm:pt-6">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 backdrop-blur-md shadow-2xs hover:shadow-xs transition"
        >
          <span class="material-symbols-rounded text-base">arrow_back</span>
          <span>Voltar ao início</span>
        </NuxtLink>

        <CommonThemeToggle />
      </div>
    </header>

    <div class="flex-1 flex flex-col justify-center">
      <slot />
    </div>
  </div>
</template>