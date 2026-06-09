/**
 * lib/openrouter.js (mantido como huggingface.js para não alterar imports)
 *
 * Usa a API da OpenRouter — gratuita, confiável, sem cold start.
 *
 * Modelo: meta-llama/llama-3.1-8b-instruct:free
 *   - Gratuito no plano free da OpenRouter
 *   - Excelente em português
 *   - Rate limit: 20 req/min, 200 req/dia (free tier)
 *   - Sem cold start
 *
 * Token: crie em https://openrouter.ai/keys
 * Variável: OPENROUTER_API_KEY
 */

import https from "https";

const OPENROUTER_HOST = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";
const MODEL = "openrouter/free";
const TIMEOUT_MS = 55000;

function buildMessages(cenario) {
  return [
    {
      role: "system",
      content: `Você é um simulador avançado de cenários. Quando receber um cenário, gere uma simulação detalhada em português com as seguintes seções em negrito:

**1. Contexto inicial**
**2. Eventos imediatos** (primeiras horas/dias)
**3. Consequências de curto prazo** (semanas)
**4. Consequências de médio prazo** (meses)
**5. Consequências de longo prazo** (anos)
**6. Impactos sociais**
**7. Impactos econômicos**
**8. Impactos tecnológicos**
**9. Possíveis desfechos**
**10. Probabilidade dos principais resultados**

Seja detalhado, realista e criativo.`,
    },
    {
      role: "user",
      content: `Simule o seguinte cenário: ${cenario}`,
    },
  ];
}

function httpsPost(body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const options = {
      hostname: OPENROUTER_HOST,
      path: OPENROUTER_PATH,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "HTTP-Referer": "https://simulador-cenario.vercel.app",
        "X-Title": "Simulador de Cenários",
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });

    req.on("timeout", () => { req.destroy(); reject(new Error("TIMEOUT")); });
    req.on("error", (err) => reject(err));

    req.write(payload);
    req.end();
  });
}

export async function gerarSimulacao(cenario) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurado no servidor.");
  }

  let result;
  try {
    result = await httpsPost(
      {
        model: MODEL,
        messages: buildMessages(cenario),
        max_tokens: 1500,
        temperature: 0.8,
      },
      apiKey
    );
  } catch (err) {
    if (err.message === "TIMEOUT") {
      throw new Error("A requisição demorou demais. Tente novamente.");
    }
    console.error("[OpenRouter] Erro de rede:", err.code, err.message);
    throw new Error(`Erro de rede: ${err.code || err.message}`);
  }

  const { status, body } = result;

  if (status === 401) throw new Error("Chave da OpenRouter inválida ou expirada.");
  if (status === 429) throw new Error("Limite de requisições atingido. Aguarde alguns segundos.");
  if (status === 402) throw new Error("Créditos da OpenRouter esgotados.");

  if (status !== 200) {
    console.error("[OpenRouter] Erro HTTP:", status, body);
    throw new Error(`Erro da API (${status}): ${body.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("Resposta inválida da OpenRouter.");
  }

  const texto = data?.choices?.[0]?.message?.content;
  if (!texto) {
    console.error("[OpenRouter] Resposta inesperada:", body.slice(0, 300));
    throw new Error("Formato de resposta inesperado.");
  }

  return texto.trim();
}
