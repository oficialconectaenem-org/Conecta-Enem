/**
 * Classificador de Matérias de Alta Precisão para Questões do ENEM
 * Mapeia conteúdos para os 12 componentes curriculares oficiais do Conecta-ENEM:
 * - matematica
 * - fisica
 * - quimica
 * - biologia
 * - historia
 * - geografia
 * - filosofia
 * - sociologia
 * - portugues (Português & Literatura)
 * - ingles (Língua Inglesa)
 * - espanhol (Língua Espanhola)
 * - artes (Artes & Educação Física)
 */

export const SUBJECT_KEYWORDS = {
  matematica: [
    'função', 'equação', 'geometria', 'triângulo', 'cálculo', 'probabilidade', 'estatística',
    'porcentagem', 'gráfico', 'volume', 'área', 'perímetro', 'raio', 'diâmetro', 'ângulo',
    'seno', 'cosseno', 'tangente', 'trigonometria', 'polígono', 'matriz', 'determinante',
    'progressão aritmética', 'progressão geométrica', 'logaritmo', 'fatorial', 'combinatória',
    'permutação', 'arranjo', 'razão', 'proporção', 'regra de três', 'juros', 'montante',
    'prisma', 'cilindro', 'cone', 'esfera', 'pirâmide', 'aresta', 'vértice', 'mediana',
    'moda', 'desvio padrão', 'variância', 'plano cartesiano', 'abscissa', 'ordenada',
    'inequação', 'polinômio', 'circunferência', 'retângulo', 'quadrado', 'trapézio', 'losango'
  ],

  fisica: [
    'velocidade', 'aceleração', 'm/s', 'km/h', 'movimento retilíneo', 'queda livre', 'força',
    'newton', 'atrito', 'gravidade', 'inércia', 'peso', 'massa', 'tração', 'trabalho',
    'joule', 'energia cinética', 'energia potencial', 'conservação da energia', 'potência',
    'watt', 'rendimento', 'quantidade de movimento', 'impulso', 'colisão', 'eletrostática',
    'carga elétrica', 'coulomb', 'campo elétrico', 'potencial elétrico', 'corrente elétrica',
    'ampère', 'ddp', 'tensão', 'volt', 'resistor', 'resistência', 'ohm', 'circuito elétrico',
    'gerador', 'potência elétrica', 'consumo de energia', 'kwh', 'eletromagnetismo', 'ímã',
    'campo magnético', 'força magnética', 'indução eletromagnética', 'faraday', 'transformador',
    'óptica', 'espelho', 'lente', 'foco', 'reflexão', 'refração', 'índice de refração',
    'dispersão', 'difração', 'interferência', 'polarização', 'onda', 'frequência', 'hertz',
    'comprimento de onda', 'amplitude', 'som', 'acústica', 'decibel', 'efeito doppler',
    'termologia', 'calor', 'caloria', 'temperatura', 'celsius', 'kelvin', 'calor específico',
    'dilatação térmica', 'calor latente', 'condução', 'convecção', 'irradiação', 'termodinâmica',
    'máquina térmica', 'carnot', 'hidrostática', 'pressão', 'pascal', 'empuxo', 'arquimedes', 'densidade'
  ],

  quimica: [
    'átomo', 'elétron', 'próton', 'nêutron', 'número atômico', 'tabela periódica', 'eletronegatividade',
    'ligação iônica', 'ligação covalente', 'ligação metálica', 'geometria molecular', 'polaridade',
    'força intermolecular', 'ligação de hidrogênio', 'solução', 'soluto', 'solvente', 'solubilidade',
    'concentração', 'molaridade', 'estequiometria', 'mol', 'massa molar', 'número de avogadro',
    'balanceamento', 'reagente limitante', 'ácido', 'base', 'sal', 'óxido', 'ph', 'poh',
    'neutralização', 'termoquímica', 'entalpia', 'exotérmica', 'endotérmica', 'lei de hess',
    'cinética química', 'catalisador', 'energia de ativação', 'equilíbrio químico', 'le chatelier',
    'eletroquímica', 'oxidação', 'redução', 'número de oxidação', 'nox', 'pilha', 'ânodo',
    'cátodo', 'eletrólise', 'química orgânica', 'carbono', 'hidrocarboneto', 'alcano', 'alceno',
    'alcino', 'aromático', 'benzeno', 'álcool', 'fenol', 'éter', 'aldeído', 'cetona',
    'ácido carboxílico', 'éster', 'amina', 'amida', 'isomeria', 'polímero', 'monômero',
    'destilação fracionada', 'petróleo', 'biocombustível', 'etanol', 'biodiesel', 'saponificação'
  ],

  biologia: [
    'célula', 'citologia', 'membrana plasmática', 'osmose', 'citoplasma', 'organela', 'ribossomo',
    'mitocôndria', 'cloroplasto', 'complexo de golgi', 'retículo endoplasmático', 'lisossomo',
    'núcleo celular', 'cromossomo', 'mitose', 'meiose', 'dna', 'rna', 'código genético', 'mutação',
    'transgênico', 'clonagem', 'metabolismo', 'respiração celular', 'glicólise', 'ciclo de krebs',
    'fermentação', 'fotossíntese', 'clorofila', 'atp', 'fisiologia humana', 'digestão', 'enzima',
    'sistema respiratório', 'alvéolo', 'sistema circulatório', 'coração', 'sangue', 'hemácias',
    'sistema excretor', 'rim', 'néfron', 'sistema nervoso', 'neurônio', 'sinapse', 'neurotransmissor',
    'sistema endócrino', 'hormônio', 'insulina', 'adrenalina', 'tireoide', 'sistema imunológico',
    'anticorpo', 'antígeno', 'linfócito', 'vacina', 'soro', 'gameta', 'fecundação', 'genética',
    'mendel', 'alelo', 'genótipo', 'fenótipo', 'dominante', 'recessivo', 'sistema abo', 'fator rh',
    'herança genética', 'evolução', 'darwin', 'lamarck', 'seleção natural', 'especiação', 'fóssil',
    'ecologia', 'ecossistema', 'habitat', 'nicho ecológico', 'cadeia alimentar', 'teia alimentar',
    'produtores', 'consumidores', 'decompositores', 'nível trófico', 'ciclo da água', 'ciclo do carbono',
    'ciclo do nitrogênio', 'relações ecológicas', 'mutualismo', 'comensalismo', 'parasitismo', 'predatismo',
    'competição', 'bioma', 'cerrado', 'caatinga', 'mata atlântica', 'amazônia', 'pampa', 'pantanal',
    'eutrofização', 'efeito estufa', 'aquecimento global', 'desmatamento', 'biodiversidade',
    'vírus', 'bactéria', 'protozoário', 'fungo', 'dengue', 'chagas', 'vacinação'
  ],

  historia: [
    'século', 'historiografia', 'antiguidade', 'grécia antiga', 'roma antiga', 'império romano',
    'idade média', 'feudalismo', 'senhor feudal', 'servo', 'vassalagem', 'igreja medieval',
    'cruzadas', 'peste negra', 'renascimento cultural', 'reforma protestante', 'absolutismo',
    'mercantilismo', 'grandes navegações', 'colonização', 'américa portuguesa', 'capitanias hereditárias',
    'engenho', 'escravidão', 'tráfico negreiro', 'quilombo', 'palmares', 'inconfidência mineira',
    'iluminismo', 'revolução industrial', 'revolução francesa', 'queda da bastilha', 'jacobinos',
    'era napoleônica', 'independência dos eua', 'família real no brasil', 'independência do brasil',
    'dom pedro', 'primeiro reinado', 'segundo reinado', 'período regencial', 'farroupilha',
    'leis abolicionistas', 'lei áurea', 'proclamação da república', 'república velha', 'coronelismo',
    'política do café com leite', 'tenentismo', 'revolução de 1930', 'era vargas', 'estado novo',
    'clt', 'juscelino kubitschek', 'construção de brasília', 'ditadura militar', 'ai-5',
    'redemocratização', 'diretas já', 'constituição de 1988', 'primeira guerra mundial',
    'revolução russa', 'crise de 1929', 'fascismo', 'nazismo', 'hitler', 'segunda guerra mundial',
    'holocausto', 'guerra fria', 'muro de berlim', 'união soviética', 'descolonização'
  ],

  geografia: [
    'geopolítica', 'globalização', 'ordem mundial', 'blocos econômicos', 'mercosul', 'união europeia',
    'brics', 'cartografia', 'projeção cartográfica', 'escala cartográfica', 'coordenadas geográficas',
    'latitude', 'longitude', 'fuso horário', 'placas tectônicas', 'vulcanismo', 'terremoto',
    'relevo', 'planalto', 'planície', 'depressão', 'erosão', 'intemperismo', 'solo', 'arenização',
    'desertificação', 'clima', 'massa de ar', 'el niño', 'la niña', 'semiárido', 'equatorial',
    'subtropical', 'hidrografia', 'bacia hidrográfica', 'bacia amazônica', 'rio são francisco',
    'aquífero', 'domínio morfoclimático', 'urbanização', 'metrópole', 'megalópole', 'conurbação',
    'gentrificação', 'segregação socioespacial', 'favelização', 'demografia', 'densidade demográfica',
    'taxa de fecundidade', 'taxa de natalidade', 'transição demográfica', 'pirâmide etária',
    'migração', 'êxodo rural', 'imigração', 'refugiados', 'espaço agrário', 'agronegócio',
    'estrutura fundiária', 'reforma agrária', 'agricultura familiar', 'matriz energética',
    'combustíveis fósseis', 'petróleo', 'hidrelétrica', 'energia solar', 'energia eólica'
  ],

  filosofia: [
    'filósofo', 'filosofia', 'mito e razão', 'pré-socráticos', 'sócrates', 'maiêutica', 'ironia socrática',
    'sofistas', 'platão', 'mundo das ideias', 'mito da caverna', 'a república', 'aristóteles',
    'ética a nicômaco', 'justo meio', 'epicurismo', 'estoicismo', 'sêneca', 'ceticismo',
    'patrística', 'santo agostinho', 'escolástica', 'são tomás de aquino', 'fé e razão',
    'maquiavel', 'o príncipe', 'virtù', 'racionalismo', 'descartes', 'penso logo existo',
    'dúvida metódica', 'empirismo', 'john locke', 'tábula rasa', 'david hume', 'kant',
    'imperativo categórico', 'esclarecimento', 'aufklärung', 'contratualismo', 'estado de natureza',
    'contrato social', 'hobbes', 'leviatã', 'rousseau', 'bom selvagem', 'hegel', 'dialética',
    'nietzsche', 'moral de escravos', 'morte de deus', 'vontade de potência', 'existencialismo',
    'sartre', 'a existência precede a essência', 'beauvoir', 'albert camus', 'escola de frankfurt',
    'adorno', 'indústria cultural', 'walter benjamin', 'habermas', 'agir comunicativo',
    'hannah arendt', 'banalidade do mal', 'foucault', 'vigiar e punir', 'biopolítica', 'john rawls', 'utilitarismo'
  ],

  sociologia: [
    'sociólogo', 'sociologia', 'positivismo', 'auguste comte', 'durkheim', 'fato social',
    'coesão social', 'solidariedade mecânica', 'solidariedade orgânica', 'consciência coletiva',
    'anomia', 'suicídio', 'karl marx', 'materialismo histórico', 'luta de classes', 'burguesia',
    'proletariado', 'mais-valia', 'alienação do trabalho', 'max weber', 'ação social', 'tipo ideal',
    'desencantamento do mundo', 'ética protestante', 'dominação carismática', 'burocracia',
    'etnocentrismo', 'relativismo cultural', 'identidade cultural', 'socialização', 'estratificação social',
    'castas', 'classes sociais', 'mobilidade social', 'desigualdade social', 'distribuição de renda',
    'cidadania', 'direitos civis', 'direitos políticos', 'direitos sociais', 'movimentos sociais',
    'movimento feminista', 'movimento negro', 'mst', 'pierre bourdieu', 'habitus', 'capital cultural',
    'violência simbólica', 'zygmunt bauman', 'modernidade líquida', 'sociedade de consumo',
    'byung-chul han', 'sociedade do cansaço', 'gilberto freyre', 'democracia racial',
    'sérgio buarque de holanda', 'homem cordial', 'caio prado júnior', 'florestan fernandes',
    'darcy ribeiro', 'o povo brasileiro', 'lélia gonzalez', 'amefricanidade'
  ],

  portugues: [
    'gênero textual', 'tipologia textual', 'texto narrativo', 'texto dissertativo', 'função da linguagem',
    'função emotiva', 'função referencial', 'função metalinguística', 'função poética',
    'figura de linguagem', 'metáfora', 'metonímia', 'antítese', 'ironia', 'coesão', 'coerência',
    'conectivo', 'variação linguística', 'preconceito linguístico', 'norma culta', 'crônica',
    'poema', 'versos', 'estrofes', 'rima', 'literatura', 'barroco', 'gregório de matos',
    'arcadismo', 'romantismo', 'josé de alencar', 'castro alves', 'realismo', 'machado de assis',
    'dom casmurro', 'memórias póstumas', 'naturalismo', 'aluísio azevedo', 'o cortiço',
    'parnasianismo', 'simbolismo', 'pré-modernismo', 'euclides da cunha', 'os sertões',
    'lima barreto', 'modernismo', 'semana de 22', 'mário de andrade', 'oswald de andrade',
    'carlos drummond de andrade', 'graciliano ramos', 'vidas secas', 'jorge amado',
    'clarice lispector', 'guimarães rosa', 'joão cabral de melo neto', 'morte e vida severina'
  ],

  ingles: [
    'according to the text', 'the author states', 'the passage suggests', 'the main idea',
    'meaning of the word', 'headline', 'english', 'reading comprehension', 'lyrics', 'poem'
  ],

  espanhol: [
    'según el texto', 'el autor', 'comprensión lectora', 'lengua española', 'español',
    'los', 'las', 'del', 'pero', 'más', 'este', 'esta', 'palabra'
  ],

  artes: [
    'obra de arte', 'pintura', 'escultura', 'quadro', 'museu', 'exposição', 'tarsila do amaral',
    'anita malfatti', 'cândido portinari', 'vik muniz', 'di cavalcanti', 'vanguarda europeia',
    'cubismo', 'surrealismo', 'dadaísmo', 'expressionismo', 'futurismo', 'pop art', 'arte contemporânea',
    'grafite', 'performance artística', 'dança', 'coreografia', 'teatro', 'bossa nova', 'tropicália',
    'educação física', 'prática corporal', 'exercício físico', 'esporte', 'sedentarismo', 'padrão de beleza corporal'
  ]
}

/**
 * Normaliza um texto para busca sem acentos
 */
function normalizeText(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Mapeamento de sinônimos/aliases de slugs para a chave canônica
 */
export const CANONICAL_SLUG_MAP = {
  matematica: 'matematica',
  'matematica-e-suas-tecnologias': 'matematica',
  fisica: 'fisica',
  quimica: 'quimica',
  biologia: 'biologia',
  historia: 'historia',
  geografia: 'geografia',
  filosofia: 'filosofia',
  sociologia: 'sociologia',
  portugues: 'portugues',
  literatura: 'portugues',
  'lingua-portuguesa': 'portugues',
  'portugues-literatura': 'portugues',
  ingles: 'ingles',
  'lingua-inglesa': 'ingles',
  espanhol: 'espanhol',
  'lingua-espanhola': 'espanhol',
  artes: 'artes',
  'artes-educacao-fisica': 'artes',
  'educacao-fisica': 'artes'
}

/**
 * Identifica e pontua a matéria correta de uma questão através do seu texto.
 * Retorna o slug canônico da matéria mais provável com sua pontuação de confiança.
 */
export function identifyQuestionSubject(question, existingSubjectSlug = null) {
  if (!question) return existingSubjectSlug || 'portugues'

  const statement = question.statement || question.context || ''
  const title = question.title || ''
  const explanation = question.explanation || ''
  const optionsText = Array.isArray(question.options)
    ? question.options.map(o => o.text || '').join(' ')
    : ''

  const fullText = normalizeText(`${title} ${statement} ${optionsText} ${explanation}`)
  if (fullText.length < 20) {
    return existingSubjectSlug || 'portugues'
  }

  // Verifica se é questão de língua estrangeira
  const language = (question.language || '').toLowerCase()
  if (language === 'ingles' || language === 'en') return 'ingles'
  if (language === 'espanhol' || language === 'es') return 'espanhol'

  // Pontua cada matéria
  const scores = {}
  for (const [subjectSlug, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    let score = 0
    for (const rawKw of keywords) {
      const kw = normalizeText(rawKw)
      if (kw.length <= 3) {
        // Para termos curtos, usa fronteira de palavra
        const regex = new RegExp(`\\b${kw}\\b`, 'g')
        const matches = fullText.match(regex)
        if (matches) score += matches.length * 2
      } else {
        let pos = 0
        while ((pos = fullText.indexOf(kw, pos)) !== -1) {
          score += (kw.length > 8 ? 3 : 2)
          pos += kw.length
        }
      }
    }
    scores[subjectSlug] = score
  }

  // Se já tinha um slug existente, dá um bônus moderado de coerência
  const canonicalExisting = CANONICAL_SLUG_MAP[existingSubjectSlug]
  if (canonicalExisting && scores[canonicalExisting] !== undefined) {
    scores[canonicalExisting] += 4
  }

  // Encontra a maior pontuação
  let bestSlug = canonicalExisting || null
  let maxScore = canonicalExisting ? (scores[canonicalExisting] || 0) : 0

  for (const [slug, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      bestSlug = slug
    }
  }

  // Se a pontuação máxima for suficiente, adota a melhor matéria
  if (bestSlug && maxScore >= 4) {
    return bestSlug
  }

  return canonicalExisting || 'portugues'
}

/**
 * Avalia se uma questão pertence genuinamente a uma matéria alvo
 */
export function questionMatchesSubject(question, targetSubjectSlug) {
  if (!targetSubjectSlug) return true
  const targetCanonical = CANONICAL_SLUG_MAP[targetSubjectSlug] || targetSubjectSlug

  const qSlug = question.subject?.slug || question.subjectSlug || ''
  const qCanonical = CANONICAL_SLUG_MAP[qSlug] || qSlug

  // 1. Se o slug cadastrado bate exatamente com o canônico
  if (qCanonical === targetCanonical) {
    // Validação de segurança: se a questão foi erroneamente cadastrada como uma matéria
    // mas seu conteúdo grita outra (ex: citologia cadastrada como física)
    const detected = identifyQuestionSubject(question, qCanonical)
    // Se a matéria detectada for diferente e com forte convicção, não aceita no filtro errado
    if (detected !== qCanonical) {
      return false
    }
    return true
  }

  // 2. Se a questão estava numa área genérica (ex: ciencias-natureza) ou sem matéria correta,
  // mas o classificador identifica com convicção que ela é desta matéria específica
  const detected = identifyQuestionSubject(question, qCanonical)
  return detected === targetCanonical
}
