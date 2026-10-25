import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

// Matérias Específicas do Conecta-Enem (em vez de apenas 4 grandes áreas)
const DETAILED_SUBJECTS = {
  matematica: {
    name: 'Matemática',
    slug: 'matematica',
    description: 'Álgebra, Geometria, Estatística, Probabilidade e Funções',
    order: 1
  },
  biologia: {
    name: 'Biologia',
    slug: 'biologia',
    description: 'Citologia, Genética, Ecologia, Fisiologia e Evolução',
    order: 2
  },
  fisica: {
    name: 'Física',
    slug: 'fisica',
    description: 'Mecânica, Termodinâmica, Ondulatória, Óptica e Eletricidade',
    order: 3
  },
  quimica: {
    name: 'Química',
    slug: 'quimica',
    description: 'Química Geral, Físico-Química, Química Orgânica e Meio Ambiente',
    order: 4
  },
  historia: {
    name: 'História',
    slug: 'historia',
    description: 'História do Brasil, História Geral e Contemporânea',
    order: 5
  },
  geografia: {
    name: 'Geografia',
    slug: 'geografia',
    description: 'Geografia Física, Humana, Econômica, Geopolítica e Meio Ambiente',
    order: 6
  },
  filosofia: {
    name: 'Filosofia',
    slug: 'filosofia',
    description: 'Ética, Política, Epistemologia, Teoria do Conhecimento e Moral',
    order: 7
  },
  sociologia: {
    name: 'Sociologia',
    slug: 'sociologia',
    description: 'Cultura, Sociedade, Trabalho, Cidadania e Movimentos Sociais',
    order: 8
  },
  portugues: {
    name: 'Português & Literatura',
    slug: 'portugues',
    description: 'Interpretação de Texto, Gramática Aplicada, Gêneros Textuais e Literatura',
    order: 9
  },
  ingles: {
    name: 'Língua Inglesa',
    slug: 'ingles',
    description: 'Interpretação e Leitura Instrumental em Língua Inglesa',
    order: 10
  },
  espanhol: {
    name: 'Língua Espanhola',
    slug: 'espanhol',
    description: 'Interpretação e Leitura Instrumental em Língua Espanhola',
    order: 11
  },
  artes: {
    name: 'Artes & Educação Física',
    slug: 'artes',
    description: 'História da Arte, Vanguardas Europeias, Expressão Corporal e Cultura',
    order: 12
  }
}

// Dicionário de palavras-chave para classificação precisa de Ciências da Natureza
const NATUREZA_KEYWORDS = {
  fisica: [
    'velocidade', 'aceleração', 'aceleracao', 'força', 'forca', 'atrito', 'gravidade', 'massa',
    'cinética', 'cinetica', 'potencial', 'joule', 'newton', 'trajetória', 'trajetoria', 'movimento',
    'circuito', 'corrente', 'tensão', 'tensao', 'volt', 'ampère', 'ampere', 'resistor', 'resistência',
    'potência', 'potencia', 'magnético', 'magnetico', 'ímã', 'ima', 'campo elétrico', 'eletrostática',
    'onda', 'frequência', 'frequencia', 'hertz', 'comprimento de onda', 'som', 'acústica', 'acustica',
    'reflexão', 'reflexao', 'refração', 'refracao', 'luz', 'óptica', 'optica', 'espelho', 'lente',
    'calor', 'calorimetria', 'termodinâmica', 'termodinamica', 'temperatura', 'kelvin', 'celsius',
    'pressão', 'pressao', 'empuxo', 'hidrostática', 'hidrostatica', 'densidade', 'tração', 'tracao'
  ],
  quimica: [
    'átomo', 'atomo', 'elétron', 'eletron', 'próton', 'proton', 'mol', 'molar', 'massa molar',
    'reação', 'reacao', 'reagente', 'produto', 'estequiometria', 'balanceamento', 'ligação química',
    'ácido', 'acido', 'base', 'ph', 'sal', 'óxido', 'oxido', 'solução', 'solucao', 'concentração',
    'solvente', 'soluto', 'equilíbrio químico', 'le chatelier', 'cinética química', 'catalisador',
    'oxidação', 'oxidacao', 'redução', 'reducao', 'oxirredução', 'pilha', 'eletrólise', 'eletrolise',
    'ânodo', 'anodo', 'cátodo', 'catodo', 'tabela periódica', 'metal', 'ametal', 'carbono', 'orgânica',
    'organica', 'hidrocarboneto', 'álcool', 'alcool', 'função orgânica', 'polímero', 'polimero',
    'termoquímica', 'entalpia', 'exotérmica', 'endotérmica', 'isomeria', 'destilação', 'mistura'
  ],
  biologia: [
    'célula', 'celula', 'dna', 'rna', 'gene', 'genética', 'genetica', 'mutação', 'mutacao', 'alelo',
    'cromossomo', 'mitose', 'meiose', 'fotossíntese', 'fotossintese', 'mitocôndria', 'mitocondria',
    'respiração celular', 'cloroplasto', 'ecologia', 'ecossistema', 'cadeia alimentar', 'teia alimentar',
    'trófico', 'trofico', 'nicho', 'hábitat', 'habitat', 'biodiversidade', 'bioma', 'espécie', 'especie',
    'evolução', 'evolucao', 'darwin', 'seleção natural', 'selecao natural', 'adaptação', 'adaptacao',
    'vírus', 'virus', 'bactéria', 'bacteria', 'fungo', 'protozoário', 'protozoario', 'vacina',
    'imunidade', 'anticorpo', 'soro', 'órgão', 'orgao', 'sangue', 'coração', 'coracao', 'pulmão',
    'fisiologia', 'neurônio', 'neuronio', 'hormônio', 'hormonio', 'digestão', 'digestao', 'enzima',
    'planta', 'vegetal', 'angiosperma', 'gimnosperma', 'xilema', 'floema', 'polinização', 'zoologia'
  ]
}

// Dicionário de palavras-chave para classificação precisa de Ciências Humanas
const HUMANAS_KEYWORDS = {
  filosofia: [
    'filósofo', 'filosofo', 'filosofia', 'platão', 'platao', 'aristóteles', 'aristoteles', 'sócrates',
    'socrates', 'kant', 'descartes', 'sêneca', 'seneca', 'nietzsche', 'hegel', 'spinoza', 'locke',
    'hobbes', 'rousseau', 'maquiavel', 'ética', 'etica', 'moral', 'razão', 'razao', 'epistemologia',
    'metafísica', 'metafisica', 'ontologia', 'lógica', 'logica', 'verdade', 'virtude', 'justiça',
    'conhecimento', 'existencialismo', 'iluminismo', 'racionalismo', 'empirismo', 'mito', 'pólis', 'polis'
  ],
  sociologia: [
    'sociólogo', 'sociologo', 'sociologia', 'marx', 'weber', 'durkheim', 'foucault', 'habermas',
    'bauman', 'bourdieu', 'sociedade', 'classe social', 'estratificação', 'estratificacao', 'trabalho',
    'alienação', 'alienacao', 'anomia', 'fato social', 'ação social', 'acao social', 'capitalismo',
    'burguesia', 'proletariado', 'desigualdade', 'movimentos sociais', 'identidade', 'gênero', 'genero',
    'etnia', 'racismo', 'cidadania', 'instituição social', 'cultura de massa', 'indústria cultural'
  ],
  geografia: [
    'geografia', 'clima', 'relevo', 'vegetação', 'vegetacao', 'cerrado', 'caatinga', 'amazônia', 'amazonia',
    'pantanal', 'mata atlântica', 'pampa', 'bacia hidrográfica', 'hidrografica', 'rio', 'aquífero',
    'placas tectônicas', 'vulcanismo', 'terremoto', 'solo', 'erosão', 'erosao', 'urbanização', 'urbanizacao',
    'metrópole', 'metropole', 'migração', 'migracao', 'imigração', 'emigração', 'demografia', 'população',
    'agronegócio', 'agronegocio', 'agricultura', 'pecuária', 'commodities', 'globalização', 'globalizacao',
    'geopolítica', 'geopolitica', 'fronteira', 'latitude', 'longitude', 'massa de ar', 'efeito estufa'
  ],
  historia: [
    'século', 'seculo', 'império', 'imperio', 'colônia', 'colonia', 'república', 'republica', 'monarquia',
    'escravidão', 'escravidao', 'escravo', 'quilombo', 'ditadura', 'golpe', 'constituição', 'constituicao',
    'revolução', 'revolucao', 'guerra', 'batalha', 'independência', 'independencia', 'idade média', 'feudalismo',
    'antiguidade', 'roma', 'grécia', 'grecia', 'renascimento', 'reforma protestante', 'era vargas',
    'getúlio vargas', 'juscelino kubitschek', 'regime militar', 'censura', 'tratado', 'pacto colonial',
    'abolição', 'abolicionismo', 'guerra fria', 'primeira guerra', 'segunda guerra', 'nazismo', 'fascismo'
  ]
}

// Dicionário para Linguagens
const LINGUAGENS_KEYWORDS = {
  artes: [
    'arte', 'pintura', 'escultura', 'quadro', 'tela', 'museu', 'modernismo', 'vanguarda', 'cubismo',
    'surrealismo', 'expressionismo', 'dadaísmo', 'futurismo', 'barroco', 'renascentista', 'estética',
    'artista', 'semana de arte moderna', 'dança', 'danca', 'teatro', 'expressão corporal', 'música', 'musica'
  ]
}

function countKeywords(text, keywords) {
  let score = 0
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    // Busca por palavra inteira ou termo
    const regex = new RegExp(`\\b${kw}`, 'gi')
    const matches = lower.match(regex)
    if (matches) score += matches.length
  }
  return score
}

// Determina a Matéria Específica a partir da disciplina oficial da API e do conteúdo da questão
function identifyDetailedSubject(q) {
  const discipline = q.discipline
  const language = q.language?.toLowerCase()
  const text = `${q.context || ''} ${q.alternativesIntroduction || ''} ${q.title || ''}`

  // 1. Língua Estrangeira (Inglês ou Espanhol)
  if (language === 'ingles' || (discipline === 'linguagens' && q.index <= 5 && language === 'ingles')) {
    return 'ingles'
  }
  if (language === 'espanhol' || (discipline === 'linguagens' && q.index <= 5 && language === 'espanhol')) {
    return 'espanhol'
  }

  // 2. Matemática
  if (discipline === 'matematica') {
    return 'matematica'
  }

  // 3. Ciências da Natureza: Física, Química ou Biologia
  if (discipline === 'ciencias-natureza') {
    const scoreFisica = countKeywords(text, NATUREZA_KEYWORDS.fisica)
    const scoreQuimica = countKeywords(text, NATUREZA_KEYWORDS.quimica)
    const scoreBiologia = countKeywords(text, NATUREZA_KEYWORDS.biologia)

    if (scoreFisica > scoreQuimica && scoreFisica > scoreBiologia) return 'fisica'
    if (scoreQuimica > scoreFisica && scoreQuimica > scoreBiologia) return 'quimica'
    if (scoreBiologia > 0) return 'biologia'

    // Heurística de fallback equilibrada
    const mod = q.index % 3
    if (mod === 0) return 'fisica'
    if (mod === 1) return 'quimica'
    return 'biologia'
  }

  // 4. Ciências Humanas: História, Geografia, Filosofia ou Sociologia
  if (discipline === 'ciencias-humanas') {
    const scoreFilo = countKeywords(text, HUMANAS_KEYWORDS.filosofia)
    const scoreSocio = countKeywords(text, HUMANAS_KEYWORDS.sociologia)
    const scoreGeo = countKeywords(text, HUMANAS_KEYWORDS.geografia)
    const scoreHist = countKeywords(text, HUMANAS_KEYWORDS.historia)

    if (scoreFilo > scoreSocio && scoreFilo > scoreGeo && scoreFilo > scoreHist) return 'filosofia'
    if (scoreSocio > scoreFilo && scoreSocio > scoreGeo && scoreSocio > scoreHist) return 'sociologia'
    if (scoreGeo > scoreFilo && scoreGeo > scoreSocio && scoreGeo > scoreHist) return 'geografia'
    if (scoreHist > 0) return 'historia'

    const mod = q.index % 4
    if (mod === 0) return 'historia'
    if (mod === 1) return 'geografia'
    if (mod === 2) return 'filosofia'
    return 'sociologia'
  }

  // 5. Linguagens: Português & Literatura ou Artes
  if (discipline === 'linguagens') {
    const scoreArtes = countKeywords(text, LINGUAGENS_KEYWORDS.artes)
    if (scoreArtes >= 2) return 'artes'
    return 'portugues'
  }

  return 'portugues'
}

// Avalia a Dificuldade da Questão (EASY, MEDIUM, HARD) de forma realista
function calculateDifficulty(q) {
  const statement = `${q.context || ''} ${q.alternativesIntroduction || ''}`
  const length = statement.length

  // Questões com cálculo complexo, fórmulas ou muitos números costumam ter maior taxa de erro
  const hasFormulas = /[0-9]+\s*[xX\+\-\*\/\^=]\s*[0-9]+|10\^|log|sen|cos|tg|Δ|λ|Ω|μ/i.test(statement)
  const hasMultipleTexts = /(?:TEXTO\s+[IVXLCDM\d]+)/i.test(statement)

  // Filosofia densa, Física e Estequiometria tendem a ser mais difíceis no ENEM
  const isHighDensitySubject = ['filosofia', 'fisica', 'quimica'].includes(q.discipline)

  if (length < 400 && !hasFormulas && !hasMultipleTexts) {
    return 'EASY'
  }

  if (length > 1400 || (hasFormulas && hasMultipleTexts) || (isHighDensitySubject && length > 1000)) {
    return 'HARD'
  }

  // Distribuição equilibrada baseada no índice para simular a TRI do ENEM (~25% EASY, 50% MEDIUM, 25% HARD)
  const hash = (q.index * 7 + length) % 10
  if (hash <= 2) return 'EASY'
  if (hash >= 8) return 'HARD'
  return 'MEDIUM'
}

function getDatabaseConfig(connectionString) {
  try {
    const parsed = new URL(connectionString)
    const useSsl =
      parsed.searchParams.get('ssl-mode') === 'REQUIRED' ||
      parsed.searchParams.get('ssl') === 'true' ||
      parsed.hostname?.includes('aivencloud.com')

    const config = {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'conectar_enem',
      allowPublicKeyRetrieval: true,
      connectionLimit: 5,
      connectTimeout: 10000
    }

    if (useSsl) {
      config.ssl = { rejectUnauthorized: false }
    }

    return config
  } catch {
    return {
      connectionString,
      allowPublicKeyRetrieval: true
    }
  }
}

async function fetchQuestions(year) {
  console.log(`🌐 Buscando questões do ENEM ${year} na api.enem.dev...`)
  let allQuestions = []
  let offset = 0
  const limit = 50
  let hasMore = true

  while (hasMore) {
    const url = `https://api.enem.dev/v1/exams/${year}/questions?limit=${limit}&offset=${offset}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Falha ao buscar ENEM ${year}: HTTP ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const batch = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : [])
    if (batch.length === 0) break

    allQuestions.push(...batch)
    console.log(`   📦 Baixadas ${allQuestions.length} de ${data.metadata?.total || '?'} questões...`)

    offset += limit
    if (data.metadata?.hasMore === false || (data.metadata?.total && allQuestions.length >= data.metadata.total)) {
      hasMore = false
    }
  }

  return allQuestions
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada no arquivo .env')
  }

  const pool = mariadb.createPool(getDatabaseConfig(connectionString))
  const adapter = new PrismaMariaDb(pool)
  const prisma = new PrismaClient({ adapter })

  // Define os anos a importar via argumento CLI (ex: node prisma/seed-enem.js 2021 2022 2023 ou padrão 2023)
  const args = process.argv.slice(2)
  const yearsToImport = args.length > 0 
    ? args.map(Number).filter(Boolean) 
    : [2023]

  console.log(`\n🚀 Iniciando importação com separação por MATÉRIA e DIFICULDADE...`)
  console.log(`📅 Anos a processar: ${yearsToImport.join(', ')}`)

  try {
    // 1. Criar/atualizar todas as matérias específicas no banco
    console.log('\n📚 Sincronizando matérias escolares específicas...')
    const subjectCache = new Map()

    for (const [slugKey, sData] of Object.entries(DETAILED_SUBJECTS)) {
      const subject = await prisma.subject.upsert({
        where: { slug: sData.slug },
        update: {
          name: sData.name,
          description: sData.description,
          order: sData.order,
          active: true
        },
        create: {
          name: sData.name,
          slug: sData.slug,
          description: sData.description,
          order: sData.order,
          active: true
        }
      })
      subjectCache.set(slugKey, subject.id)
      console.log(`  ✔ Matéria pronta: ${sData.name}`)
    }

    // 2. Desativar as antigas 4 grandes áreas para que os alunos vejam apenas as matérias reais
    const oldAreaSlugs = ['ciencias-humanas', 'ciencias-natureza', 'linguagens']
    await prisma.subject.updateMany({
      where: { slug: { in: oldAreaSlugs } },
      data: { active: false }
    })

    // 3. Processar cada ano
    for (const year of yearsToImport) {
      console.log(`\n========================================`)
      console.log(`⏳ Processando ENEM ${year}...`)
      console.log(`========================================`)

      let apiQuestions = []
      try {
        apiQuestions = await fetchQuestions(year)
      } catch (err) {
        console.error(`❌ Erro ao baixar dados do ano ${year}:`, err.message)
        continue
      }

      console.log(`📋 Total de questões retornadas: ${apiQuestions.length}`)

      let importedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      const subjectDistribution = {}
      const difficultyDistribution = { EASY: 0, MEDIUM: 0, HARD: 0 }

      for (const q of apiQuestions) {
        const validLetters = ['A', 'B', 'C', 'D', 'E']
        const correctLetter = q.correctAlternative?.trim()?.toUpperCase()

        if (!correctLetter || !validLetters.includes(correctLetter)) {
          skippedCount++
          continue
        }

        // Identifica Matéria Específica e Dificuldade
        const detectedSlug = identifyDetailedSubject(q)
        const subjectId = subjectCache.get(detectedSlug) || subjectCache.get('portugues')
        const difficulty = calculateDifficulty(q)

        subjectDistribution[detectedSlug] = (subjectDistribution[detectedSlug] || 0) + 1
        difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1

        const title = q.title || `Questão ${q.index} - ENEM ${year}`

        let statementParts = []
        if (q.context && q.context.trim()) {
          statementParts.push(q.context.trim())
        }
        if (q.alternativesIntroduction && q.alternativesIntroduction.trim()) {
          statementParts.push(q.alternativesIntroduction.trim())
        }
        const statement = statementParts.join('\n\n') || `Questão do ENEM ${year}`

        const primaryImage = Array.isArray(q.files) && q.files.length > 0 ? q.files[0] : null
        const allImagesJson = Array.isArray(q.files) && q.files.length > 0 ? JSON.stringify(q.files) : null

        const existingQuestion = await prisma.question.findFirst({
          where: {
            year: Number(year),
            title: title
          },
          include: {
            options: true
          }
        })

        if (existingQuestion) {
          await prisma.question.update({
            where: { id: existingQuestion.id },
            data: {
              statement,
              correctAnswer: correctLetter,
              imageUrl: primaryImage,
              images: allImagesJson,
              subjectId,
              difficulty,
              active: true
            }
          })

          if (Array.isArray(q.alternatives) && q.alternatives.length > 0) {
            for (const alt of q.alternatives) {
              const letter = alt.letter?.trim()?.toUpperCase()
              if (!validLetters.includes(letter)) continue

              const existingOption = existingQuestion.options.find(o => o.letter === letter)
              if (existingOption) {
                await prisma.questionOption.update({
                  where: { id: existingOption.id },
                  data: {
                    text: alt.text || '',
                    imageUrl: alt.file || null
                  }
                })
              } else {
                await prisma.questionOption.create({
                  data: {
                    questionId: existingQuestion.id,
                    letter,
                    text: alt.text || '',
                    imageUrl: alt.file || null
                  }
                })
              }
            }
          }

          updatedCount++
        } else {
          const alternativesData = (Array.isArray(q.alternatives) ? q.alternatives : [])
            .filter(alt => validLetters.includes(alt.letter?.trim()?.toUpperCase()))
            .map(alt => ({
              letter: alt.letter.trim().toUpperCase(),
              text: alt.text || '',
              imageUrl: alt.file || null
            }))

          await prisma.question.create({
            data: {
              subjectId,
              title,
              statement,
              difficulty,
              year: Number(year),
              correctAnswer: correctLetter,
              imageUrl: primaryImage,
              images: allImagesJson,
              active: true,
              options: {
                create: alternativesData
              }
            }
          })

          importedCount++
        }
      }

      console.log(`\n✔ ENEM ${year} processado com sucesso!`)
      console.log(`   ➕ Novas: ${importedCount}`)
      console.log(`   🔄 Atualizadas com matéria e dificuldade: ${updatedCount}`)
      console.log(`   ⏭ Ignoradas (sem gabarito/anuladas): ${skippedCount}`)
      console.log(`\n📊 Distribuição por Dificuldade:`)
      console.log(`   🟢 Fácil: ${difficultyDistribution.EASY}`)
      console.log(`   🟡 Média: ${difficultyDistribution.MEDIUM}`)
      console.log(`   🔴 Difícil: ${difficultyDistribution.HARD}`)
      console.log(`\n📚 Distribuição por Matéria Específica:`)
      for (const [sKey, sCount] of Object.entries(subjectDistribution)) {
        console.log(`   - ${DETAILED_SUBJECTS[sKey]?.name || sKey}: ${sCount} questões`)
      }
    }

    console.log(`\n🎉 Classificação concluída com sucesso!`)
  } catch (error) {
    console.error(`\n❌ Erro durante o processo:`, error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
