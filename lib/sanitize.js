/**
 * lib/sanitize.js
 * 
 * Funções de sanitização e validação de entrada do usuário.
 * Aplicadas no backend (API Route) para segurança.
 */

export const LIMITES = {
  MIN_CHARS: 10,       // mínimo de caracteres no cenário
  MAX_CHARS: 500,      // máximo de caracteres no cenário
  RATE_LIMIT_MS: 8000, // 8 segundos entre requisições por IP
};

// Mapa em memória para rate limiting simples por IP
// Em produção com múltiplas instâncias, use Redis (ex: Upstash)
const requestMap = new Map();

/**
 * Remove caracteres perigosos e normaliza o texto.
 */
export function sanitizarTexto(texto) {
  if (typeof texto !== "string") return "";

  return texto
    .trim()
    // Remove tags HTML/script
    .replace(/<[^>]*>/g, "")
    // Remove caracteres de controle exceto newline
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Colapsa múltiplos espaços
    .replace(/\s{3,}/g, "  ")
    // Limita ao máximo de caracteres
    .slice(0, LIMITES.MAX_CHARS);
}

/**
 * Valida se o cenário está dentro dos limites aceitáveis.
 * Retorna { valido: true } ou { valido: false, mensagem: "..." }
 */
export function validarCenario(cenario) {
  if (!cenario || cenario.length < LIMITES.MIN_CHARS) {
    return {
      valido: false,
      mensagem: `O cenário deve ter pelo menos ${LIMITES.MIN_CHARS} caracteres.`,
    };
  }

  if (cenario.length > LIMITES.MAX_CHARS) {
    return {
      valido: false,
      mensagem: `O cenário não pode ter mais de ${LIMITES.MAX_CHARS} caracteres.`,
    };
  }

  // Detecta padrões de spam (repetição excessiva)
  const palavras = cenario.toLowerCase().split(/\s+/);
  const unicas = new Set(palavras);
  if (palavras.length > 10 && unicas.size / palavras.length < 0.2) {
    return {
      valido: false,
      mensagem: "Texto com muita repetição detectado. Descreva um cenário válido.",
    };
  }

  return { valido: true };
}

/**
 * Rate limiting simples baseado em IP.
 * Retorna true se a requisição deve ser bloqueada.
 */
export function verificarRateLimit(ip) {
  const agora = Date.now();
  const ultimaReq = requestMap.get(ip);

  if (ultimaReq && agora - ultimaReq < LIMITES.RATE_LIMIT_MS) {
    return true; // bloqueado
  }

  requestMap.set(ip, agora);

  // Limpeza periódica do mapa para evitar memory leak
  if (requestMap.size > 1000) {
    for (const [key, timestamp] of requestMap.entries()) {
      if (agora - timestamp > LIMITES.RATE_LIMIT_MS * 10) {
        requestMap.delete(key);
      }
    }
  }

  return false; // permitido
}
