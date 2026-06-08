/**
 * lib/huggingface.js
 * Usa o módulo `https` nativo do Node para evitar problemas
 * com o fetch global em ambientes locais.
 */

import https from "https";

const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const TIMEOUT_MS = 25000;

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

Seja detalhado, realista e criativo. Use markdown com negrito para os títulos.

Cenário: ${cenario} [/INST]`;
}

function httpsPost(body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const options = {
      hostname: "api-inference.huggingface.co",
      path: `/models/${HF_MODEL}`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("TIMEOUT"));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

export async function gerarSimulacao(cenario) {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN não configurado no servidor.");
  }

  let result;
  try {
    result = await httpsPost(
      {
        inputs: buildPrompt(cenario),
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.8,
          top_p: 0.9,
          repetition_penalty: 1.1,
          return_full_text: false,
        },
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      },
      token
    );
  } catch (err) {
    if (err.message === "TIMEOUT") {
      throw new Error("A requisição demorou demais. Tente novamente.");
    }
    // Loga o erro real de rede para diagnóstico
    console.error("[HF] Erro de rede:", err.code, err.message);
    throw new Error(`Erro de rede ao conectar na Hugging Face: ${err.code || err.message}`);
  }

  const { status, body } = result;

  if (status === 401) throw new Error("Token da Hugging Face inválido ou expirado.");
  if (status === 429) throw new Error("Limite de requisições atingido. Aguarde alguns segundos.");
  if (status === 503) throw new Error("Modelo inicializando. Aguarde 20 segundos e tente novamente.");

  if (status !== 200) {
    console.error("[HF] Erro HTTP:", status, body);
    throw new Error(`Erro da API Hugging Face (${status}): ${body.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("Resposta inválida da Hugging Face.");
  }

  if (!Array.isArray(data) || !data[0]?.generated_text) {
    console.error("[HF] Resposta inesperada:", body.slice(0, 300));
    throw new Error("Formato de resposta inesperado da Hugging Face.");
  }

  return data[0].generated_text.trim();
}
