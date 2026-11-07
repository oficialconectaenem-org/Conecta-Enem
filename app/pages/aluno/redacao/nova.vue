<script setup>
import { useAuthStore } from '~/stores/auth'
import { calculateEssayMetrics } from '#shared/utils/essay-metrics'

definePageMeta({
  layout: 'aluno'
})

useSeoMeta({
  title: 'Nova Redação — Área do Aluno | Conecta Enem'
})

const authStore = useAuthStore()

// Etapas do Fluxo:
// 'THEME_SELECTION' -> Dois botões: Tema livre / Escolher tema
// 'CUSTOM_THEME' -> Digitar tema livre
// 'CATALOG_THEME' -> Lista de propostas
// 'THEME_DETAIL' -> Ver proposta detalhada com textos motivadores I, II e III
// 'FORMAT_SELECTION' -> Dois botões: Escrever / Enviar foto
// 'EDITOR' -> Editor amplo (30 linhas padrão ENEM) com pautas e cronômetro
const currentStep = ref('THEME_SELECTION')
const route = useRoute()

const customTheme = ref('')
const selectedThemeObj = ref(null)
const chosenTheme = ref('')

const submissionMode = ref('TEXT') // 'TEXT' ou 'PHOTO'
const essayTitle = ref('')
const essayText = ref('')
const photoPreview = ref(null)
const photoFile = ref(null)
const isCompressingPhoto = ref(false)

function selectDbTheme(theme) {
  chosenTheme.value = theme.title
  customTheme.value = theme.title
  selectedThemeObj.value = theme
  submissionMode.value = 'TEXT'
  currentStep.value = 'EDITOR'
}

function clearEssay() {
  if (confirm('Deseja realmente limpar os campos da folha de redação?')) {
    essayText.value = ''
    essayTitle.value = ''
    aiResult.value = null
    savedAiEssayId.value = null
    aiErrorMessage.value = ''
  }
}

const selectedClassroom = ref('')
const classrooms = ref([])

// Cronômetro (Timer)
const timerSeconds = ref(0)
const timerRunning = ref(false)
let timerInterval = null

// Ferramentas
const fontSize = ref(15) // em px

const loadingClassrooms = ref(true)
const showMotivatorModal = ref(false)
const showConnectorsDrawer = ref(false)
const errorMessage = ref('')
const submitting = ref(false)
const successSubmitted = ref(false)

const strategicConnectors = [
  {
    category: 'Adição / Continuidade (D1 e D2)',
    items: ['Ademais', 'Outrossim', 'Além disso', 'Somado a isso', 'Paralelamente a isso', 'Vale ressaltar também que']
  },
  {
    category: 'Oposição / Contraponto (Antítese)',
    items: ['No entanto', 'Entretanto', 'Contudo', 'Todavia', 'Por outro lado', 'Em contrapartida', 'Não obstante']
  },
  {
    category: 'Causa e Efeito (Argumentação)',
    items: ['Haja vista que', 'Por conseguinte', 'Dessa forma', 'Em decorrência de', 'Visto que', 'Como consequência']
  },
  {
    category: 'Conclusão & Proposta C5',
    items: ['Portanto', 'Infere-se, pois, que', 'Torna-se imperioso, portanto, que', 'Em suma', 'Desse modo, cabe ao']
  },
  {
    category: 'Conformidade / Repertório',
    items: ['Consoante defende', 'Segundo o pensamento de', 'Sob a ótica de', 'Em consonância com a Constituição']
  }
]

const { data: dbTopicsData } = useLazyFetch('/api/student/redacao/topics')

const suggestedThemes = computed(() => {
  const dbTopics = (dbTopicsData.value?.topics || []).map(t => {
    let motivators = []
    if (t.motivationText) {
      try {
        const parsed = JSON.parse(t.motivationText)
        if (Array.isArray(parsed)) {
          motivators = parsed
        }
      } catch (e) {
        motivators = [{ title: 'Textos Motivadores Propostos', content: t.motivationText }]
      }
    }

    return {
      id: t.id,
      title: t.title,
      category: t.axis || 'Geral',
      instructions: t.description || 'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo.',
      imageUrl: t.imageUrl || null,
      motivators
    }
  })

  return dbTopics
})

// Métricas Unificadas Oficiais do ENEM
const essayMetrics = computed(() => calculateEssayMetrics(essayText.value, essayTitle.value))
const wordCount = computed(() => essayMetrics.value.words)
const phraseCount = computed(() => essayMetrics.value.sentences)
const paragraphCount = computed(() => essayMetrics.value.paragraphs)

// Modo de exibição da folha em dispositivos móveis
// 'A4': Folha oficial com 30 linhas, largura padronizada A4 (700px+) e rolagem horizontal suave
// 'FIT': Modo ajustado à largura da tela do celular para digitação contínua
const mobileViewMode = ref('FIT')

// Medição dinâmica e auto-expansão da folha pautada (36px por linha)
const textareaHeightLines = ref(30)
const currentVisualLines = ref(0)

function autoResizeTextarea() {
  if (typeof document === 'undefined') return
  const textarea = document.querySelector('textarea.enem-ruled-textarea')
  if (!textarea) return

  // Reseta altura temporariamente para medir o scrollHeight real sem travar a rolagem
  textarea.style.height = 'auto'
  const scrollH = textarea.scrollHeight
  const linesNeeded = Math.max(30, Math.ceil(scrollH / 36))
  textareaHeightLines.value = linesNeeded
  textarea.style.height = `${linesNeeded * 36}px`

  if (!essayText.value || !essayText.value.trim()) {
    currentVisualLines.value = 0
  } else {
    currentVisualLines.value = Math.max(1, Math.round(scrollH / 36))
  }
}

function updateVisualLines() {
  autoResizeTextarea()
}

watch([essayText, fontSize, mobileViewMode], () => {
  nextTick(() => {
    autoResizeTextarea()
  })
})

const linesCount = computed(() => {
  // A métrica oficial unificada calibrada (116 caracteres por linha no padrão Glau / INEP)
  // é a autoridade máxima oficial, estável em qualquer dispositivo ou zoom
  const officialLines = essayMetrics.value.lines
  return officialLines
})

const activeLines = computed(() => {
  if (!essayText.value || !essayText.value.trim()) return 0
  return Math.max(linesCount.value, currentVisualLines.value)
})

const editorTotalLines = computed(() => Math.max(30, textareaHeightLines.value, activeLines.value))

// Detecção de linhas em branco vazias entre parágrafos
const blankLinesCount = computed(() => {
  if (!essayText.value) return 0
  const lines = essayText.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  let count = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '' && i < lines.length - 1) {
      count++
    }
  }
  return count
})

function removeLeadingSpaces() {
  if (!essayText.value) return
  essayText.value = essayText.value
    .split('\n')
    .map(l => l.replace(/^[ \t]+/, ''))
    .join('\n')
  formatFeedbackToast.value = 'Espaços no início dos parágrafos removidos!'
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    formatFeedbackToast.value = ''
  }, 4500)
  nextTick(() => {
    updateVisualLines()
  })
}

const formatFeedbackToast = ref('')
let toastTimeout = null

// Formatação Padrão Oficial ENEM:
// 1. Elimina linhas em branco vazias entre parágrafos (economizando linhas contra o limite de 30)
// 2. Remove todos os espaços desnecessários no início das linhas
function formatEnemStandard() {
  if (!essayText.value || !essayText.value.trim()) return

  const normalized = essayText.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (blocks.length === 0) return

  // Remove qualquer espaço no início ou fim dos parágrafos
  const formatted = blocks.map(p => p.replace(/^[\s\t]+/, '').trim()).join('\n')

  essayText.value = formatted
  formatFeedbackToast.value = 'Texto alinhado à margem: linhas vazias e espaços no início foram removidos!'
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    formatFeedbackToast.value = ''
  }, 4500)

  nextTick(() => {
    updateVisualLines()
    const textarea = typeof document !== 'undefined' ? document.querySelector('textarea.enem-ruled-textarea') : null
    if (textarea) {
      textarea.scrollTop = 0
    }
  })
}

const lineStatus = computed(() => {
  const lines = linesCount.value
  if (lines === 0) {
    return {
      count: 0,
      text: '0 / 30 linhas',
      badge: 'Folha em branco',
      class: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700',
      icon: 'edit_note'
    }
  }
  if (lines < 8) {
    return {
      count: lines,
      text: `${lines} / 30 linhas`,
      badge: 'Menos de 8 linhas (Nota Zero no ENEM)',
      class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
      icon: 'warning'
    }
  }
  if (lines <= 30) {
    return {
      count: lines,
      text: `${lines} / 30 linhas`,
      badge: 'Extensão oficial ideal (8 a 30)',
      class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      icon: 'check_circle'
    }
  }
  return {
    count: lines,
    text: `${lines} / 30 linhas`,
    badge: `Ultrapassou limite em ${lines - 30} linha(s)!`,
    class: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
    icon: 'error'
  }
})

// Suporte a recuo de parágrafo oficial ENEM (Tab e tecla Enter natural)
function handleTextareaKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = e.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const indent = '    ' // 4 espaços para recuo de parágrafo oficial ENEM
    essayText.value = essayText.value.substring(0, start) + indent + essayText.value.substring(end)
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + indent.length
      autoResizeTextarea()
    })
    return
  }
}

function handlePaste() {
  nextTick(() => {
    autoResizeTextarea()
  })
}

function insertParagraphIndent() {
  const textarea = typeof document !== 'undefined' ? document.querySelector('textarea.enem-ruled-textarea') : null
  const indent = '    '
  if (textarea) {
    const start = textarea.selectionStart ?? essayText.value.length
    const end = textarea.selectionEnd ?? essayText.value.length
    const before = essayText.value.substring(0, start)
    const after = essayText.value.substring(end)
    const needsNewline = before.length > 0 && !before.endsWith('\n')
    const insertion = (needsNewline ? '\n' : '') + indent
    essayText.value = before + insertion + after
    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length
      autoResizeTextarea()
    })
  } else {
    const needsNewline = essayText.value.length > 0 && !essayText.value.endsWith('\n')
    essayText.value += (needsNewline ? '\n' : '') + indent
    nextTick(() => {
      autoResizeTextarea()
    })
  }
}

// Visualização no Editor: 'WRITE' ou 'AI_FEEDBACK'
const editorViewMode = ref('WRITE')
const isAnalyzingAI = ref(false)
const aiAnalysisStep = ref(0)
const aiResult = ref(null)
const aiErrorMessage = ref('')
const copiedAiReport = ref(false)
const saveAiToHistory = ref(true)
const savedAiEssayId = ref(null)

// Reconexão automática em caso de sobrecarga temporária da IA do Google
const autoRetryCountdown = ref(0)
let autoRetryTimer = null

function cancelAutoRetry() {
  if (autoRetryTimer) {
    clearInterval(autoRetryTimer)
    autoRetryTimer = null
  }
  autoRetryCountdown.value = 0
}

const detailedAiSteps = [
  { id: 'start', title: 'Calibrando Matriz INEP 2026', icon: 'auto_awesome', desc: 'Carregando critérios oficiais do manual do corretor' },
  { id: 'c1', title: 'C1: Sintaxe & Gramática', icon: 'spellcheck', desc: 'Auditando truncamentos, justaposições e desvios formais' },
  { id: 'c2', title: 'C2: Tema & Repertório Sociocultural', icon: 'menu_book', desc: 'Verificando se o repertório é legitimado, pertinente e produtivo' },
  { id: 'c3', title: 'C3: Projeto de Texto & Autoria', icon: 'architecture', desc: 'Investigando lacunas argumentativas e coerência da tese' },
  { id: 'c4', title: 'C4: Conectivos & Mecanismos Coesivos', icon: 'link', desc: 'Auditando operadores interparágrafos obrigatórios e repetições' },
  { id: 'c5', title: 'C5: 5 Elementos da Proposta de Intervenção', icon: 'fact_check', desc: 'Contabilizando Agente, Ação, Meio, Efeito e Detalhamento (40 pts cada)' },
  { id: 'final', title: 'Gerando Reescrita Pedagógica Nota 1000', icon: 'star', desc: 'Reescrevendo parágrafo fraco e consolidando nota final' }
]

const aiSteps = detailedAiSteps.map(s => s.title)

const enemTips = [
  { title: 'Regra Oficial da C1', text: 'No ENEM, cometer 3 desvios já derruba a nota de 200 para 160 na C1. Revise sempre vírgulas, crases e concordância!' },
  { title: 'Repertório Nota 1000 na C2', text: 'Para o repertório valer 200 pontos, ele precisa ser Legitimado por área do saber, Pertinente ao tema E Produtivo na defesa da sua tese.' },
  { title: 'Cuidado com Lacunas na C3', text: 'Nunca faça uma afirmação sem explicar o porquê dela acontecer e qual é a sua consequência prática. Isso evita perda de pontos por lacuna.' },
  { title: 'Operadores Interparágrafos na C4', text: 'É obrigatório iniciar pelo menos 2 parágrafos com conectivos interparágrafos expressivos (como "Ademais" no D2 e "Portanto" na Conclusão).' },
  { title: 'Os 5 Elementos da C5 (200 pts)', text: 'A nota da C5 é puramente matemática: Agente (40), Ação (40), Meio/Modo (40), Efeito (40) e Detalhamento (40) somam os 200 pontos!' }
]

const currentTipIndex = ref(0)
let tipInterval = null
const activeHighlightFilter = ref('ALL') // 'ALL', 'C1', 'C2', 'C3', 'C4', 'C5'
let aiStepInterval = null

async function correctWithAi() {
  cancelAutoRetry()
  aiErrorMessage.value = ''

  if (submissionMode.value === 'PHOTO') {
    aiErrorMessage.value = 'A correção por IA está disponível para redações digitadas no editor. Para fotos, envie diretamente ao professor.'
    return
  }

  // 2. Validação rigorosa de extensão: ENEM anula produções com menos de 7 linhas / menos de 70 palavras
  const currentWords = wordCount.value
  if (!essayText.value.trim() || currentWords < 70) {
    aiErrorMessage.value = `Sua redação possui apenas ${currentWords} palavra(s). O ENEM exige no mínimo 7 linhas (pelo menos 70 palavras). Redações abaixo dessa extensão são consideradas insuficientes e recebem nota zero.`
    return
  }

  if (!chosenTheme.value.trim()) {
    aiErrorMessage.value = 'Por favor, defina o tema da redação.'
    return
  }

  isAnalyzingAI.value = true
  aiAnalysisStep.value = 0
  currentTipIndex.value = 0
  editorViewMode.value = 'AI_FEEDBACK'

  aiStepInterval = setInterval(() => {
    if (aiAnalysisStep.value < detailedAiSteps.length - 1) {
      aiAnalysisStep.value++
    }
  }, 1400)

  tipInterval = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % enemTips.length
  }, 3500)

  try {
    const res = await $fetch('/api/ai/corrigir-redacao', {
      method: 'POST',
      body: {
        theme: chosenTheme.value.trim(),
        title: essayTitle.value.trim() || null,
        text: essayText.value.trim(),
        saveToHistory: saveAiToHistory.value
      }
    })

    if (res?.success && res.correction) {
      cancelAutoRetry()
      aiResult.value = res.correction
      savedAiEssayId.value = res.savedEssayId || null
    } else {
      aiErrorMessage.value = 'Não foi possível obter a correção no momento. Tente novamente.'
    }
  } catch (err) {
    console.error('Erro na correção com IA:', err)
    const rawMsg = err.data?.statusMessage || err.message || 'Erro ao conectar com o serviço de IA.'
    aiErrorMessage.value = rawMsg

    // Se for sobrecarga temporária da API do Google, inicia reconexão automática com contagem regressiva
    const isDemandSpike = /alta demanda|high demand|spikes in demand|temporar|503|Resource has been exhausted/i.test(rawMsg)
    if (isDemandSpike) {
      cancelAutoRetry()
      autoRetryCountdown.value = 4
      autoRetryTimer = setInterval(() => {
        if (autoRetryCountdown.value > 1) {
          autoRetryCountdown.value--
        } else {
          cancelAutoRetry()
          correctWithAi()
        }
      }, 1000)
    }
  } finally {
    if (aiStepInterval) clearInterval(aiStepInterval)
    if (tipInterval) clearInterval(tipInterval)
    isAnalyzingAI.value = false
  }
}

function copyAiReport() {
  if (!aiResult.value) return
  const r = aiResult.value
  const text = `=== CORREÇÃO ENEM IA (CONECTA ENEM) ===
TEMA: ${chosenTheme.value}
${essayTitle.value ? `TÍTULO: ${essayTitle.value}\n` : ''}
NOTA TOTAL: ${r.totalScore} / 1000

--- COMPETÊNCIAS ---
C1 (Norma Culta): ${r.c1Score}/200 - ${r.competencies.c1.feedback}
C2 (Tema e Repertório): ${r.c2Score}/200 - ${r.competencies.c2.feedback}
C3 (Argumentação): ${r.c3Score}/200 - ${r.competencies.c3.feedback}
C4 (Coesão): ${r.c4Score}/200 - ${r.competencies.c4.feedback}
C5 (Intervenção): ${r.c5Score}/200 - ${r.competencies.c5.feedback}

PARECER GERAL:
${r.generalFeedback}`

  navigator.clipboard.writeText(text).then(() => {
    copiedAiReport.value = true
    setTimeout(() => {
      copiedAiReport.value = false
    }, 2500)
  })
}

function getAiScoreBadge(score) {
  if (score >= 900) return { label: 'Excelente (Nota 1000 à vista!)', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-500' }
  if (score >= 800) return { label: 'Muito Bom (Nível Competitivo)', color: 'from-blue-500 to-indigo-600', text: 'text-blue-500' }
  if (score >= 640) return { label: 'Bom (Com potencial de evolução)', color: 'from-purple-500 to-pink-600', text: 'text-purple-500' }
  if (score >= 500) return { label: 'Mediano (Atenção às competências)', color: 'from-amber-500 to-orange-600', text: 'text-amber-500' }
  return { label: 'Necessita Reformulação Urgente', color: 'from-rose-500 to-red-600', text: 'text-rose-500' }
}

// Cronômetro Formatado
const formattedTimer = computed(() => {
  const hours = Math.floor(timerSeconds.value / 3600)
  const minutes = Math.floor((timerSeconds.value % 3600) / 60)
  const seconds = timerSeconds.value % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

function toggleTimer() {
  if (timerRunning.value) {
    clearInterval(timerInterval)
    timerRunning.value = false
  } else {
    timerRunning.value = true
    timerInterval = setInterval(() => {
      timerSeconds.value++
    }, 1000)
  }
}

function resetTimer() {
  clearInterval(timerInterval)
  timerRunning.value = false
  timerSeconds.value = 0
}

function toggleFontSize() {
  if (fontSize.value === 14) fontSize.value = 15
  else if (fontSize.value === 15) fontSize.value = 16
  else if (fontSize.value === 16) fontSize.value = 17
  else fontSize.value = 14
}

async function fetchClassrooms() {
  loadingClassrooms.value = true
  try {
    const res = await $fetch('/api/student/classrooms', { credentials: 'include' })
    if (res?.classrooms) {
      classrooms.value = res.classrooms
      if (classrooms.value.length > 0) {
        selectedClassroom.value = classrooms.value[0].id
      }
    }
  } catch (err) {
    console.error('Erro ao buscar turmas', err)
  } finally {
    loadingClassrooms.value = false
  }
}

function rotatePhoto() {
  if (!photoPreview.value || isCompressingPhoto.value) return
  isCompressingPhoto.value = true
  const img = new Image()
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      photoPreview.value = canvas.toDataURL('image/jpeg', 0.75)
    } catch (e) {
      console.warn('Falha ao girar foto:', e)
    } finally {
      isCompressingPhoto.value = false
    }
  }
  img.onerror = () => {
    isCompressingPhoto.value = false
  }
  img.src = photoPreview.value
}

function compressImageFile(file, maxWidth = 2048, maxHeight = 2800, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo no dispositivo.'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato da imagem não suportado para processamento.'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Fundo branco sólido para garantir contraste
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        let compressedBase64 = canvas.toDataURL('image/jpeg', quality)

        // Se por ventura a imagem ainda for muito pesada (> 1.8MB base64), segunda passagem
        if (compressedBase64.length > 1_800_000) {
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.72)
        }

        resolve(compressedBase64)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Por favor, envie um arquivo de imagem válido (JPG, PNG ou foto da câmera).'
    return
  }

  errorMessage.value = ''
  photoFile.value = file
  isCompressingPhoto.value = true

  try {
    const compressed = await compressImageFile(file)
    photoPreview.value = compressed
  } catch (err) {
    console.warn('[Redação Foto] Falha na compressão via Canvas:', err)
    if (file.size <= 2.5 * 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = (e) => {
        photoPreview.value = e.target.result
      }
      reader.readAsDataURL(file)
    } else {
      errorMessage.value = 'A foto selecionada é muito pesada (acima de 2.5MB) e não pôde ser comprimida. Por favor, tire uma nova foto com resolução padrão.'
      photoPreview.value = null
      photoFile.value = null
    }
  } finally {
    isCompressingPhoto.value = false
    if (event.target) event.target.value = ''
  }
}

function removePhoto() {
  photoPreview.value = null
  photoFile.value = null
  errorMessage.value = ''
}

function selectCustomThemeFlow() {
  errorMessage.value = ''
  currentStep.value = 'CUSTOM_THEME'
}

function selectCatalogThemeFlow() {
  errorMessage.value = ''
  currentStep.value = 'CATALOG_THEME'
}

function confirmCustomTheme() {
  errorMessage.value = ''
  if (!customTheme.value.trim()) {
    errorMessage.value = 'Por favor, digite o tema da sua redação.'
    return
  }
  chosenTheme.value = customTheme.value.trim()
  selectedThemeObj.value = null
  currentStep.value = 'FORMAT_SELECTION'
}

// Geração de Tema Aleatório por Inteligência Artificial (Mesma API e motor do Corretor)
const isGeneratingAiTheme = ref(false)
const selectedAiAxis = ref('ALEATORIO')
const aiThemeError = ref('')

const availableAiAxes = [
  { id: 'ALEATORIO', label: '🎲 Surpreenda-me' },
  { id: 'Sociedade e Cidadania', label: '👥 Sociedade' },
  { id: 'Ciência e Tecnologia', label: '💻 Tecnologia' },
  { id: 'Meio Ambiente e Sustentabilidade', label: '🌿 Meio Ambiente' },
  { id: 'Saúde Pública e Mental', label: '🩺 Saúde' },
  { id: 'Educação e Cultura', label: '📚 Educação' },
  { id: 'Direitos Humanos', label: '⚖️ Direitos Humanos' }
]

async function generateRandomAiTheme(customAxis) {
  aiThemeError.value = ''
  isGeneratingAiTheme.value = true
  const targetAxis = customAxis || selectedAiAxis.value

  try {
    const res = await $fetch('/api/ai/gerar-tema', {
      method: 'POST',
      body: {
        axis: targetAxis === 'ALEATORIO' ? null : targetAxis,
        saveToDb: true
      }
    })

    if (res?.success && res.theme) {
      const t = res.theme
      selectedThemeObj.value = {
        id: t.id || `ai-theme-${Date.now()}`,
        title: t.title,
        category: t.axis || 'Geral',
        instructions: t.description || 'A partir da leitura dos textos motivadores e com base nos conhecimentos construídos ao longo de sua formação, redija um texto dissertativo-argumentativo.',
        imageUrl: null,
        motivators: t.motivators || [],
        hints: t.hints || null,
        isAiGenerated: true
      }
      chosenTheme.value = t.title
      currentStep.value = 'THEME_DETAIL'
    } else if (suggestedThemes.value?.length > 0) {
      // Fallback gracioso para tema do banco em caso de sobrecarga da IA
      const fallback = suggestedThemes.value[Math.floor(Math.random() * suggestedThemes.value.length)]
      openThemeDetail(fallback)
    } else {
      aiThemeError.value = 'Não foi possível gerar um tema no momento. Tente novamente.'
    }
  } catch (err) {
    console.error('Erro ao gerar tema com IA:', err)
    if (suggestedThemes.value?.length > 0) {
      // Fallback resiliente imediato: se a IA falhar ou sofrer alta demanda, sorteia do acervo
      const fallback = suggestedThemes.value[Math.floor(Math.random() * suggestedThemes.value.length)]
      openThemeDetail(fallback)
    } else {
      aiThemeError.value = err.data?.statusMessage || err.message || 'Falha ao conectar com o serviço de IA para gerar tema.'
    }
  } finally {
    isGeneratingAiTheme.value = false
  }
}

// Ao clicar em uma proposta, abre a tela de detalhes com os TEXTOS MOTIVADORES
function openThemeDetail(theme) {
  selectedThemeObj.value = theme
  chosenTheme.value = theme.title
  currentStep.value = 'THEME_DETAIL'
}

function proceedToFormatFromDetail() {
  currentStep.value = 'FORMAT_SELECTION'
}

function chooseFormat(mode) {
  submissionMode.value = mode
  currentStep.value = 'EDITOR'

  // Iniciar cronômetro automaticamente se ainda não estiver ativo
  if (!timerRunning.value && timerSeconds.value === 0) {
    timerRunning.value = true
    timerInterval = setInterval(() => {
      timerSeconds.value++
    }, 1000)
  }
}

const showDestinationModal = ref(false)
const selectedSubmissionClassroom = ref('')

function openSubmitModal() {
  errorMessage.value = ''

  if (!chosenTheme.value || chosenTheme.value.trim().length < 3) {
    errorMessage.value = 'Por favor, defina o tema da redação antes de enviar.'
    return
  }

  if (isCompressingPhoto.value) {
    errorMessage.value = 'A foto ainda está sendo processada. Aguarde alguns instantes.'
    return
  }

  if (submissionMode.value === 'TEXT' && (!essayText.value || essayText.value.trim().length < 20)) {
    errorMessage.value = 'Por favor, escreva pelo menos 20 caracteres da sua redação antes de enviar.'
    return
  }

  if (submissionMode.value === 'PHOTO' && !photoPreview.value) {
    errorMessage.value = 'Por favor, carregue a foto da redação antes de enviar.'
    return
  }

  // Se tiver turmas e nenhuma estiver pré-selecionada, define a primeira como padrão
  if (classrooms.value.length > 0 && !selectedSubmissionClassroom.value) {
    selectedSubmissionClassroom.value = classrooms.value[0].id
  }

  showDestinationModal.value = true
}

async function confirmAndSubmit() {
  errorMessage.value = ''

  if (!chosenTheme.value || chosenTheme.value.trim().length < 3) {
    errorMessage.value = 'Por favor, defina um tema válido (mínimo 3 caracteres) antes de enviar.'
    return
  }

  if (submissionMode.value === 'PHOTO' && !photoPreview.value) {
    errorMessage.value = 'Por favor, selecione a foto da folha antes de enviar.'
    return
  }

  if (submissionMode.value === 'TEXT' && (!essayText.value || essayText.value.trim().length < 20)) {
    errorMessage.value = 'O texto da redação deve possuir pelo menos 20 caracteres.'
    return
  }

  submitting.value = true

  try {
    const payload = {
      theme: chosenTheme.value.trim(),
      title: essayTitle.value.trim() || null,
      classroomId: selectedSubmissionClassroom.value || null,
      submissionType: submissionMode.value === 'PHOTO' ? 'IMAGE' : 'TEXT',
      content: submissionMode.value === 'TEXT' ? essayText.value : null,
      imageUrl: submissionMode.value === 'PHOTO' ? photoPreview.value : null
    }

    const res = await $fetch('/api/student/essays', {
      method: 'POST',
      credentials: 'include',
      body: payload
    })

    if (res?.success) {
      if (timerInterval) clearInterval(timerInterval)
      timerRunning.value = false
      showDestinationModal.value = false
      successSubmitted.value = true
    }
  } catch (err) {
    console.error('Erro ao enviar redação:', err)
    errorMessage.value =
      err.data?.statusMessage ||
      err.data?.message ||
      err.statusMessage ||
      err.message ||
      'Erro ao enviar a redação. Verifique sua conexão e tente novamente.'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchClassrooms()
  if (route.query.mode === 'ia') {
    if (!chosenTheme.value && suggestedThemes.value?.length > 0) {
      selectDbTheme(suggestedThemes.value[0])
    }
    submissionMode.value = 'TEXT'
    currentStep.value = 'EDITOR'
  }
  nextTick(() => {
    updateVisualLines()
  })
  window.addEventListener('resize', updateVisualLines)
})

onUnmounted(() => {
  cancelAutoRetry()
  if (timerInterval) clearInterval(timerInterval)
  if (aiStepInterval) clearInterval(aiStepInterval)
  if (tipInterval) clearInterval(tipInterval)
  window.removeEventListener('resize', updateVisualLines)
  const mirror = document.getElementById('enem-text-measurer')
  if (mirror) mirror.remove()
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6 space-y-4 font-sans">
    <!-- MODAL DE CONFIRMAÇÃO DE ENVIO PARA O PROFESSOR -->
    <div
      v-if="showDestinationModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      @click.self="showDestinationModal = false"
    >
      <div class="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-purple-600 text-2xl">send</span>
            <h3 class="text-base font-black text-slate-900">Enviar Redação</h3>
          </div>
          <button
            type="button"
            @click="showDestinationModal = false"
            class="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- SE O ALUNO TIVER TURMAS -->
        <div v-if="classrooms.length > 0" class="space-y-3">
          <p class="text-xs text-slate-600">
            Sua redação será encaminhada para o seu professor avaliar:
          </p>

          <div class="rounded-2xl border-2 border-purple-600 bg-purple-50/50 p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mt-0.5">
                <span class="material-symbols-rounded text-xl">school</span>
              </div>
              <div class="space-y-0.5 min-w-0">
                <h4 class="text-xs sm:text-sm font-black text-slate-900">Enviar para meu Professor</h4>
                <p class="text-[11px] text-slate-500 leading-snug">
                  O professor da turma receberá a redação para correção com notas ENEM e feedback.
                </p>
              </div>
            </div>

            <div class="pt-2 border-t border-purple-200/60 space-y-1.5">
              <label class="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                Selecione a Turma:
              </label>
              <select
                v-model="selectedSubmissionClassroom"
                class="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-600/30"
              >
                <option v-for="c in classrooms" :key="c.id" :value="c.id">
                  {{ c.name }} (Prof. {{ c.teacherName || 'Responsável' }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- SE O ALUNO NÃO TIVER TURMAS -->
        <div v-else class="space-y-3">
          <div class="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 space-y-2 text-left">
            <div class="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <span class="material-symbols-rounded text-base">info</span>
              <span>Você ainda não está em uma turma</span>
            </div>
            <p class="text-xs text-amber-700 leading-relaxed">
              Sua redação será salva no seu histórico pessoal. Para que um professor corrija suas produções, entre em uma turma através do link de convite fornecido pelo seu professor.
            </p>
          </div>
        </div>

        <!-- ALERTA DE ERRO DENTRO DO MODAL -->
        <div v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-start gap-2.5 animate-in fade-in">
          <span class="material-symbols-rounded text-rose-600 text-lg shrink-0 mt-0.5">error</span>
          <div class="space-y-0.5">
            <span class="font-black block">Não foi possível enviar:</span>
            <span class="font-medium text-rose-600 leading-snug">{{ errorMessage }}</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="showDestinationModal = false"
            class="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            :disabled="submitting || isCompressingPhoto"
            @click="confirmAndSubmit"
            class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
          >
            <span v-if="submitting" class="material-symbols-rounded animate-spin text-xs">progress_activity</span>
            <span>Confirmar Envio</span>
            <span v-if="!submitting" class="material-symbols-rounded text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE TEXTOS MOTIVADORES (QUANDO CLICADO EM 'VER TEMA' NO EDITOR) -->
    <div
      v-if="showMotivatorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      @click.self="showMotivatorModal = false"
    >
      <div class="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-purple-600">article</span>
            <h3 class="text-base font-black text-slate-900">Proposta de Redação</h3>
          </div>
          <button
            type="button"
            @click="showMotivatorModal = false"
            class="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <div class="rounded-2xl bg-purple-50 p-4 border border-purple-100">
          <span class="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Tema:</span>
          <h4 class="text-sm font-black text-slate-900 mt-1">{{ chosenTheme }}</h4>
        </div>

        <div v-if="selectedThemeObj?.motivators?.length" class="space-y-4">
          <p class="text-xs text-slate-600 italic">
            {{ selectedThemeObj.instructions }}
          </p>

          <div
            v-for="(mot, idx) in selectedThemeObj.motivators"
            :key="idx"
            class="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 p-4 space-y-1.5"
          >
            <span class="text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide">{{ mot.title }}</span>
            <p class="text-xs leading-relaxed text-slate-700 dark:text-zinc-300 text-justify whitespace-pre-line">{{ mot.content }}</p>
            <p v-if="mot.source" class="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 italic pt-1 border-t border-slate-200/60 dark:border-zinc-700/60">
              {{ mot.source }}
            </p>
          </div>

          <!-- Dicas da IA caso tema tenha sido gerado -->
          <div v-if="selectedThemeObj?.hints" class="rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
            <span class="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
              💡 Repertórios Sugeridos:
            </span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="(rep, ri) in selectedThemeObj.hints.repertorySuggestions"
                :key="ri"
                class="rounded bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-[10px] font-medium text-purple-800 dark:text-purple-200"
              >
                {{ rep }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="py-4 text-center text-xs text-slate-500">
          Este tema foi definido livremente por você. Continue desenvolvendo seus argumentos!
        </div>

        <div class="pt-2 flex justify-end">
          <button
            type="button"
            @click="showMotivatorModal = false"
            class="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition"
          >
            Voltar para a Redação
          </button>
        </div>
      </div>
    </div>

    <!-- TELA DE SUCESSO -->
    <div
      v-if="successSubmitted"
      class="rounded-3xl border border-purple-100 bg-white p-8 sm:p-12 text-center shadow-xl shadow-purple-500/5 space-y-4 max-w-xl mx-auto"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-purple-600">
        <span class="material-symbols-rounded text-3xl">check_circle</span>
      </div>
      <h2 class="text-2xl font-black text-slate-900">Redação Enviada com Sucesso!</h2>
      
      <!-- Tempo gasto pelo aluno -->
      <div class="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-4 py-1.5 text-xs font-bold text-purple-800">
        <span class="material-symbols-rounded text-base">timer</span>
        <span>Tempo total de produção: <strong>{{ formattedTimer }}</strong></span>
      </div>

      <p class="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
        <span v-if="selectedSubmissionClassroom">
          Sua redação foi encaminhada com sucesso para o seu <strong>Professor</strong>. Você receberá a nota e os comentários assim que ela for corrigida!
        </span>
        <span v-else>
          Sua redação foi salva no seu histórico com sucesso. Você pode acompanhar todas as suas produções na aba Minhas Redações.
        </span>
      </p>

      <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <NuxtLink
          to="/aluno/redacao/minhas"
          class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
        >
          <span class="material-symbols-rounded text-base">description</span>
          <span>Ver Minhas Redações</span>
        </NuxtLink>

        <NuxtLink
          to="/aluno/redacao"
          class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <span>Voltar ao Menu</span>
        </NuxtLink>
      </div>
    </div>

    <div v-else>
      <!-- ============================================================== -->
      <!-- ETAPA 1: MENU COM DOIS BOTÕES (TEMA LIVRE / ESCOLHER TEMA) -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'THEME_SELECTION'" class="max-w-xl mx-auto space-y-5">
        <div class="flex items-center justify-between">
          <NuxtLink
            to="/aluno/redacao"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar</span>
          </NuxtLink>
        </div>

        <div>
          <h1 class="text-2xl font-black text-[var(--student-text)] tracking-tight">
            Como você quer definir o tema?
          </h1>
          <p class="mt-1 text-xs text-[var(--student-text-secondary)]">
            Escolha se deseja selecionar um tema vindo do banco de dados ou escrever sobre um tema livre.
          </p>
        </div>

        <!-- Opções de Definição de Tema -->
        <div class="space-y-4">
          <!-- Opção 1 (DESTAQUE MÁXIMO): Tema Aleatório Gerado por IA -->
          <div class="relative overflow-hidden rounded-2xl border-2 border-purple-500/80 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-5 space-y-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30">
                  <span class="material-symbols-rounded text-2xl">auto_awesome</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-black text-[var(--student-text)]">
                      Tema Aleatório com IA
                    </h3>
                    <span class="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      Padrão Oficial ENEM
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-[var(--student-text-secondary)]">
                    A IA formula uma proposta temática inédita e contemporânea completa, com textos motivadores I, II e III autênticos.
                  </p>
                </div>
              </div>
            </div>

            <!-- Filtros Rápidos de Eixo Temático -->
            <div class="space-y-2 pt-2 border-t border-[var(--student-border)]">
              <span class="text-[11px] font-bold text-[var(--student-text-secondary)] uppercase tracking-wider block">
                Escolha o Eixo ou Deixe a IA Decidir:
              </span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="axis in availableAiAxes"
                  :key="axis.id"
                  type="button"
                  @click="selectedAiAxis = axis.id"
                  :class="selectedAiAxis === axis.id
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white/80 dark:bg-zinc-800/80 text-[var(--student-text)] border-slate-200 dark:border-zinc-700 hover:border-purple-400'"
                  class="rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  {{ axis.label }}
                </button>
              </div>
            </div>

            <!-- Botão de Ação para Sortear com IA -->
            <div class="pt-1 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                @click="generateRandomAiTheme()"
                :disabled="isGeneratingAiTheme"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 text-xs font-black uppercase tracking-wider shadow-md shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <span v-if="isGeneratingAiTheme" class="material-symbols-rounded text-base animate-spin">progress_activity</span>
                <span v-else class="material-symbols-rounded text-base">casino</span>
                <span>{{ isGeneratingAiTheme ? 'Gerando Proposta Inédita com IA...' : 'Sortear Tema Agora com IA' }}</span>
              </button>

              <span v-if="aiThemeError" class="text-xs font-bold text-red-500">
                {{ aiThemeError }}
              </span>
            </div>
          </div>

          <!-- Opção 2: Tema do Banco de Dados -->
          <div class="rounded-2xl border-2 border-purple-200 dark:border-purple-800/80 bg-[var(--student-card)] p-4 sm:p-5 space-y-4 shadow-xs overflow-hidden min-w-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3.5 min-w-0">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <span class="material-symbols-rounded text-2xl">database</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-base font-black text-[var(--student-text)]">
                      Tema do Banco de Dados
                    </h3>
                    <span class="rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-[10px] font-black uppercase shrink-0">
                      {{ suggestedThemes.length }} no banco
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-[var(--student-text-secondary)]">
                    Propostas completas com textos motivadores I, II e III cadastradas no sistema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                @click="selectCatalogThemeFlow"
                class="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer shrink-0"
              >
                <span>Ver todas</span>
                <span class="material-symbols-rounded text-base">arrow_forward</span>
              </button>
            </div>

            <!-- Lista Dinâmica de Temas do Banco para seleção rápida -->
            <div v-if="suggestedThemes.length > 0" class="space-y-2 pt-1 border-t border-[var(--student-border)]">
              <span class="text-[11px] font-bold text-[var(--student-text-secondary)] uppercase tracking-wider block">
                Selecione uma proposta do banco para praticar:
              </span>
              <div class="flex flex-col gap-2.5 w-full min-w-0">
                <button
                  type="button"
                  @click="generateRandomAiTheme()"
                  :disabled="isGeneratingAiTheme"
                  class="group w-full max-w-full rounded-2xl border-2 border-dashed border-purple-400 dark:border-purple-600 bg-purple-100/60 dark:bg-purple-950/40 p-3 sm:px-4 sm:py-3.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition text-left cursor-pointer shadow-2xs flex items-center justify-between gap-3 min-w-0 disabled:opacity-50"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span class="material-symbols-rounded text-base text-purple-600 dark:text-purple-400 group-hover:text-white shrink-0" :class="{ 'animate-spin': isGeneratingAiTheme }">
                      {{ isGeneratingAiTheme ? 'progress_activity' : 'auto_awesome' }}
                    </span>
                    <span class="font-black text-xs sm:text-sm min-w-0 flex-1">
                      {{ isGeneratingAiTheme ? 'Gerando Proposta Inédita com IA...' : 'Sortear Tema com IA' }}
                    </span>
                  </div>
                  <span class="material-symbols-rounded text-base opacity-60 group-hover:opacity-100 shrink-0">casino</span>
                </button>

                <button
                  v-for="theme in suggestedThemes"
                  :key="theme.id"
                  type="button"
                  @click="openThemeDetail(theme)"
                  :title="theme.title"
                  class="group w-full max-w-full rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-zinc-800/80 p-3 sm:px-4 sm:py-3 text-left transition hover:border-purple-600 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white cursor-pointer shadow-2xs flex items-center justify-between gap-3 min-w-0"
                >
                  <div class="flex items-start gap-2.5 min-w-0 flex-1">
                    <span class="material-symbols-rounded text-base text-purple-600 dark:text-purple-400 group-hover:text-white shrink-0 mt-0.5">article</span>
                    <div class="min-w-0 flex-1 space-y-1">
                      <span v-if="theme.category || theme.axis" class="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 group-hover:bg-white/20 group-hover:text-white">
                        {{ theme.category || theme.axis }}
                      </span>
                      <p class="text-xs sm:text-sm font-bold text-[var(--student-text)] group-hover:text-white leading-snug break-words whitespace-normal">
                        {{ theme.title }}
                      </p>
                    </div>
                  </div>
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100/70 dark:bg-zinc-700/60 text-purple-700 dark:text-purple-300 group-hover:bg-white/20 group-hover:text-white transition">
                    <span class="material-symbols-rounded text-base">arrow_forward</span>
                  </div>
                </button>
              </div>
            </div>

            <div v-else class="py-2 text-center text-xs text-[var(--student-text-secondary)]">
              Nenhum tema cadastrado no banco no momento. Você pode usar a opção de Tema com IA ou Tema Livre abaixo!
            </div>
          </div>

          <!-- Opção 3: Tema livre -->
          <button
            type="button"
            @click="selectCustomThemeFlow"
            class="group w-full flex items-center justify-between gap-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--student-primary-solid)] hover:shadow-md cursor-pointer"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] transition group-hover:scale-105 group-hover:bg-[var(--student-primary-solid)] group-hover:text-white">
                <span class="material-symbols-rounded text-2xl">edit_note</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-[var(--student-text)] transition group-hover:text-[var(--student-primary-text)]">
                    Tema Livre
                  </h3>
                  <span class="rounded-full bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 text-[10px] font-black uppercase">
                    Personalizado
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-[var(--student-text-secondary)]">
                  Digite qualquer proposta temática da sua escolha para praticar e desenvolver sua redação.
                </p>
              </div>
            </div>
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--student-text-muted)] transition group-hover:text-[var(--student-primary-text)] group-hover:translate-x-1">
              <span class="material-symbols-rounded text-2xl">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- TELA 1.1: DIGITAR TEMA LIVRE -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'CUSTOM_THEME'" class="max-w-xl mx-auto space-y-5">
        <div>
          <h1 class="text-2xl font-black text-[var(--student-text)] tracking-tight">
            Digite o seu Tema Livre
          </h1>
          <p class="mt-1 text-xs text-[var(--student-text-secondary)]">
            Insira a proposta temática completa da redação.
          </p>
        </div>

        <div class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 space-y-3">
          <textarea
            v-model="customTheme"
            rows="4"
            placeholder="Ex: O papel das energias renováveis na transição socioecológica do Brasil..."
            class="w-full rounded-2xl border border-[var(--student-border)] bg-[var(--student-surface)] p-4 text-sm text-[var(--student-text)] outline-none focus:border-[var(--student-primary-solid)] focus:ring-2 focus:ring-purple-600/20 transition resize-none"
          ></textarea>

          <p v-if="errorMessage" class="text-xs font-bold text-red-500">
            {{ errorMessage }}
          </p>


        </div>

        <div class="flex items-center justify-between pt-2">
          <button
            type="button"
            @click="currentStep = 'THEME_SELECTION'"
            class="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar</span>
          </button>

          <button
            type="button"
            @click="confirmCustomTheme"
            class="inline-flex items-center gap-2 rounded-2xl bg-[var(--student-primary-solid)] px-6 py-3 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition"
          >
            <span>Avançar para Formato</span>
            <span class="material-symbols-rounded text-base">arrow_forward</span>
          </button>
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- TELA 1.2: ESCOLHER DA LISTA DE TEMAS -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'CATALOG_THEME'" class="max-w-xl mx-auto space-y-5">
        <div>
          <h1 class="text-2xl font-black text-[var(--student-text)] tracking-tight">
            Temas do Banco de Dados
          </h1>
          <p class="mt-1 text-xs text-[var(--student-text-secondary)]">
            Clique no tema para ler os textos motivadores antes de começar a escrever.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="theme in suggestedThemes"
            :key="theme.id"
            @click="openThemeDetail(theme)"
            class="group rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-4 transition hover:border-[var(--student-primary-solid)] hover:shadow-md cursor-pointer flex items-center justify-between gap-4"
          >
            <div class="space-y-1.5 min-w-0">
              <span class="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase">
                {{ theme.category }}
              </span>
              <h4 class="text-xs sm:text-sm font-bold text-[var(--student-text)] group-hover:text-[var(--student-primary-text)] transition leading-snug">
                {{ theme.title }}
              </h4>
            </div>

            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--student-text-muted)] transition group-hover:text-[var(--student-primary-text)] group-hover:translate-x-1">
              <span class="material-symbols-rounded text-2xl">chevron_right</span>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <button
            type="button"
            @click="currentStep = 'THEME_SELECTION'"
            class="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar</span>
          </button>
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- TELA 1.3: TEXTOS MOTIVADORES DA PROPOSTA SELECIONADA -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'THEME_DETAIL'" class="max-w-2xl mx-auto space-y-5">
        <div class="flex items-center justify-between">
          <button
            type="button"
            @click="currentStep = 'THEME_SELECTION'"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 transition cursor-pointer"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Trocar Tema</span>
          </button>

          <div class="flex items-center gap-2">
            <span v-if="selectedThemeObj?.isAiGenerated" class="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
              <span class="material-symbols-rounded text-xs">auto_awesome</span>
              <span>Gerado por IA</span>
            </span>
            <span class="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-3 py-1 rounded-full uppercase">
              {{ selectedThemeObj?.category }}
            </span>
          </div>
        </div>

        <!-- Banner com a Proposta -->
        <div class="rounded-3xl border border-purple-200 dark:border-purple-800/80 bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-purple-950/40 dark:to-zinc-900 p-6 space-y-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Proposta Oficial de Redação:</span>
          <h2 class="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 leading-tight">
            {{ selectedThemeObj?.title }}
          </h2>
          <p class="text-xs text-slate-600 dark:text-zinc-400 italic pt-1 leading-relaxed">
            {{ selectedThemeObj?.instructions }}
          </p>
        </div>

        <!-- Imagem / Gráfico de Apoio do Tema -->
        <div v-if="selectedThemeObj?.imageUrl" class="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs overflow-hidden">
          <div class="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span class="material-symbols-rounded text-purple-600">image</span>
            <span>Gráfico / Imagem de Apoio</span>
          </div>
          <img
            :src="selectedThemeObj.imageUrl"
            alt="Gráfico de Apoio"
            class="max-h-96 w-full object-contain rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700"
          />
        </div>

        <!-- Textos Motivadores I, II, III -->
        <div class="space-y-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <span class="material-symbols-rounded text-base text-purple-600 dark:text-purple-400">format_quote</span>
            <span>Textos Motivadores Oficiais</span>
          </h3>

          <div
            v-for="(mot, idx) in selectedThemeObj?.motivators"
            :key="idx"
            class="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-xs"
          >
            <span class="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wide block">
              {{ mot.title }}
            </span>
            <p v-if="mot.content" class="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-zinc-300 text-justify whitespace-pre-line">
              {{ mot.content }}
            </p>
            <p v-if="mot.source" class="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 italic pt-2 border-t border-slate-100 dark:border-zinc-800">
              {{ mot.source }}
            </p>
            <div v-if="mot.imageUrl" class="pt-2">
              <img
                :src="mot.imageUrl"
                alt="Gráfico / Imagem do Motivador"
                class="max-h-80 w-full object-contain rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 p-1"
              />
            </div>
          </div>
        </div>

        <!-- Dicas Pedagógicas da IA (Repertórios e Núcleos da Tese) -->
        <div v-if="selectedThemeObj?.hints" class="rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/30 p-5 space-y-3">
          <div class="flex items-center gap-2 text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
            <span class="material-symbols-rounded text-base">lightbulb</span>
            <span>Dicas Pedagógicas da IA para este Tema</span>
          </div>

          <div v-if="selectedThemeObj.hints.problemCores?.length" class="space-y-1">
            <span class="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">Núcleos Argumentativos Sugeridos para a Tese:</span>
            <ul class="list-disc list-inside text-xs text-slate-600 dark:text-zinc-400 space-y-0.5">
              <li v-for="(pc, pci) in selectedThemeObj.hints.problemCores" :key="pci">{{ pc }}</li>
            </ul>
          </div>

          <div v-if="selectedThemeObj.hints.repertorySuggestions?.length" class="space-y-1 pt-1">
            <span class="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">Repertórios Socioculturais Pertinentes:</span>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(rep, repi) in selectedThemeObj.hints.repertorySuggestions"
                :key="repi"
                class="rounded-lg bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 px-2.5 py-1 text-[11px] font-medium text-purple-800 dark:text-purple-200"
              >
                {{ rep }}
              </span>
            </div>
          </div>
        </div>

        <!-- Botão para avançar para redação ou sortear outro -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            @click="currentStep = 'THEME_SELECTION'"
            class="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 transition cursor-pointer"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar aos Temas</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              v-if="selectedThemeObj?.isAiGenerated"
              type="button"
              @click="generateRandomAiTheme()"
              :disabled="isGeneratingAiTheme"
              class="inline-flex items-center gap-1.5 rounded-2xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-800 px-4 py-3 text-xs font-black text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
            >
              <span class="material-symbols-rounded text-sm" :class="{ 'animate-spin': isGeneratingAiTheme }">casino</span>
              <span>Sortear Outro</span>
            </button>

            <button
              type="button"
              @click="proceedToFormatFromDetail"
              class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition cursor-pointer"
            >
              <span>Ir para a Redação</span>
              <span class="material-symbols-rounded text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- ETAPA 2: ESCOLHER FORMATO (ESCREVER / ENVIAR FOTO) -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'FORMAT_SELECTION'" class="max-w-xl mx-auto space-y-5">
        <div class="rounded-2xl bg-purple-50/70 border border-purple-100 p-3.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-700">Tema Selecionado:</span>
          <p class="text-xs sm:text-sm font-black text-slate-900 mt-0.5">{{ chosenTheme }}</p>
        </div>

        <div>
          <h1 class="text-2xl font-black text-[var(--student-text)] tracking-tight">
            Como deseja enviar?
          </h1>
          <p class="mt-1 text-xs text-[var(--student-text-secondary)]">
            Escolha entre digitar no editor pautado ou enviar foto da folha manuscrita.
          </p>
        </div>

        <!-- 2 Botões um em cima do outro -->
        <div class="space-y-3">
          <button
            type="button"
            @click="chooseFormat('TEXT')"
            class="group w-full flex items-center justify-between gap-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--student-primary-solid)] hover:shadow-md cursor-pointer"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] transition group-hover:scale-105 group-hover:bg-[var(--student-primary-solid)] group-hover:text-white">
                <span class="material-symbols-rounded text-2xl">keyboard</span>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-[var(--student-text)] transition group-hover:text-[var(--student-primary-text)]">
                  Escrever
                </h3>
                <p class="mt-0.5 text-xs text-[var(--student-text-secondary)]">
                  Digite seu texto no editor pautado com contagem de palavras, parágrafos e cronômetro.
                </p>
              </div>
            </div>
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--student-text-muted)] transition group-hover:text-[var(--student-primary-text)] group-hover:translate-x-1">
              <span class="material-symbols-rounded text-2xl">chevron_right</span>
            </div>
          </button>

          <button
            type="button"
            @click="chooseFormat('PHOTO')"
            class="group w-full flex items-center justify-between gap-4 rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--student-primary-solid)] hover:shadow-md cursor-pointer"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--student-primary-soft)] text-[var(--student-primary-text)] transition group-hover:scale-105 group-hover:bg-[var(--student-primary-solid)] group-hover:text-white">
                <span class="material-symbols-rounded text-2xl">photo_camera</span>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-[var(--student-text)] transition group-hover:text-[var(--student-primary-text)]">
                  Enviar foto
                </h3>
                <p class="mt-0.5 text-xs text-[var(--student-text-secondary)]">
                  Tire uma foto ou faça upload da sua folha de redação manuscrita.
                </p>
              </div>
            </div>
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--student-text-muted)] transition group-hover:text-[var(--student-primary-text)] group-hover:translate-x-1">
              <span class="material-symbols-rounded text-2xl">chevron_right</span>
            </div>
          </button>
        </div>

        <div class="pt-2">
          <button
            type="button"
            @click="selectedThemeObj ? currentStep = 'THEME_DETAIL' : currentStep = 'CUSTOM_THEME'"
            class="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <span class="material-symbols-rounded text-sm">arrow_back</span>
            <span>Voltar</span>
          </button>
        </div>
      </section>

      <!-- ============================================================== -->
      <!-- ETAPA 3: EDITOR DE REDAÇÃO AMPLO COM LINHAS PAUTADAS & CRONÔMETRO -->
      <!-- ============================================================== -->
      <section v-if="currentStep === 'EDITOR'" class="w-full space-y-4">
        <!-- SELETOR DE MODO: FOLHA PAUTADA OU CORREÇÃO DA IA (SE EXISTIR RESULTADO) -->
        <div v-if="aiResult && !isAnalyzingAI" class="flex items-center justify-center gap-2 pb-1">
          <div class="inline-flex rounded-2xl bg-slate-100 dark:bg-zinc-800 p-1.5 border border-slate-200 dark:border-zinc-700 shadow-xs">
            <button
              type="button"
              @click="editorViewMode = 'WRITE'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              :class="editorViewMode === 'WRITE' ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'"
            >
              <span class="material-symbols-rounded text-base">edit_note</span>
              <span>Folha de Redação<span class="hidden sm:inline"> ({{ linesCount }} linhas)</span></span>
            </button>
            <button
              type="button"
              @click="editorViewMode = 'AI_FEEDBACK'"
              class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              :class="editorViewMode === 'AI_FEEDBACK' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30'"
            >
              <span class="material-symbols-rounded text-base">auto_awesome</span>
              <span>Correção da IA ({{ aiResult.totalScore }} pts)</span>
            </button>
          </div>
        </div>

        <!-- VISUALIZAÇÃO 1: FOLHA PAUTADA DE REDAÇÃO (30 LINHAS ENEM) -->
        <div v-if="editorViewMode === 'WRITE'" class="space-y-4">
          <!-- AVISO DE CORREÇÃO JÁ DISPONÍVEL (QUANDO O ALUNO ESTIVER EDITANDO) -->
          <div
            v-if="aiResult && !isAnalyzingAI"
            class="rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          >
            <div class="flex items-center gap-2.5 text-xs text-[var(--student-text)]">
              <span class="material-symbols-rounded text-purple-600 text-xl shrink-0">auto_awesome</span>
              <span>
                Sua redação possui uma avaliação de IA salva: <strong>{{ aiResult.totalScore }} / 1000 pts</strong>. Você pode fazer melhorias no texto e clicar em "Corrigir com IA" a qualquer momento!
              </span>
            </div>
            <button
              type="button"
              @click="editorViewMode = 'AI_FEEDBACK'"
              class="shrink-0 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-purple-700 transition cursor-pointer shadow-xs"
            >
              Ver Parecer da IA
            </button>
          </div>

          <!-- BARRA SUPERIOR: TEMA DA REDAÇÃO -->
          <div class="rounded-2xl bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div class="min-w-0 flex items-center gap-2 flex-1">
              <span class="rounded-md bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 shrink-0">
                Tema
              </span>
              <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 truncate" :title="chosenTheme">
                {{ chosenTheme }}
              </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="selectedThemeObj?.motivators?.length"
                type="button"
                @click="showMotivatorModal = true"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 transition cursor-pointer"
              >
                <span class="material-symbols-rounded text-sm">article</span>
                <span>Textos Motivadores</span>
              </button>

              <button
                type="button"
                @click="currentStep = 'THEME_SELECTION'"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 transition cursor-pointer"
              >
                <span class="material-symbols-rounded text-sm">sync_alt</span>
                <span>Trocar Tema</span>
              </button>
            </div>
          </div>

          <!-- BARRA DE FERRAMENTAS DO EDITOR (TOOLBAR) -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <!-- Tamanho da Fonte -->
              <button
                type="button"
                @click="toggleFontSize"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer border border-slate-200/60 dark:border-zinc-700/60"
                title="Ajustar tamanho da fonte no editor"
              >
                <span class="material-symbols-rounded text-sm">text_fields</span>
                <span>{{ fontSize }}px</span>
              </button>

              <!-- Cronômetro Oficial -->
              <button
                type="button"
                @click="toggleTimer"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border"
                :class="timerRunning ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/60 dark:border-zinc-700/60 hover:bg-slate-200 dark:hover:bg-zinc-700'"
                title="Cronometrar tempo de redação"
              >
                <span class="material-symbols-rounded text-sm">timer</span>
                <span>{{ timerRunning ? `Pausar (${formattedTimer})` : `Timer (${formattedTimer})` }}</span>
              </button>

              <!-- Conectivos C4 -->
              <button
                type="button"
                @click="showConnectorsDrawer = true"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition text-xs font-black cursor-pointer"
              >
                <span class="material-symbols-rounded text-sm">link</span>
                <span>Conectivos C4</span>
              </button>

              <!-- Indentar Novo Parágrafo -->
              <button
                type="button"
                @click="insertParagraphIndent"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition text-xs font-black cursor-pointer"
                title="Inserir recuo de parágrafo oficial ENEM (ou pressione Tab no teclado)"
              >
                <span class="material-symbols-rounded text-sm">format_indent_increase</span>
                <span>+ Novo Parágrafo</span>
              </button>

              <!-- Formatar Padrão ENEM (Remove linhas vazias e indenta parágrafos) -->
              <button
                type="button"
                @click="formatEnemStandard"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:via-purple-500/20 hover:to-indigo-500/20 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 transition text-xs font-black cursor-pointer shadow-2xs"
                title="Remover linhas em branco e aplicar recuo de 4 espaços em todos os parágrafos (Padrão Oficial ENEM)"
              >
                <span class="material-symbols-rounded text-sm text-amber-500">auto_fix_high</span>
                <span>Formatar Padrão ENEM</span>
              </button>
            </div>

            <div class="flex items-center gap-2">


              <!-- Limpar Texto -->
              <button
                v-if="essayText"
                type="button"
                @click="clearEssay"
                class="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-xs font-bold cursor-pointer"
                title="Limpar texto da folha"
              >
                <span class="material-symbols-rounded text-sm">delete</span>
                <span>Limpar</span>
              </button>
            </div>
          </div>

          <!-- VISÃO GERAL: 4 MÉTRICAS RIGOROSAS -->
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <!-- Linhas ENEM -->
            <div class="block rounded-2xl bg-white dark:bg-zinc-800/80 p-3 sm:p-3.5 border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
              <span class="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide block">Linhas ENEM</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span
                  class="text-xl font-black"
                  :class="linesCount > 30 ? 'text-rose-600 dark:text-rose-400' : linesCount >= 8 ? 'text-emerald-600 dark:text-emerald-400' : linesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'"
                >
                  {{ linesCount }}
                </span>
                <span class="text-xs font-bold text-slate-400">/ 30</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block truncate">
                {{ linesCount > 30 ? 'Ultrapassou limite!' : linesCount >= 8 ? 'Extensão oficial ideal' : linesCount > 0 ? 'Mínimo 8 linhas' : 'Folha em branco' }}
              </span>
            </div>

            <!-- Palavras (Visível no Mobile e Desktop) -->
            <div class="rounded-2xl bg-white dark:bg-zinc-800/80 p-3.5 border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
              <span class="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide block">Palavras</span>
              <div class="mt-1">
                <span class="text-xl font-black text-purple-700 dark:text-purple-400">{{ wordCount }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block">Ideal: 250 a 350</span>
            </div>

            <!-- Parágrafos (Visível no Mobile e Desktop) -->
            <div class="rounded-2xl bg-white dark:bg-zinc-800/80 p-3.5 border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
              <span class="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide block">Parágrafos</span>
              <div class="mt-1">
                <span class="text-xl font-black text-indigo-700 dark:text-indigo-400">{{ paragraphCount }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block">Padrão ENEM: 4</span>
            </div>

            <!-- Frases (Oculto no Mobile, visível no Desktop) -->
            <div class="hidden sm:block rounded-2xl bg-white dark:bg-zinc-800/80 p-3.5 border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
              <span class="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide block">Frases / Períodos</span>
              <div class="mt-1">
                <span class="text-xl font-black text-slate-700 dark:text-zinc-200">{{ phraseCount }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium block">Fluidez sintática</span>
            </div>
          </div>

          <!-- TOAST DE FEEDBACK DE FORMATAÇÃO -->
          <transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="formatFeedbackToast"
              class="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-3 text-white text-xs font-bold shadow-lg flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-2">
                <span class="material-symbols-rounded text-base">check_circle</span>
                <span>{{ formatFeedbackToast }}</span>
              </div>
              <button
                type="button"
                @click="formatFeedbackToast = ''"
                class="text-white/80 hover:text-white cursor-pointer"
              >
                <span class="material-symbols-rounded text-sm">close</span>
              </button>
            </div>
          </transition>

          <!-- BANNER INTELIGENTE: LINHAS EM BRANCO DETECTADAS -->
          <div
            v-if="blankLinesCount > 0"
            class="rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs"
          >
            <div class="flex items-start sm:items-center gap-2.5">
              <span class="material-symbols-rounded text-xl text-amber-600 shrink-0">info</span>
              <div>
                <p class="font-bold">
                  Detectamos {{ blankLinesCount }} linha(s) em branco vazias entre parágrafos!
                </p>
                <p class="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Na folha oficial do ENEM você não deve pular linhas. Cada linha vazia consome seu limite de 30 linhas.
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="formatEnemStandard"
              class="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span class="material-symbols-rounded text-sm">auto_fix_high</span>
              <span>Remover Linhas Vazias e Recuperar {{ blankLinesCount }} Linha(s)</span>
            </button>
          </div>

          <!-- ALERTAS SOBRE AS LINHAS DO ENEM -->
          <div v-if="linesCount > 30" class="flex flex-col sm:flex-row rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/80 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300 items-center justify-between gap-2.5 shadow-2xs">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-rounded text-lg shrink-0">error</span>
              <span>
                Atenção: sua redação possui <strong>{{ linesCount }} linhas</strong> (ultrapassou o limite em <strong>{{ linesCount - 30 }} linha(s)</strong>). Qualquer texto escrito a partir da linha 31 será desconsiderado pela banca avaliadora do ENEM.
              </span>
            </div>
            <button
              v-if="blankLinesCount > 0"
              type="button"
              @click="formatEnemStandard"
              class="shrink-0 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-rounded text-sm">auto_fix_high</span>
              <span>Ajustar Parágrafos</span>
            </button>
          </div>

          <div v-else-if="linesCount > 0 && linesCount < 8" class="flex items-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900/80 p-3.5 text-xs font-bold text-amber-800 dark:text-amber-300 gap-2.5">
            <span class="material-symbols-rounded text-lg shrink-0">warning</span>
            <span>Critério do ENEM: Textos com menos de 8 linhas recebem <strong>NOTA ZERO</strong> por extensão insuficiente. Escreva ao menos 8 linhas.</span>
          </div>

          <!-- FOLHA PAUTADA OFICIAL ENEM -->
          <div v-if="submissionMode === 'TEXT'" class="w-full pb-3">
            <div
              class="enem-sheet mx-auto rounded-2xl sm:rounded-3xl border border-slate-300 dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-900 shadow-md shadow-slate-200/50 dark:shadow-black/20 overflow-hidden transition-all duration-200 w-full max-w-[960px]"
            >
              <!-- CABEÇALHO DA FOLHA OFICIAL -->
              <div class="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-800/70 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-1.5 sm:gap-2 text-purple-700 dark:text-purple-300 font-black uppercase tracking-wider text-[11px] sm:text-xs">
                  <span class="material-symbols-rounded text-base sm:text-lg">school</span>
                  <span>Folha Oficial de Redação ENEM &bull; 30 Linhas</span>
                </div>

                <!-- Indicadores de Linhas -->
                <div class="flex items-center gap-2">
                  <!-- Indicador de Linhas -->
                  <div
                    class="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold shadow-2xs"
                    :class="lineStatus.class"
                  >
                    <span class="material-symbols-rounded text-xs sm:text-sm">{{ lineStatus.icon }}</span>
                    <span>{{ lineStatus.text }} &bull; {{ lineStatus.badge }}</span>
                  </div>
                </div>
              </div>

              <!-- TÍTULO DA REDAÇÃO (CENTRALIZADO) -->
              <div class="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/40">
                <input
                  v-model="essayTitle"
                  type="text"
                  placeholder="Título (opcional)"
                  class="w-full text-center text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none bg-transparent pb-1 focus:border-b-2 focus:border-purple-600 transition"
                />
              </div>

              <!-- CORPO DA FOLHA COM TEXTAREA PAUTADO -->
              <div class="flex px-1.5 sm:px-4 py-2 sm:py-3 select-text relative">
                <!-- Coluna de Números das Linhas (1 a 30+) -->
                <div class="flex w-7 sm:w-11 shrink-0 select-none border-r-2 border-red-500/80 dark:border-red-600/80 pr-1 sm:pr-2 flex-col font-mono text-[10px] sm:text-xs">
                  <div
                    v-for="lineNum in editorTotalLines"
                    :key="lineNum"
                    class="h-[36px] flex items-center justify-end font-bold transition-colors select-none"
                    :class="{
                      'text-purple-600 dark:text-purple-400 font-black bg-purple-100/60 dark:bg-purple-950/40 rounded-l': lineNum <= activeLines && lineNum <= 30,
                      'text-slate-300 dark:text-zinc-700 font-normal': lineNum > activeLines && lineNum <= 30,
                      'text-rose-600 dark:text-rose-400 font-black bg-rose-100/90 dark:bg-rose-950/60 rounded-l border-l-2 border-rose-500': lineNum > 30,
                      'border-b-2 border-rose-600': lineNum === 30 && activeLines > 30
                    }"
                    :title="lineNum <= 30 ? `Linha ${lineNum} do ENEM` : `Linha ${lineNum} (Excede o limite do ENEM)`"
                  >
                    {{ lineNum.toString().padStart(2, '0') }}
                  </div>
                </div>

                <!-- Textarea Assentado na Malha Pautada de 36px -->
                <div class="flex-1 relative min-w-0">
                  <!-- Sombra de aviso para Linhas 31+ que ultrapassam o limite oficial -->
                  <div
                    v-if="activeLines > 30"
                    class="absolute inset-x-0 bottom-0 z-0 pointer-events-none bg-rose-500/5 dark:bg-rose-950/20"
                    :style="{ top: `${30 * 36}px` }"
                  ></div>

                  <!-- Linha divisória oficial após a Linha 30 -->
                  <div
                    v-if="activeLines > 30"
                    class="absolute inset-x-0 z-10 pointer-events-none border-b-2 border-dashed border-rose-500"
                    :style="{ top: `${30 * 36}px` }"
                  ></div>

                  <textarea
                    v-model="essayText"
                    rows="30"
                    placeholder="Escreva sua redação aqui..."
                    class="enem-ruled-textarea w-full text-slate-800 dark:text-zinc-100 select-text outline-none resize-none relative z-10"
                    :style="{
                      minHeight: '1080px',
                      fontSize: `${fontSize}px`
                    }"
                    @input="autoResizeTextarea"
                    @keydown="handleTextareaKeydown"
                    @paste="handlePaste"
                  ></textarea>
                </div>

                <!-- Margem Direita ENEM -->
                <div class="w-1.5 sm:w-2 shrink-0 border-l-2 border-red-400/60 dark:border-red-600/60"></div>
              </div>

              <!-- Rodapé da Folha: Demarcação do Limite Oficial de 30 Linhas -->
              <div
                class="flex flex-col sm:flex-row mx-2 sm:mx-4 my-2 px-3 py-2 text-[11px] font-bold rounded-xl items-center justify-between gap-1.5 border transition-colors"
                :class="linesCount > 30 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/80' : 'bg-slate-100/70 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border-slate-200/80 dark:border-zinc-700/80'"
              >
                <span class="flex items-center gap-1.5 text-center sm:text-left">
                  <span class="material-symbols-rounded text-sm shrink-0">{{ linesCount > 30 ? 'error' : 'flag' }}</span>
                  <span v-if="linesCount > 30">
                    A folha oficial possui 30 linhas. Use o botão <strong>"Formatar Padrão ENEM"</strong> acima para eliminar linhas em branco ou resuma seu texto.
                  </span>
                  <span v-else>
                    Limite Oficial da Folha de Redação do ENEM (30 Linhas)
                  </span>
                </span>
                <span class="text-[10px] uppercase font-mono font-bold shrink-0" :class="linesCount > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-zinc-400'">
                  {{ linesCount }} / 30 Linhas &bull; INEP / Banca Oficial
                </span>
              </div>
            </div>
          </div>

          <!-- MODO FOTO -->
          <div v-else class="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-3 transition-colors duration-200">
            <!-- Processando / Compactando Foto -->
            <div
              v-if="isCompressingPhoto"
              class="border-2 border-dashed border-purple-400 dark:border-purple-600 rounded-2xl p-8 sm:p-10 text-center bg-purple-50/60 dark:bg-purple-950/30 space-y-2 animate-pulse"
            >
              <span class="material-symbols-rounded text-4xl text-purple-600 dark:text-purple-400 animate-spin">progress_activity</span>
              <p class="text-sm font-black text-purple-900 dark:text-purple-200">Processando e otimizando foto...</p>
              <p class="text-xs text-purple-700/80 dark:text-purple-300/80 max-w-sm mx-auto">
                Ajustando dimensões para garantir que a folha fique nítida para o professor e seja enviada instantaneamente sem falhas de conexão.
              </p>
            </div>

            <!-- Botão de Upload da Folha -->
            <div
              v-else-if="!photoPreview"
              class="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl p-8 sm:p-10 text-center hover:border-purple-500 transition cursor-pointer bg-slate-50/50 dark:bg-zinc-800/40"
              @click="$refs.fileInput.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handlePhotoUpload"
              />
              <span class="material-symbols-rounded text-5xl text-purple-600 dark:text-purple-400 mb-2 block">add_photo_alternate</span>
              <p class="text-sm font-black text-slate-800 dark:text-zinc-200">Clique para selecionar ou tirar foto da folha</p>
              <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">A imagem será otimizada automaticamente para envio rápido e seguro</p>
            </div>

            <!-- Preview da Foto e Controles de Ajuste -->
            <div v-else class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                <div class="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <span class="material-symbols-rounded text-base">check_circle</span>
                  <span>Foto carregada e pronta para envio</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="rotatePhoto"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition cursor-pointer"
                    title="Girar foto em 90 graus no sentido horário"
                  >
                    <span class="material-symbols-rounded text-sm">rotate_right</span>
                    <span>Girar 90°</span>
                  </button>
                  <button
                    type="button"
                    @click="removePhoto"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer"
                  >
                    <span class="material-symbols-rounded text-sm">delete</span>
                    <span>Remover</span>
                  </button>
                </div>
              </div>
              <div class="relative rounded-2xl bg-slate-900/5 dark:bg-black/30 p-2 sm:p-3 text-center overflow-hidden border border-slate-200 dark:border-zinc-800">
                <img
                  :src="photoPreview"
                  alt="Folha da redação"
                  class="w-full h-auto max-h-[850px] mx-auto rounded-xl object-contain shadow-md transition-transform duration-200"
                  style="image-rendering: -webkit-optimize-contrast;"
                />
              </div>
            </div>
          </div>

          <!-- MENSAGENS DE ERRO -->
          <div v-if="errorMessage || aiErrorMessage" class="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span class="material-symbols-rounded text-base">error</span>
            <span>{{ errorMessage || aiErrorMessage }}</span>
          </div>

          <!-- FOOTER COM AS DUAS OPÇÕES: CORRIGIR COM IA E ENVIAR AO PROFESSOR -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              @click="currentStep = 'THEME_SELECTION'"
              class="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 transition uppercase cursor-pointer"
            >
              <span class="material-symbols-rounded text-sm">arrow_back</span>
              <span>Voltar ao Tema</span>
            </button>

            <!-- AÇÕES DE CORREÇÃO -->
            <div class="flex flex-wrap items-center gap-2.5">
              <!-- CHECKBOX SALVAR NO HISTÓRICO -->
              <label class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer select-none px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xs hover:border-purple-300 transition" title="Grava a redação e a avaliação analítica da IA diretamente no seu histórico">
                <input
                  type="checkbox"
                  v-model="saveAiToHistory"
                  class="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Salvar no Histórico</span>
              </label>

              <!-- BOTÃO DE CORREÇÃO COM IA INSTANTÂNEA -->
              <button
                type="button"
                :disabled="isAnalyzingAI || submitting || (submissionMode === 'TEXT' ? !essayText.trim() : true)"
                @click="correctWithAi"
                class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-6 py-3 text-xs font-black text-white hover:brightness-110 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 active:scale-98 uppercase tracking-wider cursor-pointer"
                title="Receba nota de 0 a 1000 e feedback das 5 competências em segundos com a IA"
              >
                <span v-if="isAnalyzingAI" class="material-symbols-rounded animate-spin text-base">progress_activity</span>
                <span v-else class="material-symbols-rounded text-base">auto_awesome</span>
                <span>{{ isAnalyzingAI ? 'Analisando Redação...' : 'Corrigir com IA' }}</span>
              </button>

              <!-- BOTÃO ENVIAR AO PROFESSOR -->
              <button
                type="button"
                :disabled="submitting || isAnalyzingAI || isCompressingPhoto || (submissionMode === 'TEXT' ? !essayText.trim() : !photoPreview)"
                @click="openSubmitModal"
                class="inline-flex items-center gap-1.5 rounded-2xl border-2 border-purple-600 dark:border-purple-500 bg-white dark:bg-zinc-800 px-5 py-2.5 text-xs font-black text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-zinc-700 shadow-xs transition disabled:opacity-50 active:scale-98 uppercase tracking-wide cursor-pointer"
              >
                <span v-if="submitting" class="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                <span>Enviar ao Professor</span>
                <span v-if="!submitting" class="material-symbols-rounded text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        <!-- VISUALIZAÇÃO 2: RELATÓRIO DA INTELIGÊNCIA ARTIFICIAL DENTRO DE NOVA REDAÇÃO -->
        <div v-else class="space-y-6">
          <!-- ESTADO DE CARREGAMENTO ANIMADO DA IA (STUDIO DE CORREÇÃO ULTRA MODERNO) -->
          <div
            v-if="isAnalyzingAI"
            class="rounded-3xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/40 dark:via-zinc-900 dark:to-zinc-950 p-6 sm:p-10 shadow-xl shadow-purple-900/5 relative overflow-hidden text-center"
          >
            <!-- Background Glow Decorativo -->
            <div class="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"></div>

            <!-- Cabeçalho do Carregamento -->
            <div class="relative flex flex-col items-center">
              <!-- Radar Icon Animado -->
              <div class="relative flex h-20 w-20 items-center justify-center">
                <div class="absolute inset-0 animate-ping rounded-full bg-purple-500/20 duration-1000"></div>
                <div class="absolute inset-1 animate-spin rounded-full border-2 border-dashed border-purple-500/50"></div>
                <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/35">
                  <span class="material-symbols-rounded text-3xl animate-pulse">
                    psychology
                  </span>
                </div>
              </div>

              <div class="mt-4 flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <span class="h-2 w-2 rounded-full bg-purple-600 animate-ping"></span>
                  Banca IA em Ação
                </span>
                <span class="text-xs font-black text-purple-600 dark:text-purple-400">
                  {{ Math.round(((aiAnalysisStep + 1) / detailedAiSteps.length) * 100) }}%
                </span>
              </div>

              <h3 class="mt-2 text-xl sm:text-2xl font-black text-[var(--student-text)] tracking-tight">
                Auditando Redação nos Critérios Oficiais do ENEM
              </h3>
              <p class="mt-1 text-xs sm:text-sm text-[var(--student-text-secondary)] max-w-md font-medium">
                {{ detailedAiSteps[aiAnalysisStep]?.desc || 'Avaliando estrutura textual e competências...' }}
              </p>

              <!-- Barra de Progresso com Brilho -->
              <div class="mx-auto mt-5 h-2.5 w-full max-w-lg overflow-hidden rounded-full bg-purple-100 dark:bg-zinc-800 p-0.5 border border-purple-200 dark:border-purple-900/50">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 transition-all duration-700 ease-out shadow-xs"
                  :style="{ width: `${((aiAnalysisStep + 1) / detailedAiSteps.length) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Stepper dos 7 Estágios de Avaliação -->
            <div class="relative mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="(step, idx) in detailedAiSteps"
                :key="step.id"
                class="flex items-center gap-3 rounded-2xl p-3 border text-left transition-all duration-300"
                :class="
                  idx < aiAnalysisStep
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : idx === aiAnalysisStep
                      ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500/20 scale-102 shadow-sm'
                      : 'border-slate-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 opacity-60'
                "
              >
                <!-- Status Icon -->
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                  :class="
                    idx < aiAnalysisStep
                      ? 'bg-emerald-500 text-white'
                      : idx === aiAnalysisStep
                        ? 'bg-purple-600 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                  "
                >
                  <span v-if="idx < aiAnalysisStep" class="material-symbols-rounded text-base">check</span>
                  <span v-else-if="idx === aiAnalysisStep" class="material-symbols-rounded text-base animate-spin">progress_activity</span>
                  <span v-else class="text-xs">{{ idx + 1 }}</span>
                </div>

                <div class="min-w-0 flex-1">
                  <p
                    class="text-xs font-bold truncate"
                    :class="idx === aiAnalysisStep ? 'text-purple-700 dark:text-purple-300 font-black' : 'text-[var(--student-text)]'"
                  >
                    {{ step.title }}
                  </p>
                  <p class="text-[10px] text-[var(--student-text-secondary)] truncate">
                    {{ step.desc }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Card de Dica de Ouro Oficial do ENEM (Rotativo a cada 3.5s) -->
            <div class="relative mt-7 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-left transition-all">
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <span class="material-symbols-rounded text-lg">lightbulb</span>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-black uppercase text-amber-800 dark:text-amber-300 tracking-wide">
                      💡 {{ enemTips[currentTipIndex].title }}
                    </span>
                    <span class="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      Dica {{ currentTipIndex + 1 }} de {{ enemTips.length }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                    {{ enemTips[currentTipIndex].text }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Rodapé informativo -->
            <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-[var(--student-text-secondary)]">
              <span class="flex items-center gap-1">
                <span class="material-symbols-rounded text-sm text-emerald-600">verified</span>
                Matriz Oficial do INEP
              </span>
              <span>&bull;</span>
              <span class="flex items-center gap-1">
                <span class="material-symbols-rounded text-sm text-purple-600">description</span>
                {{ wordCount }} palavras analisadas
              </span>
              <span>&bull;</span>
              <span class="flex items-center gap-1">
                <span class="material-symbols-rounded text-sm text-indigo-600">tune</span>
                Padrão de Correção 2026
              </span>
            </div>
          </div>

          <!-- ESTADO DE ERRO DA IA -->
          <div
            v-else-if="aiErrorMessage && !aiResult"
            class="rounded-3xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-8 sm:p-12 text-center"
          >
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30">
              <span class="material-symbols-rounded text-3xl">error</span>
            </div>
            <h3 class="mt-5 text-xl font-black text-red-700 dark:text-red-400">
              Não foi possível concluir a correção com a IA
            </h3>
            <p class="mt-2 text-sm text-slate-700 dark:text-zinc-300 max-w-md mx-auto">
              {{ aiErrorMessage }}
            </p>

            <!-- Pill de Reconexão Automática durante alta demanda temporária -->
            <div
              v-if="autoRetryCountdown > 0"
              class="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-700 px-4 py-2 text-xs font-black text-purple-700 dark:text-purple-300 shadow-sm animate-pulse"
            >
              <span class="material-symbols-rounded text-base animate-spin">sync</span>
              <span>Reconectando aos servidores da IA em {{ autoRetryCountdown }}s...</span>
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                @click="cancelAutoRetry(); correctWithAi()"
                :disabled="isAnalyzingAI"
                class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider transition shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
              >
                <span class="material-symbols-rounded text-sm">refresh</span>
                <span>Tentar Novamente Agora</span>
              </button>

              <button
                type="button"
                @click="cancelAutoRetry(); editorViewMode = 'WRITE'"
                class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                <span class="material-symbols-rounded text-sm">arrow_back</span>
                <span>Voltar ao Editor</span>
              </button>
            </div>
          </div>

          <!-- RELATÓRIO COMPLETO GERADO PELA IA -->
          <div v-else-if="aiResult" class="space-y-6">
            <!-- BARRA DE CONTROLE SUPERIOR DO RESULTADO -->
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100 dark:bg-zinc-800 p-4 border border-slate-200 dark:border-zinc-700">
              <button
                type="button"
                @click="editorViewMode = 'WRITE'"
                class="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-black text-purple-700 dark:text-purple-300 shadow-xs hover:bg-purple-50 transition cursor-pointer"
              >
                <span class="material-symbols-rounded text-base">arrow_back</span>
                <span>Voltar ao Editor &bull; Ajustar Redação</span>
              </button>

              <div class="flex flex-wrap items-center gap-2">
                <NuxtLink
                  v-if="savedAiEssayId"
                  :to="`/aluno/redacao/${savedAiEssayId}`"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/50 px-3 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                >
                  <span class="material-symbols-rounded text-sm">history_edu</span>
                  <span>Ver no Histórico</span>
                </NuxtLink>

                <button
                  type="button"
                  @click="copyAiReport"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span class="material-symbols-rounded text-sm">{{ copiedAiReport ? 'check' : 'content_copy' }}</span>
                  <span>{{ copiedAiReport ? 'Copiado!' : 'Copiar Avaliação' }}</span>
                </button>

                <button
                  type="button"
                  @click="correctWithAi"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-black shadow-xs transition cursor-pointer"
                >
                  <span class="material-symbols-rounded text-sm">refresh</span>
                  <span>Recorrigir</span>
                </button>

                <button
                  type="button"
                  @click="openSubmitModal"
                  class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black shadow-xs transition cursor-pointer"
                >
                  <span class="material-symbols-rounded text-sm">send</span>
                  <span>Enviar ao Professor</span>
                </button>
              </div>
            </div>

            <!-- SCORE BOARD CENTRAL GIGANTE -->
            <div class="overflow-hidden rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] shadow-lg shadow-black/5">
              <div
                class="bg-gradient-to-r p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                :class="getAiScoreBadge(aiResult.totalScore).color"
              >
                <div>
                  <div class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-xs">
                    <span class="material-symbols-rounded text-sm">emoji_events</span>
                    {{ getAiScoreBadge(aiResult.totalScore).label }}
                  </div>
                  <h3 class="mt-3 text-4xl sm:text-6xl font-black tracking-tight">
                    {{ aiResult.totalScore }}
                    <span class="text-xl sm:text-2xl font-bold opacity-80">/ 1000</span>
                  </h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/90 max-w-lg">
                    Avaliação técnica com base nas 5 competências oficiais do ENEM.
                  </p>
                </div>

                <!-- Mini resumo das 5 notas -->
                <div class="grid grid-cols-5 gap-2 bg-black/20 p-4 rounded-2xl backdrop-blur-md text-center">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="flex flex-col items-center"
                  >
                    <span class="text-[10px] uppercase font-bold opacity-75">C{{ i }}</span>
                    <span class="text-base sm:text-lg font-black">{{ aiResult[`c${i}Score`] }}</span>
                    <span class="text-[9px] opacity-60">/200</span>
                  </div>
                </div>
              </div>

              <!-- Parecer Geral Pedagógico -->
              <div class="p-6 sm:p-8 border-t border-[var(--student-border)]">
                <h4 class="text-sm font-black uppercase tracking-wider text-[var(--student-text-secondary)] flex items-center gap-2">
                  <span class="material-symbols-rounded text-lg text-purple-600">psychology</span>
                  Parecer Geral do Corretor IA
                </h4>
                <p class="mt-2 text-sm sm:text-base font-medium leading-relaxed text-[var(--student-text)]">
                  {{ aiResult.generalFeedback }}
                </p>
              </div>
            </div>

            <!-- SEÇÃO: 🌟 REESCRITA NOTA 1000 PEDAGÓGICA DO PARÁGRAFO MAIS FRACO -->
            <div
              v-if="aiResult.weakestParagraph && aiResult.weakestParagraph.reescritaNota1000"
              class="rounded-3xl border-2 border-amber-300 dark:border-amber-800 bg-gradient-to-b from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-950 p-6 sm:p-8 shadow-md shadow-amber-900/5 space-y-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 dark:border-amber-900/50 pb-4">
                <div class="flex items-center gap-2.5">
                  <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
                    <span class="material-symbols-rounded text-2xl">star</span>
                  </span>
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Pedagogia Ativa &bull; Salto para a Nota 1000
                    </span>
                    <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                      Como transformar seu {{ aiResult.weakestParagraph.titulo }} em Nota 1000
                    </h3>
                  </div>
                </div>

                <span class="rounded-xl bg-amber-100 dark:bg-amber-950 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Parágrafo mais fraco detectado
                </span>
              </div>

              <!-- Diagnóstico do Parágrafo -->
              <div class="rounded-2xl bg-amber-100/60 dark:bg-amber-950/60 p-3.5 border border-amber-200/70 dark:border-amber-900/50 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
                <strong>O que limitou sua nota neste parágrafo:</strong> {{ aiResult.weakestParagraph.motivoPerdaNota }}
              </div>

              <!-- Comparativo Lado a Lado -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Original -->
                <div class="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 p-5 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase text-red-700 dark:text-red-400 flex items-center gap-1">
                      <span class="material-symbols-rounded text-base">close</span>
                      Seu texto original
                    </span>
                  </div>
                  <p class="font-serif text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed italic">
                    "{{ aiResult.weakestParagraph.textoOriginal || 'Trecho original do desenvolvimento' }}"
                  </p>
                </div>

                <!-- Reescrita Nota 1000 -->
                <div class="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 space-y-2 shadow-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span class="material-symbols-rounded text-base">check_circle</span>
                      Versão reescrita Nota 1000
                    </span>
                    <span class="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                      Modelo INEP
                    </span>
                  </div>
                  <p class="font-serif text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 font-medium leading-relaxed">
                    {{ aiResult.weakestParagraph.reescritaNota1000 }}
                  </p>
                </div>
              </div>

              <!-- Explicação Pedagógica -->
              <div v-if="aiResult.weakestParagraph.explicacaoPedagogica" class="rounded-2xl bg-white dark:bg-zinc-900 p-4 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                <span class="font-bold text-amber-700 dark:text-amber-400 block mb-1">💡 Lição Pedagógica para as próximas redações:</span>
                {{ aiResult.weakestParagraph.explicacaoPedagogica }}
              </div>
            </div>

            <!-- DETALHAMENTO DAS 5 COMPETÊNCIAS -->
            <div class="space-y-4">
              <h3 class="text-lg font-black text-[var(--student-text)] flex items-center gap-2">
                <span class="material-symbols-rounded text-xl text-purple-600">checklist</span>
                Detalhamento por Competência (0 a 200 pts)
              </h3>

              <div class="grid grid-cols-1 gap-4">
                <div
                  v-for="(comp, key, index) in aiResult.competencies"
                  :key="key"
                  class="rounded-2xl border border-[var(--student-border)] bg-[var(--student-card)] p-5 sm:p-6 transition hover:shadow-md"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 font-black text-sm">
                        C{{ index + 1 }}
                      </span>
                      <div>
                        <h4 class="text-sm sm:text-base font-bold text-[var(--student-text)]">
                          {{ comp.name }}
                        </h4>
                        <p class="text-xs text-[var(--student-text-secondary)]">
                          {{ comp.level }}
                        </p>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="text-xl font-black text-purple-600">{{ comp.score }}</span>
                      <span class="text-xs text-[var(--student-text-muted)] font-bold"> / 200</span>
                    </div>
                  </div>

                  <!-- Barra de Progresso da Competência -->
                  <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--student-bg)]">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="comp.score >= 160 ? 'bg-emerald-500' : comp.score >= 120 ? 'bg-indigo-500' : 'bg-amber-500'"
                      :style="{ width: `${(comp.score / 200) * 100}%` }"
                    ></div>
                  </div>

                  <p class="mt-3 text-xs sm:text-sm text-[var(--student-text)] font-medium leading-relaxed">
                    {{ comp.feedback }}
                  </p>

                  <!-- C1: Falhas Estruturais (Truncamento / Justaposição) -->
                  <div v-if="key === 'c1' && comp.falhasSintaticas && comp.falhasSintaticas.length > 0" class="mt-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900/50">
                    <span class="text-xs font-black uppercase text-rose-700 dark:text-rose-400 block mb-1.5 flex items-center gap-1">
                      <span class="material-symbols-rounded text-sm">warning</span>
                      Falha na Estrutura Sintática (Truncamento / Justaposição):
                    </span>
                    <div v-for="(fs, fidx) in comp.falhasSintaticas" :key="fidx" class="text-xs text-rose-900 dark:text-rose-200 mt-1">
                      <p class="font-semibold italic">"{{ fs.trecho }}"</p>
                      <p class="text-[11px] opacity-80">{{ fs.tipo }}: {{ fs.explicacao }}</p>
                    </div>
                  </div>

                  <!-- C2: Abordagem Temática e Repertórios Socioculturais -->
                  <div v-if="key === 'c2'" class="mt-3.5 space-y-2.5">
                    <div v-if="comp.temaStatus" class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="font-bold text-[var(--student-text-secondary)]">Abordagem Temática:</span>
                      <span
                        class="rounded-lg px-2.5 py-0.5 font-black uppercase text-[10px]"
                        :class="comp.temaStatus === 'COMPLETA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'"
                      >
                        {{ comp.temaStatus === 'COMPLETA' ? 'Abordagem Completa' : 'Alerta de Tangenciamento' }}
                      </span>
                      <span v-if="comp.temaAnalise" class="text-slate-600 dark:text-zinc-400 text-[11px]">{{ comp.temaAnalise }}</span>
                    </div>

                    <div v-if="comp.repertorios && comp.repertorios.length > 0" class="rounded-xl bg-purple-50/50 dark:bg-purple-950/20 p-3 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
                      <span class="text-xs font-black uppercase text-purple-700 dark:text-purple-300 block">
                        Repertórios Socioculturais Auditados (Tríade INEP):
                      </span>
                      <div v-for="(rep, ridx) in comp.repertorios" :key="ridx" class="rounded-lg bg-white dark:bg-zinc-900 p-2.5 border border-purple-100 dark:border-purple-900/40 text-xs space-y-1">
                        <div class="flex flex-wrap items-center justify-between gap-1">
                          <span class="font-bold text-purple-900 dark:text-purple-200 italic">"{{ rep.texto }}"</span>
                          <span class="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded">{{ rep.fonteArea }}</span>
                        </div>
                        <div class="flex items-center gap-3 text-[10px] font-black pt-1">
                          <span :class="rep.legitimado ? 'text-emerald-600' : 'text-slate-400'">Legitimado: {{ rep.legitimado ? 'Sim' : 'Não' }}</span>
                          <span :class="rep.pertinente ? 'text-emerald-600' : 'text-slate-400'">Pertinente: {{ rep.pertinente ? 'Sim' : 'Não' }}</span>
                          <span :class="rep.produtivo ? 'text-emerald-600' : 'text-amber-500'">Produtivo: {{ rep.produtivo ? 'Sim' : 'Pouco produtivo' }}</span>
                        </div>
                        <p v-if="rep.analise" class="text-[11px] text-[var(--student-text-secondary)]">{{ rep.analise }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- C3: Tese e Lacunas Argumentativas -->
                  <div v-if="key === 'c3'" class="mt-3.5 space-y-2">
                    <div v-if="comp.teseIdentificada" class="rounded-xl bg-amber-50/60 dark:bg-amber-950/30 p-2.5 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <span class="font-black text-amber-800 dark:text-amber-300 block mb-0.5">Tese Central Identificada:</span>
                      <p class="font-medium text-amber-900 dark:text-amber-200 italic">"{{ comp.teseIdentificada }}"</p>
                    </div>

                    <div v-if="comp.lacunasArgumentativas && comp.lacunasArgumentativas.length > 0" class="rounded-xl bg-rose-50/60 dark:bg-rose-950/20 p-3 border border-rose-200 dark:border-rose-900/40 space-y-2">
                      <span class="text-xs font-black uppercase text-rose-700 dark:text-rose-400 block flex items-center gap-1">
                        <span class="material-symbols-rounded text-sm">report_problem</span>
                        Lacunas Argumentativas (Ideias sem causa/consequência explicada):
                      </span>
                      <div v-for="(lac, lidx) in comp.lacunasArgumentativas" :key="lidx" class="rounded-lg bg-white dark:bg-zinc-900 p-2.5 border border-rose-100 dark:border-rose-900/40 text-xs space-y-1">
                        <p class="font-bold text-rose-900 dark:text-rose-300 italic">"{{ lac.trecho }}"</p>
                        <p class="text-[11px] text-slate-700 dark:text-zinc-300"><strong>Problema:</strong> {{ lac.explicacao }}</p>
                        <p class="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold"><strong>Como resolver:</strong> {{ lac.comoResolver }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- C4: Conectivos Interparágrafos e Repetições -->
                  <div v-if="key === 'c4'" class="mt-3.5 space-y-2.5">
                    <div v-if="comp.conectivosInter" class="rounded-xl bg-blue-50/60 dark:bg-blue-950/30 p-3 border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="font-black uppercase text-blue-800 dark:text-blue-300">Conectivos Interparágrafos (Exigência do INEP):</span>
                        <span
                          class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                          :class="comp.conectivosInter.atendeMinimoDois ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'"
                        >
                          {{ comp.conectivosInter.atendeMinimoDois ? 'Atende ao Mínimo (2+)' : 'Abaixo do Mínimo' }}
                        </span>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div class="p-2 rounded bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                          <span class="text-[10px] font-bold text-slate-500 block">Início D1:</span>
                          <span class="font-black text-blue-700 dark:text-blue-300">{{ comp.conectivosInter.d1 || 'Não detectado' }}</span>
                        </div>
                        <div class="p-2 rounded bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                          <span class="text-[10px] font-bold text-slate-500 block">Início D2 (Obrigatório):</span>
                          <span class="font-black" :class="comp.conectivosInter.d2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">{{ comp.conectivosInter.d2 || 'Ausente' }}</span>
                        </div>
                        <div class="p-2 rounded bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                          <span class="text-[10px] font-bold text-slate-500 block">Início Conclusão (Obrigatório):</span>
                          <span class="font-black" :class="comp.conectivosInter.conclusao ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">{{ comp.conectivosInter.conclusao || 'Ausente' }}</span>
                        </div>
                      </div>
                    </div>

                    <div v-if="comp.repeticoesViciosas && comp.repeticoesViciosas.length > 0" class="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 p-2.5 border border-amber-200 dark:border-amber-900/40 text-xs">
                      <span class="font-black text-amber-800 dark:text-amber-300 block mb-1">Repetições Viciosas Identificadas:</span>
                      <div class="flex flex-wrap gap-2">
                        <span v-for="(rep, repIdx) in comp.repeticoesViciosas" :key="repIdx" class="bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-amber-200 text-[11px]">
                          <strong>"{{ rep.palavra }}"</strong> ({{ rep.ocorrencias }}x) &bull; Sinônimos: {{ rep.sinonimos?.slice(0, 3).join(', ') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- C5: Detalhamento dos 5 Elementos Obrigatórios -->
                  <div v-if="key === 'c5'" class="mt-4 space-y-3">
                    <div class="rounded-xl bg-[var(--student-bg)] p-3.5 border border-[var(--student-border)]">
                      <span class="text-xs font-black uppercase text-[var(--student-text-secondary)] block mb-2.5">
                        Auditoria dos 5 Elementos Obrigatórios (40 pontos cada):
                      </span>
                      <div class="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                        <div
                          v-for="(elem, eName) in comp.elementosDetalhados || {}"
                          :key="eName"
                          class="p-2.5 rounded-lg border text-left"
                          :class="elem.presente ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-red-50/50 border-red-200 dark:bg-red-950/30 dark:border-red-900'"
                        >
                          <div class="flex items-center justify-between mb-1">
                            <span class="font-black capitalize text-[11px]" :class="elem.presente ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                              {{ eName }}
                            </span>
                            <span class="text-[10px] font-black" :class="elem.presente ? 'text-emerald-600' : 'text-red-500'">
                              {{ elem.presente ? '40 pts' : '0 pts' }}
                            </span>
                          </div>
                          <p v-if="elem.trecho" class="text-[10px] text-slate-700 dark:text-zinc-300 italic truncate font-serif">"{{ elem.trecho }}"</p>
                          <p v-else class="text-[10px] text-red-600 dark:text-red-400 italic">Não identificado</p>
                        </div>
                      </div>
                    </div>

                    <div v-if="comp.propostaCompletaSugerida" class="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <span class="font-black text-emerald-800 dark:text-emerald-300 block mb-1">💡 Sugestão de Proposta Nota 200 Completa:</span>
                      <p class="font-serif text-slate-800 dark:text-zinc-200 leading-relaxed italic">"{{ comp.propostaCompletaSugerida }}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DESVIOS GRAMATICAIS IDENTIFICADOS -->
            <div
              v-if="aiResult.grammarErrors && aiResult.grammarErrors.length > 0"
              class="rounded-3xl border border-[var(--student-border)] bg-[var(--student-card)] p-6 sm:p-8"
            >
              <div class="flex items-center gap-2 mb-4">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <span class="material-symbols-rounded text-lg">spellcheck</span>
                </span>
                <h3 class="text-base sm:text-lg font-black text-[var(--student-text)]">
                  Desvios Gramaticais e Sugestões ({{ aiResult.grammarErrors.length }})
                </h3>
              </div>

              <div class="space-y-3">
                <div
                  v-for="(err, idx) in aiResult.grammarErrors"
                  :key="idx"
                  class="rounded-2xl border border-[var(--student-border)] bg-[var(--student-bg)] p-4 text-xs sm:text-sm"
                >
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2">
                      <span v-if="err.line" class="rounded-md bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-700 dark:text-purple-300">
                        Linha {{ err.line }}
                      </span>
                      <span class="rounded-md bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700 dark:text-rose-400">
                        {{ err.type || 'Desvio Gramatical' }}
                      </span>
                    </div>

                    <button
                      type="button"
                      @click="editorViewMode = 'WRITE'"
                      class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      <span class="material-symbols-rounded text-xs">edit</span>
                      <span>Corrigir no Editor</span>
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                    <div class="rounded-xl bg-red-50/50 dark:bg-red-950/20 p-2.5 border border-red-200/50 dark:border-red-900/30">
                      <span class="text-[10px] font-black uppercase text-red-600 block mb-1">Como você escreveu:</span>
                      <p class="font-serif text-red-700 dark:text-red-400 font-semibold line-through">
                        "{{ err.original }}"
                      </p>
                    </div>

                    <div class="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 border border-emerald-200/50 dark:border-emerald-900/30">
                      <span class="text-[10px] font-black uppercase text-emerald-600 block mb-1">Sugestão recomendada:</span>
                      <p class="font-serif text-emerald-700 dark:text-emerald-400 font-semibold">
                        "{{ err.suggestion }}"
                      </p>
                    </div>
                  </div>

                  <p class="text-xs text-[var(--student-text-secondary)] italic">
                    <strong>Motivo:</strong> {{ err.explanation }}
                  </p>
                </div>
              </div>
            </div>

            <!-- PONTOS FORTES E OPORTUNIDADES -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="rounded-3xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 sm:p-7">
                <h4 class="text-sm font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <span class="material-symbols-rounded text-lg">thumb_up</span>
                  Pontos Fortes do Texto
                </h4>
                <ul class="mt-4 space-y-2.5">
                  <li
                    v-for="(p, i) in aiResult.positivePoints"
                    :key="i"
                    class="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--student-text)] font-medium"
                  >
                    <span class="material-symbols-rounded text-base text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                    <span>{{ p }}</span>
                  </li>
                </ul>
              </div>

              <div class="rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-6 sm:p-7">
                <h4 class="text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span class="material-symbols-rounded text-lg">trending_up</span>
                  Próximos Passos para a Nota 1000
                </h4>
                <ul class="mt-4 space-y-2.5">
                  <li
                    v-for="(imp, i) in aiResult.improvements"
                    :key="i"
                    class="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--student-text)] font-medium"
                  >
                    <span class="material-symbols-rounded text-base text-amber-600 shrink-0 mt-0.5">arrow_upward</span>
                    <span>{{ imp }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- BOTÃO INFERIOR PARA VOLTAR AO EDITOR -->
            <div class="flex items-center justify-center pt-2 pb-6">
              <button
                type="button"
                @click="editorViewMode = 'WRITE'"
                class="inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 text-sm font-black shadow-lg shadow-purple-600/25 transition cursor-pointer"
              >
                <span class="material-symbols-rounded text-lg">edit</span>
                <span>Voltar ao Editor e Continuar Escrevendo</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Drawer Lateral: Banco de Conectivos e Operadores Argumentativos C4 -->
    <Teleport to="body">
      <Transition name="slide">
        <div v-if="showConnectorsDrawer" class="fixed inset-0 z-50 flex justify-end">
          <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs" @click="showConnectorsDrawer = false"></div>
          <div class="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 font-sans">
            <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-purple-50/50">
              <div class="flex items-center gap-2 text-purple-800">
                <span class="material-symbols-rounded text-xl">link</span>
                <div>
                  <h3 class="text-sm font-black text-slate-900">Banco de Conectivos ENEM</h3>
                  <p class="text-[11px] text-purple-700">Operadores Argumentativos para a Competência 4</p>
                </div>
              </div>
              <button
                type="button"
                @click="showConnectorsDrawer = false"
                class="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition"
              >
                <span class="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div
                v-for="(cat, idx) in strategicConnectors"
                :key="idx"
                class="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2"
              >
                <span class="text-xs font-black text-purple-900 block">
                  {{ cat.category }}
                </span>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="item in cat.items"
                    :key="item"
                    class="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs select-all hover:border-purple-300 transition"
                  >
                    {{ item }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Folha Pautada Oficial do ENEM - 30 Linhas com Altura Estrita de 36px */
textarea.enem-ruled-textarea {
  display: block;
  width: 100%;
  line-height: 36px !important;
  padding: 0 8px !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  min-height: 1080px !important; /* 30 linhas do ENEM x 36px */
  background-color: transparent !important;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 35px,
    rgba(147, 197, 253, 0.45) 35px,
    rgba(147, 197, 253, 0.45) 36px
  ) !important;
  background-size: 100% 36px !important;
  background-position: 0 0 !important;
  background-attachment: local !important;
  resize: none !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.005em;
  text-align: justify !important;
  text-justify: inter-word !important;
  text-align-last: left !important;
  hyphens: auto !important;
  -webkit-hyphens: auto !important;
  -ms-hyphens: auto !important;
  word-break: normal !important;
  overflow-wrap: break-word !important;
}

@media (min-width: 640px) {
  textarea.enem-ruled-textarea {
    padding: 0 12px !important;
  }
}

:global(.dark) textarea.enem-ruled-textarea {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 35px,
    rgba(129, 140, 248, 0.25) 35px,
    rgba(129, 140, 248, 0.25) 36px
  ) !important;
}

textarea.enem-ruled-textarea::placeholder {
  color: #94a3b8;
  line-height: 36px !important;
  text-align: left !important;
}

</style>
