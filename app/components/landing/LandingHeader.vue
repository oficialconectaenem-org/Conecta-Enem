<script setup>
import { usePwaInstall } from '~/composables/usePwaInstall'

const mobileMenuOpen = ref(false)
const showInstallModal = ref(false)
const { isInstalled, isIos, promptInstall } = usePwaInstall()

function closeMenu() {
  mobileMenuOpen.value = false
}

async function handleInstall() {
  const result = await promptInstall()
  if (!result) {
    showInstallModal.value = true
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-purple-100/80 bg-white/90 backdrop-blur-xl transition-colors duration-200 dark:border-zinc-800 dark:bg-zinc-950/85"
  >
    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-3"
        aria-label="Conecta Enem"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-purple-100 dark:border-zinc-800 shadow-sm p-0.5 bg-white dark:bg-zinc-900"
        >
          <img src="/images/logo conta.png" alt="Logo Conecta Enem" class="h-full w-full object-contain" />
        </div>

        <span
          class="text-lg font-extrabold tracking-tight text-[var(--color-primary-dark)] dark:text-purple-400"
        >
          Conecta Enem
        </span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 lg:flex">
        <a
          href="#recursos"
          class="text-sm font-medium text-zinc-600 transition hover:text-[var(--color-primary)] dark:text-zinc-300 dark:hover:text-purple-400"
        >
          Recursos
        </a>

        <a
          href="#analise"
          class="text-sm font-medium text-zinc-600 transition hover:text-[var(--color-primary)] dark:text-zinc-300 dark:hover:text-purple-400"
        >
          Análise
        </a>

        <a
          href="#redacao"
          class="text-sm font-medium text-zinc-600 transition hover:text-[var(--color-primary)] dark:text-zinc-300 dark:hover:text-purple-400"
        >
          Redação
        </a>

        <a
          href="#como-funciona"
          class="text-sm font-medium text-zinc-600 transition hover:text-[var(--color-primary)] dark:text-zinc-300 dark:hover:text-purple-400"
        >
          Como funciona
        </a>

        <a
          href="#sobre"
          class="text-sm font-medium text-zinc-600 transition hover:text-[var(--color-primary)] dark:text-zinc-300 dark:hover:text-purple-400"
        >
          Sobre
        </a>
      </nav>

      <div class="hidden items-center gap-3 lg:flex">
        <!-- BOTÃO INSTALAR APP PWA -->
        <button
          v-if="!isInstalled"
          type="button"
          @click="handleInstall"
          class="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition cursor-pointer shadow-xs"
        >
          <span class="material-symbols-rounded text-base">install_mobile</span>
          <span>Baixar App</span>
        </button>

        <NuxtLink
          to="/login"
          class="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-dark)] transition hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
        >
          Entrar
        </NuxtLink>

        <NuxtLink
          to="/cadastro"
          class="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-dark)] dark:shadow-purple-950/50"
        >
          Criar conta
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          class="rounded-lg p-2 text-xl text-zinc-700 dark:text-zinc-200"
          aria-label="Abrir menu"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          ☰
        </button>
      </div>
    </div>

    <div
      v-if="mobileMenuOpen"
      class="border-t border-purple-100 bg-white px-5 py-5 transition-colors lg:hidden dark:border-zinc-800 dark:bg-zinc-900"
    >
      <nav class="flex flex-col gap-4">
        <a
          href="#recursos"
          class="font-medium text-zinc-700 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Recursos
        </a>

        <a
          href="#analise"
          class="font-medium text-zinc-700 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Análise
        </a>

        <a
          href="#redacao"
          class="font-medium text-zinc-700 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Redação
        </a>

        <a
          href="#como-funciona"
          class="font-medium text-zinc-700 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Como funciona
        </a>

        <a
          href="#sobre"
          class="font-medium text-zinc-700 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Sobre
        </a>

        <div class="my-1 border-t border-purple-100 dark:border-zinc-800" />

        <button
          v-if="!isInstalled"
          type="button"
          @click="handleInstall(); closeMenu()"
          class="flex items-center justify-center gap-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-950/60 px-4 py-3 text-center font-bold text-purple-800 dark:text-purple-200 transition"
        >
          <span class="material-symbols-rounded text-lg">install_mobile</span>
          <span>Baixar / Instalar App</span>
        </button>

        <NuxtLink
          to="/login"
          class="font-semibold text-zinc-800 hover:text-purple-600 dark:text-zinc-200 dark:hover:text-purple-400"
          @click="closeMenu"
        >
          Entrar
        </NuxtLink>

        <NuxtLink
          to="/cadastro"
          class="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-center font-semibold text-white shadow-md shadow-purple-600/20"
          @click="closeMenu"
        >
          Criar conta gratuita
        </NuxtLink>
      </nav>
    </div>

    <!-- MODAL DE INSTRUÇÕES DE INSTALAÇÃO DO APP (CASO O NAVEGADOR NÃO ABRA PROMPT NATIVO AUTOMATICAMENTE) -->
    <Teleport to="body">
      <div
        v-if="showInstallModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
        @click.self="showInstallModal = false"
      >
        <div class="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl border border-purple-100 dark:border-zinc-800 space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-zinc-800 p-1">
                <img src="/images/icone mobile.png" alt="App Icon" class="h-full w-full object-contain" />
              </div>
              <div>
                <h3 class="text-sm font-black text-zinc-900 dark:text-white">Instalar Conecta Enem</h3>
                <p class="text-[11px] text-purple-600 dark:text-purple-400 font-bold">App Oficial no seu celular ou PC</p>
              </div>
            </div>
            <button
              type="button"
              @click="showInstallModal = false"
              class="h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 flex items-center justify-center transition cursor-pointer"
            >
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>

          <div class="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p v-if="isIos">
              No seu <strong>iPhone/iPad (Safari)</strong>:
            </p>
            <ol v-if="isIos" class="list-decimal pl-4 space-y-1.5 font-medium">
              <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com seta para cima na barra inferior).</li>
              <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
            </ol>

            <p v-else>
              Para adicionar o aplicativo à sua tela inicial:
            </p>
            <ol v-if="!isIos" class="list-decimal pl-4 space-y-1.5 font-medium">
              <li>No menu do seu navegador (três pontinhos no topo ou barra de endereços).</li>
              <li>Clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
              <li>Pronto! O app será instalado e você permanecerá logado diretamente nele.</li>
            </ol>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              type="button"
              @click="showInstallModal = false"
              class="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>