<template>
  <section class="bg-white py-24 transition-colors duration-200 dark:bg-zinc-950">
    <div class="mx-auto max-w-7xl px-5 lg:px-8">
      <div
        class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] px-6 py-14 text-center text-white shadow-2xl shadow-purple-500/20 sm:px-12 dark:shadow-purple-950/40"
      >
        <div
          class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />

        <div class="relative mx-auto max-w-2xl">
          <h2
            class="text-3xl font-black sm:text-4xl"
          >
            Comece hoje sua preparação para o ENEM.
          </h2>

          <p
            class="mx-auto mt-4 max-w-xl leading-7 text-purple-100"
          >
            Crie sua conta gratuitamente e tenha suas ferramentas
            de estudo reunidas em um único lugar.
          </p>

          <div
            class="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <NuxtLink
              to="/cadastro"
              class="rounded-xl bg-white px-7 py-3.5 font-bold text-[var(--color-primary-dark)] transition hover:bg-purple-50 dark:bg-zinc-900 dark:text-purple-300 dark:hover:bg-zinc-800"
            >
              Criar conta gratuita
            </NuxtLink>

            <NuxtLink
              to="/login"
              class="rounded-xl border border-white/30 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
            >
              Entrar
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>