# 🔮 Simulador de Cenários com IA

Website onde o usuário descreve um cenário e uma IA gera uma simulação detalhada.
Funciona 100% no **plano gratuito da Vercel** usando **Hugging Face Inference API** (também gratuita).

---

## 📁 Estrutura do Projeto

```
simulador-ia/
├── lib/
│   ├── huggingface.js     # Client da API Hugging Face (só roda no servidor)
│   └── sanitize.js        # Validação e rate limiting
├── pages/
│   ├── _app.js            # Configuração global do Next.js
│   ├── index.js           # Página principal (frontend)
│   └── api/
│       └── simular.js     # API Route (backend serverless)
├── styles/
│   ├── globals.css        # Estilos globais
│   └── Home.module.css    # Estilos da página principal
├── .env.example           # Template de variáveis de ambiente
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## 🔑 Por que é seguro?

```
Usuário → Frontend (browser) → /api/simular (Vercel serverless) → Hugging Face
                                        ↑
                             Token da HF fica AQUI,
                           nunca chega ao navegador
```

---

## ⚙️ Instalação Local

### 1. Pré-requisitos
- Node.js 18 ou superior
- Conta gratuita na Hugging Face

### 2. Clonar e instalar
```bash
git clone <seu-repositorio>
cd simulador-ia
npm install
```

### 3. Criar token da Hugging Face
1. Acesse: https://huggingface.co/settings/tokens
2. Clique em **"New token"**
3. Nome: `simulador-ia` (qualquer nome)
4. Tipo: **Read** (gratuito, suficiente)
5. Clique em **Generate** e copie o token (`hf_...`)

### 4. Configurar variável de ambiente local
```bash
cp .env.example .env.local
```
Edite `.env.local` e substitua o valor:
```
HUGGINGFACE_API_TOKEN=hf_SEU_TOKEN_AQUI
```

### 5. Rodar localmente
```bash
npm run dev
```
Acesse: http://localhost:3000

---

## 🚀 Deploy na Vercel

### Opção A — Via GitHub (recomendado)

1. **Suba o projeto para o GitHub:**
```bash
git init
git add .
git commit -m "feat: simulador de cenários com IA"
git remote add origin https://github.com/seu-usuario/simulador-ia.git
git push -u origin main
```

2. **Acesse a Vercel:**
   - Entre em https://vercel.com e faça login com GitHub
   - Clique em **"Add New Project"**
   - Selecione o repositório `simulador-ia`
   - Clique em **"Import"**

3. **Configure a variável de ambiente:**
   - Na tela de configuração do projeto, clique em **"Environment Variables"**
   - Nome: `HUGGINGFACE_API_TOKEN`
   - Valor: seu token `hf_...`
   - Clique em **"Add"**

4. **Deploy:**
   - Clique em **"Deploy"**
   - Aguarde ~2 minutos
   - Pronto! Você terá uma URL tipo `simulador-ia.vercel.app`

### Opção B — Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel

# Quando perguntar, configure:
# - Build Command: npm run build
# - Output Directory: .next
# - Install Command: npm install

# Adicionar variável de ambiente:
vercel env add HUGGINGFACE_API_TOKEN production
# Cole o token e pressione Enter
```

---

## 🔄 Atualizar Após Deploy

Sempre que fizer alterações:

```bash
git add .
git commit -m "sua mensagem"
git push
```

A Vercel detecta o push automaticamente e faz redeploy em ~1 minuto.

Para o Vercel CLI:
```bash
vercel --prod
```

---

## 🤖 Modelo: Mistral-7B-Instruct-v0.3

| Item | Info |
|------|------|
| Modelo | `mistralai/Mistral-7B-Instruct-v0.3` |
| Custo | **Gratuito** (Inference API) |
| Rate limit | ~30 req/min |
| Max tokens | 1024 (free tier) |
| Idioma | Português ✅ |
| Qualidade | ⭐⭐⭐⭐ |

**Alternativas gratuitas:**
- `HuggingFaceH4/zephyr-7b-beta` — similar qualidade
- `google/flan-t5-xxl` — mais rápido, menor qualidade
- `tiiuae/falcon-7b-instruct` — boa qualidade, menos estável

Para trocar o modelo, edite a constante `HF_API_URL` em `lib/huggingface.js`.

---

## ⚠️ Limitações do Free Tier

| Limite | Valor |
|--------|-------|
| Timeout Vercel | 30 segundos |
| Execuções/mês | 100.000 (mais que suficiente) |
| Bandwidth | 100 GB/mês |
| HF cold start | ~20s na primeira requisição |

---

## 🔒 Segurança Implementada

- ✅ Token nunca exposto no frontend
- ✅ Sanitização de HTML/scripts na entrada
- ✅ Limite de caracteres (10–500)
- ✅ Rate limiting por IP (1 req/8s)
- ✅ Timeout de 25 segundos
- ✅ Tratamento de todos os erros HTTP
- ✅ Proteção anti-spam (detecção de repetição)

---

## 🚀 Melhorias Futuras

- [ ] Histórico de simulações (localStorage)
- [ ] Exportar resultado como PDF
- [ ] Múltiplos modelos para escolher
- [ ] Modo "streaming" para resposta em tempo real
- [ ] Autenticação para aumentar rate limit por usuário
- [ ] Cache de resultados com Redis (Upstash gratuito)
- [ ] Análise de sentimento do cenário
- [ ] Compartilhamento por link único
