<script setup>
// A animação é estritamente para o mobile na abertura do app.
// No desktop (computador), ela permanece desligada (false).
const isVisible = ref(false)
const isLeaving = ref(false)
let dismissTimer

onMounted(() => {
  // 1. Bloqueia em desktop: apenas para dispositivos móveis (telas <= 1024px)
  const isMobile = window.matchMedia('(max-width: 1024px)').matches
  if (!isMobile) return

  // 2. Apenas na abertura inicial do app (uma vez por sessão)
  try {
    if (sessionStorage.getItem('conecta_launch_shown')) return
    sessionStorage.setItem('conecta_launch_shown', 'true')
  } catch {
    // Ignora erro de sessionStorage restrito
  }

  // Ativa a animação de entrada do app no mobile
  isVisible.value = true

  dismissTimer = window.setTimeout(() => {
    isLeaving.value = true
    window.setTimeout(() => {
      isVisible.value = false
    }, 520)
  }, 1800)
})

onBeforeUnmount(() => {
  if (dismissTimer) window.clearTimeout(dismissTimer)
})
</script>

<template>
  <Transition name="app-launch">
    <div
      v-if="isVisible"
      :class="['app-launch-screen', { 'app-launch-screen--leaving': isLeaving }]"
      aria-hidden="true"
    >
      <div class="app-launch-screen__grid" />
      <div class="app-launch-screen__orb app-launch-screen__orb--top" />
      <div class="app-launch-screen__orb app-launch-screen__orb--bottom" />

      <div class="app-launch-screen__content">
        <div class="app-launch-screen__rays">
          <i v-for="ray in 8" :key="ray" :style="{ '--ray': ray }" />
        </div>

        <div class="app-launch-screen__logo-wrap">
          <img src="/images/logo conta.png" alt="" class="app-launch-screen__logo" />
        </div>

        <p class="app-launch-screen__eyebrow">Sua jornada come&ccedil;a aqui</p>
        <h1>Conecta <span>Enem</span></h1>
        <div class="app-launch-screen__loader" role="presentation"><span /></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Garante que em Desktop (computadores e notebooks) NUNCA seja exibido */
@media (min-width: 1025px) {
  .app-launch-screen {
    display: none !important;
  }
}

.app-launch-screen {
  position: fixed;
  z-index: 9999;
  inset: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(150deg, #16063a 0%, #42118a 48%, #721db4 100%);
  isolation: isolate;
}

.app-launch-screen__grid {
  position: absolute;
  inset: -20%;
  opacity: .16;
  background-image: linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px);
  background-size: 32px 32px;
  transform: perspective(380px) rotateX(55deg) translateY(25%);
  mask-image: linear-gradient(to bottom, transparent 8%, black 55%, transparent);
  animation: grid-float 4s ease-in-out infinite;
}

.app-launch-screen__orb {
  position: absolute;
  width: 19rem;
  aspect-ratio: 1;
  border-radius: 50%;
  filter: blur(22px);
  opacity: .66;
  animation: orb-drift 5s ease-in-out infinite alternate;
}

.app-launch-screen__orb--top {
  top: -7rem;
  right: -7rem;
  background: #d8b4fe;
}

.app-launch-screen__orb--bottom {
  bottom: -9rem;
  left: -8rem;
  background: #ec4899;
  animation-delay: -2.5s;
}

.app-launch-screen__content {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(82vw, 22rem);
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.app-launch-screen__rays {
  position: absolute;
  top: 2.75rem;
  width: 14rem;
  height: 14rem;
  animation: rotate-rays 16s linear infinite;
}

.app-launch-screen__rays i {
  position: absolute;
  left: calc(50% - 1px);
  top: 0;
  width: 2px;
  height: 1.3rem;
  border-radius: 99px;
  background: rgba(255,255,255,.5);
  transform: rotate(calc(var(--ray) * 45deg)) translateY(-5.5rem);
  transform-origin: 1px 7rem;
}

.app-launch-screen__logo-wrap {
  position: relative;
  display: grid;
  width: 8.7rem;
  height: 8.7rem;
  place-items: center;
  border: 1px solid rgba(255,255,255,.38);
  border-radius: 2.5rem;
  background: linear-gradient(145deg, rgba(255,255,255,.27), rgba(255,255,255,.08));
  box-shadow: 0 1.4rem 3.7rem rgba(23,4,62,.42), inset 0 1px rgba(255,255,255,.4);
  backdrop-filter: blur(12px);
  animation: logo-arrival .7s cubic-bezier(.2,1.25,.35,1) both, logo-breathe 2.5s 1s ease-in-out infinite;
}

.app-launch-screen__logo {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 8px 10px rgba(31,5,75,.22));
}

.app-launch-screen__eyebrow {
  margin: 2rem 0 .55rem;
  color: #e9d5ff;
  font-size: .67rem;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  animation: text-rise .55s .32s both;
}

h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 850;
  letter-spacing: -.05em;
  text-shadow: 0 3px 18px rgba(27,3,68,.28);
  animation: text-rise .55s .42s both;
}

h1 span {
  color: #f5d0fe;
}

.app-launch-screen__loader {
  width: 7.3rem;
  height: .25rem;
  margin-top: 2rem;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255,255,255,.23);
  animation: text-rise .55s .55s both;
}

.app-launch-screen__loader span {
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  box-shadow: 0 0 12px rgba(255,255,255,.9);
  animation: load-progress 1.35s .6s cubic-bezier(.35,.05,.2,1) both;
}

.app-launch-screen--leaving {
  pointer-events: none;
}

.app-launch-enter-active {
  animation: screen-in .25s ease-out;
}

.app-launch-leave-active {
  animation: screen-out .42s cubic-bezier(.7,0,1,.55) forwards;
}

@keyframes logo-arrival {
  from { opacity: 0; transform: scale(.48) rotate(-10deg); }
  to { opacity: 1; transform: scale(1) rotate(0); }
}

@keyframes logo-breathe {
  50% { transform: translateY(-5px); box-shadow: 0 1.9rem 4rem rgba(23,4,62,.48), inset 0 1px rgba(255,255,255,.4); }
}

@keyframes text-rise {
  from { opacity: 0; transform: translateY(13px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes load-progress {
  from { transform: translateX(-110%); }
  to { transform: translateX(240%); }
}

@keyframes rotate-rays {
  to { transform: rotate(360deg); }
}

@keyframes orb-drift {
  to { transform: translate(1.8rem, 1.3rem) scale(1.12); }
}

@keyframes grid-float {
  50% { transform: perspective(380px) rotateX(55deg) translateY(20%); }
}

@keyframes screen-in {
  from { opacity: 0; }
}

@keyframes screen-out {
  to { opacity: 0; transform: scale(1.04); }
}

@media (prefers-reduced-motion: reduce) {
  .app-launch-screen *,
  .app-launch-enter-active,
  .app-launch-leave-active {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
