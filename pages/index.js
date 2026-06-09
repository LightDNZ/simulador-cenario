/**
 * pages/index.js
 * 
 * Página principal do Simulador de Cenários com IA.
 * Todo o código aqui é executado no navegador (frontend).
 * A chave da API nunca aparece aqui.
 */

import { useState, useRef } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

// Máximo de caracteres (deve ser igual ao do backend)
const MAX_CHARS = 500;
const MIN_CHARS = 10;

// Exemplos de cenários para inspirar o usuário
const EXEMPLOS = [
  "Cidade sem internet por 30 dias",
  "Apocalipse zumbi em São Paulo",
  "Primeiro contato com extraterrestres",
  "Brasil descobre petróleo na Lua",
  "IA substitui todos os empregos em 5 anos",
];

/**
 * Renderiza o texto da simulação convertendo **negrito** em <strong>.
 * Simples parser de markdown inline para segurança (sem dangerouslySetInnerHTML).
 */
function renderizarTexto(texto) {
  return texto.split(/(\*\*[^*]+\*\*)/).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return parte;
  });
}

export default function Home() {
  const [cenario, setCenario]     = useState("");
  const [simulacao, setSimulacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState("");
  const [copiado, setCopiado]     = useState(false);
  const resultRef = useRef(null);

  // Quantos caracteres foram usados
  const charsUsados = cenario.length;
  const charsRestantes = MAX_CHARS - charsUsados;

  // Classe do contador de caracteres
  const charCountClass =
    charsRestantes < 0 ? styles.charCountError :
    charsRestantes < 80 ? styles.charCountWarning :
    "";

  // Preenche o campo com um exemplo
  function usarExemplo(exemplo) {
    setCenario(exemplo);
    setErro("");
  }

  // Copia o resultado para a área de transferência
  async function copiarResultado() {
    try {
      await navigator.clipboard.writeText(simulacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  // Envio do formulário
  async function handleSubmit(e) {
    e?.preventDefault();

    // Validação no frontend (a validação real está no backend)
    const texto = cenario.trim();
    if (texto.length < MIN_CHARS) {
      setErro(`Descreva um cenário com pelo menos ${MIN_CHARS} caracteres.`);
      return;
    }
    if (texto.length > MAX_CHARS) {
      setErro(`O cenário não pode ter mais de ${MAX_CHARS} caracteres.`);
      return;
    }

    setCarregando(true);
    setErro("");
    setSimulacao("");

    try {
      const response = await fetch("/api/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cenario: texto }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Erro desconhecido ao gerar a simulação.");
      }

      setSimulacao(data.simulacao);

      // Scrolla até o resultado suavemente
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

    } catch (err) {
      setErro(err.message || "Falha na conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // Permite enviar com Ctrl+Enter
  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  }

  return (
    <>
      <Head>
        <title>Simulador de Cenários com IA</title>
        <meta name="description" content="Digite um cenário e uma IA gera uma simulação detalhada do que poderia acontecer." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.container}>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.badge}>Powered by SHIRODEV</div>
          <h1 className={styles.title}>
            Simulador de{" "}
            <span className={styles.titleGradient}>Cenários</span>
            {" "}com IA
          </h1>
          <p className={styles.subtitle}>
            Descreva qualquer situação hipotética e receba uma análise detalhada
            com contexto, eventos, consequências e impactos gerados por inteligência artificial.
          </p>
        </div>

        {/* ── Card de entrada ── */}
        <div className={styles.card}>

          {/* Exemplos */}
          <p className={styles.examplesLabel}>💡 Exemplos</p>
          <div className={styles.examples}>
            {EXEMPLOS.map((ex) => (
              <button
                key={ex}
                className={styles.exampleBtn}
                onClick={() => usarExemplo(ex)}
                disabled={carregando}
                type="button"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className={styles.textareaWrapper}>
            <textarea
              className={styles.textarea}
              placeholder="Ex: Simule o que aconteceria se o Brasil descobrisse uma cura para o câncer amanhã..."
              value={cenario}
              onChange={(e) => {
                setCenario(e.target.value);
                setErro("");
              }}
              onKeyDown={handleKeyDown}
              disabled={carregando}
              maxLength={MAX_CHARS + 50} // tolerância para o aviso visual
              aria-label="Descreva o cenário"
              rows={5}
            />
          </div>

          {/* Contador */}
          <p className={`${styles.charCount} ${charCountClass}`}>
            {charsUsados} / {MAX_CHARS} caracteres
            {charsUsados >= MIN_CHARS && <span style={{ marginLeft: 8, opacity: 0.6 }}>• Ctrl+Enter para simular</span>}
          </p>

          {/* Botão */}
          <button
            className={styles.button}
            onClick={handleSubmit}
            disabled={carregando || charsUsados < MIN_CHARS || charsUsados > MAX_CHARS}
            type="button"
          >
            {carregando ? (
              <>
                <span className={styles.spinner} />
                Gerando simulação...
              </>
            ) : (
              <>
                ⚡ Simular cenário
              </>
            )}
          </button>

          {/* Erro */}
          {erro && (
            <div className={styles.error} role="alert">
              <span className={styles.errorIcon}>⚠️</span>
              <span>{erro}</span>
            </div>
          )}
        </div>

        {/* ── Resultado ── */}
        {simulacao && (
          <div className={styles.resultWrapper} ref={resultRef}>
            <div className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <span className={styles.resultTitle}>
                  <span className={styles.resultDot} />
                  Simulação gerada
                </span>
                <button
                  className={styles.copyBtn}
                  onClick={copiarResultado}
                  type="button"
                >
                  {copiado ? "✓ Copiado!" : "📋 Copiar"}
                </button>
              </div>
              <div className={styles.resultBody}>
                {renderizarTexto(simulacao)}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <p>
            Simulações geradas por IA · Modelo via{" "}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
              OpenRouter
            </a>
            {" "}· Deploy no{" "}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
              Vercel Free Tier
            </a>
            {" "}· Feito por{" "}
            <a href="https://shirodeveloper.vercel.app" target="_blank" rel="noopener noreferrer">
              Gabriel Barbosa 
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
