/**
 * lib/huggingface.js
 * 
 * Wrapper para a API da Hugging Face.
 * 
 * MODELO ESCOLHIDO: mistralai/Mistral-7B-Instruct-v0.3
 * 
 * Por que este modelo?
 *   - Gratuito via Inference API da Hugging Face
 *   - Excelente qualidade para geração de texto longo e estruturado
 *   - Suporte a instruções em português
 *   - Responde bem ao formato de simulação detalhada
 * 
 * Limitações:
 *   - Rate limit: ~30 req/min no plano gratuito
 *   - Pode retornar erro 503 quando o modelo está "frio" (cold start ~20s)
 *   - Max tokens limitado a ~1024 na versão gratuita
 *   - Sem SLA de disponibilidade
 * 
 * Custo: GRATUITO (Hugging Face Inference API free tier)
 * 
 * Alternativas gratuitas:
 *   - google/flan-t5-xxl          → menor, mais rápido, qualidade menor
 *   - HuggingFaceH4/zephyr-7b-beta → similar ao Mistral, boa alternativa
 *   - microsoft/DialoGPT-large     → foco em diálogo, menos adequado
 *   - tiiuae/falcon-7b-instruct    → boa qualidade, mais instável
 */

const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";
const TIMEOUT_MS = 25000; // 25 segundos (abaixo do limite de 30s da Vercel free)

/**
 * Monta o prompt estruturado para o modelo.
 * Usa o formato de instruções do Mistral: [INST] ... [/INST]
 */
function buildPrompt(cenario) {
  return `<s>[INST] Você é um simulador avançado de cenários. Analise o cenário fornecido e gere uma simulação detalhada em português contendo:

1. **Contexto inicial**
2. **Eventos imediatos** (primeiras horas/dias)
3. **Consequências de curto prazo** (semanas)
4. **Consequências de médio prazo** (meses)
5. **Consequências de longo prazo** (anos)
6. **Impactos sociais**
7. **Impactos econômicos**
8. **Impactos tecnológicos**
9. **Possíveis desfechos**
10. **Probabilidade dos principais resultados**

Seja detalhado, realista e criativo. Use markdown com negrito para os títulos de cada seção.

Cenário: ${cenario} [/INST]`;
}

/**
 * Chama a Inference API da Hugging Face com timeout controlado.
 * Lança erros tipados para tratamento no route handler.
 */
export async function gerarSimulacao(cenario) {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN não configurado no servidor.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: buildPrompt(cenario),
        parameters: {
          max_new_tokens: 1024,      // máximo permitido no free tier
          temperature: 0.8,          // criatividade equilibrada
          top_p: 0.9,                // nucleus sampling
          repetition_penalty: 1.1,  // evita repetição
          return_full_text: false,   // retorna só o texto gerado, não o prompt
        },
        options: {
          wait_for_model: true,      // aguarda modelo carregar (cold start)
          use_cache: false,          // gera resposta fresca a cada chamada
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Erro de autenticação
    if (response.status === 401) {
      throw new Error("Token da Hugging Face inválido ou expirado.");
    }

    // Rate limit atingido
    if (response.status === 429) {
      throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    }

    // Modelo indisponível temporariamente
    if (response.status === 503) {
      throw new Error("O modelo está inicializando. Aguarde 20 segundos e tente novamente.");
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro da API Hugging Face (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // A API retorna um array com objetos { generated_text: "..." }
    if (!Array.isArray(data) || !data[0]?.generated_text) {
      throw new Error("Resposta inesperada da API Hugging Face.");
    }

    return data[0].generated_text.trim();

  } catch (err) {
    clearTimeout(timeoutId);

    // Timeout
    if (err.name === "AbortError") {
      throw new Error("A requisição demorou demais. Tente um cenário mais curto ou aguarde e tente novamente.");
    }

    throw err;
  }
}
