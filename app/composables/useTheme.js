/**
 * Composable de Gerenciamento de Tema (Modo Claro / Modo Escuro / Sistema)
 * Garante sincronização reativa, persistência em localStorage e compatibilidade SSR.
 */

export function useTheme() {
  const theme = useState('theme_preference', () => 'system')
  const isDark = useState('theme_is_dark', () => false)

  function updateDom(dark) {
    if (import.meta.server) return
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    }
    isDark.value = dark
  }

  function resolveDark(pref) {
    if (pref === 'dark') return true
    if (pref === 'light') return false
    if (import.meta.client) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  function setTheme(newTheme) {
    if (!['light', 'dark', 'system'].includes(newTheme)) return
    theme.value = newTheme
    if (import.meta.client) {
      localStorage.setItem('conecta_theme', newTheme)
      updateDom(resolveDark(newTheme))
    }
  }

  function toggleTheme() {
    // Alterna rapidamente entre claro e escuro
    const next = isDark.value ? 'light' : 'dark'
    setTheme(next)
  }

  // Inicialização e listeners no cliente
  onMounted(() => {
    const saved = localStorage.getItem('conecta_theme') || 'system'
    theme.value = saved
    updateDom(resolveDark(saved))

    // Escuta alterações na preferência do sistema operacional
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e) => {
      if (theme.value === 'system') {
        updateDom(e.matches)
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange)
    } else {
      mediaQuery.addListener(handleSystemChange)
    }
  })

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
}
