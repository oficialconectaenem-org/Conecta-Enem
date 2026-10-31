export default defineNuxtConfig({
  compatibilityDate: '2026-08-09',

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  nitro: {
    compressPublicAssets: true
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  ui: {
    colorMode: false
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/student-theme.css',
    '~/assets/css/admin.css'
  ],

  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'Conecta Enem <onboarding@resend.dev>',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },

  app: {
    head: {
      meta: [
        { name: 'theme-color', content: '#7c3aed' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Conecta Enem' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/icone mobile.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/images/icone mobile.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0,0'
        }
      ]
    }
  }
})
