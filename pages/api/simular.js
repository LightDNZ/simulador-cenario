/**
 * pages/api/simular.js
 * 
 * API Route do Next.js — executada no servidor (serverless function na Vercel).
 * A chave da Hugging Face NUNCA chega ao frontend.
 * 
 * Método aceito: POST
 * Body esperado: { cenario: "descrição do cenário" }
 * Resposta: { simulacao: "texto gerado" } ou { erro: "mensagem" }
 */

import { gerarSimulacao } from "../../lib/huggingface";
import { sanitizarTexto, validarCenario, verificarRateLimit } from "../../lib/sanitize";

// Configuração do timeout da Vercel para esta route
export const config = {
  maxDuration: 60, // segundos (máximo no free tier)
};

export default async function handler(req, res) {
  // Apenas POST é aceito
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido." });
  }

  // Rate limiting por IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (verificarRateLimit(ip)) {
    return res.status(429).json({
      erro: "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.",
    });
  }

  // Extrai e sanitiza a entrada
  const { cenario: cenarioBruto } = req.body || {};
  const cenario = sanitizarTexto(cenarioBruto);

  // Valida o cenário
  const validacao = validarCenario(cenario);
  if (!validacao.valido) {
    return res.status(400).json({ erro: validacao.mensagem });
  }

  try {
    // Chama a Hugging Face via lib (token fica no servidor)
    const simulacao = await gerarSimulacao(cenario);

    return res.status(200).json({ simulacao });

  } catch (err) {
    console.error("[/api/simular] Erro:", err.message);

    // Retorna mensagem amigável ao frontend
    return res.status(500).json({
      erro: err.message || "Erro interno ao gerar a simulação. Tente novamente.",
    });
  }
}
