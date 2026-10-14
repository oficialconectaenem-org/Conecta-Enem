# Guia Completo: Como Hospedar o ConectaEnem e a Correção com IA Gratuitamente

Este guia explica passo a passo como colocar seu projeto no ar sem pagar nada, utilizando plataformas com planos gratuitos excelentes para desenvolvedores.

---

## 1. Onde Hospedar?

Como o projeto é construído em **Nuxt 3 / Nuxt 4**, ele possui frontend e backend (servidor Nitro) integrados na mesma aplicação:

| Plataforma | O que hospeda | Custo | Recomendação |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend + Backend Serverless | Grátis (Plano Hobby) | ⭐ **Mais Recomendado** (deploy em 1 clique via GitHub) |
| **Render** | Backend / Aplicação Node Web Service | Grátis | Ótimo para servidores contínuos e bancos de dados |
| **Netlify** | Frontend + Serverless Functions | Grátis | Excelente alternativa à Vercel |

---

## 2. Passo a Passo de Hospedagem na Vercel (Recomendado)

A Vercel reconhece projetos Nuxt automaticamente e cria as funções serverless para as rotas da API (`/api/ai/corrigir-redacao`, etc.) sem que você precise configurar servidores separados.

### Passo 1: Subir o código para o GitHub
1. Crie um repositório no seu GitHub (público ou privado).
2. No terminal do projeto, execute:
   ```bash
   git add .
   git commit -m "feat: adicionar correcao de redacao com IA Gemini"
   git push origin main
   ```

### Passo 2: Importar o Projeto na Vercel
1. Acesse [https://vercel.com](https://vercel.com) e crie uma conta gratuita com seu GitHub.
2. No painel principal, clique em **"Add New..."** > **"Project"**.
3. Selecione o repositório do **ConectaEnem** e clique em **"Import"**.
4. O Framework Preset será detectado automaticamente como **Nuxt.js**.

### Passo 3: Configurar as Variáveis de Ambiente (CRUCIAL)
Antes de clicar em Deploy, abra a seção **"Environment Variables"** e adicione:

| Chave (Key) | Valor (Value) | Descrição |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `Sua chave da API do Google AI Studio` | A chave que você obteve no Google AI Studio |
| `DATABASE_URL` | `mysql://...` | A URL de conexão com seu banco MariaDB/MySQL |

> ⚠️ **Segurança Garantida:** Na Vercel, a variável `GEMINI_API_KEY` fica armazenada de forma segura nos servidores da Vercel. Nenhum usuário ou navegador consegue ver a sua chave.

### Passo 4: Clicar em "Deploy"
1. Clique no botão azul **"Deploy"**.
2. A Vercel construirá seu site e, em cerca de 1 a 2 minutos, gerará uma URL pública gratuita (ex: `https://conecta-enem.vercel.app`).
3. Pronto! Qualquer pessoa pode acessar no celular ou computador e corrigir redações com IA.

---

## 3. Banco de Dados Gratuito na Nuvem (Opcional)

Se você quiser que o banco de dados também fique acessível na nuvem (para salvar redações e cadastros de usuários):
- **Aiven (MySQL/MariaDB):** Oferece camada gratuita gerenciada.
- **Supabase / Neon / TiDB Cloud:** TiDB Cloud oferece MySQL gratuito compatível com Prisma.
- Basta colocar a URL fornecida na variável `DATABASE_URL` no painel da Vercel.

---

## 4. Como Obter ou Gerar Novas Chaves do Gemini (Google AI Studio)

1. Acesse: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Faça login com uma conta Google.
3. No menu lateral, clique em **"Get API key"** (Obter chave de API).
4. Clique em **"Create API key"**.
5. Copie a chave gerada e cole no arquivo `.env` do seu projeto ou no painel da Vercel.
