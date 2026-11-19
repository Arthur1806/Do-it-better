// =============================================================
// instalar.js — primeira impressão de quem chega pelo NAVEGADOR (v6).
//
// O Do It Better é um app de tela de início (PWA). No iPhone, o Safari e o
// app instalado NÃO compartilham dados: quem joga no Safari e instala depois
// começa do zero (a não ser que tenha conta). Por isso, no celular, a
// primeira tela pede para instalar — com o passo a passo certo para cada caso:
//   • iPhone/iPad no Safari: Compartilhar → Adicionar à Tela de Início
//   • iPhone dentro do WhatsApp/Instagram: abrir no Safari primeiro
//   • Android/Chrome: botão "Instalar" de verdade (beforeinstallprompt)
// Quem quiser pode continuar no navegador mesmo assim.
// =============================================================

import { esc } from './utils.js';

let promptAndroid = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptAndroid = e;
  document.dispatchEvent(new CustomEvent('dib-instalavel'));
});

export const instalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = () => navigator.userAgent || '';
export const ehIOS = () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehAndroid = () => /Android/.test(ua());
const ehCelular = () => ehIOS() || ehAndroid();
/** Navegador embutido de app (WhatsApp, Instagram, Facebook...): não instala. */
const navegadorDeApp = () => /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok/i.test(ua());
const iosSemSafari = () => ehIOS() && (/CriOS|FxiOS|EdgiOS/.test(ua()) || navegadorDeApp());

const CHAVE = 'dib-continuar-navegador';

/** Deve mostrar a tela de instalação agora? */
export function deveSugerirInstalar() {
  if (instalado() || !ehCelular()) return false;
  try {
    if (sessionStorage.getItem(CHAVE)) return false;
  } catch (_) {}
  return true;
}

const ICONE_COMPARTILHAR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>';
const ICONE_MAIS = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

/**
 * Mostra a tela de instalação (por cima de tudo).
 * @param {{convite?: string, aoContinuar?: Function}} o
 */
export function mostrarTelaInstalar({ convite = '', aoContinuar } = {}) {
  const raiz = document.createElement('div');
  raiz.className = 'instalar-raiz';
  const passosIOS = iosSemSafari()
    ? `<ol class="instalar-passos">
        <li><span class="num">1</span><span>Toque nos <b>três pontinhos</b> (ou no ícone de navegador) e escolha <b>Abrir no Safari</b>.</span></li>
        <li><span class="num">2</span><span>No Safari, toque em ${ICONE_COMPARTILHAR} <b>Compartilhar</b>.</span></li>
        <li><span class="num">3</span><span>Escolha ${ICONE_MAIS} <b>Adicionar à Tela de Início</b>.</span></li>
      </ol>`
    : `<ol class="instalar-passos">
        <li><span class="num">1</span><span>Toque em ${ICONE_COMPARTILHAR} <b>Compartilhar</b> na barra do Safari${/iPad/.test(ua()) ? ' (no alto)' : ' (embaixo)'}.</span></li>
        <li><span class="num">2</span><span>Role e toque em ${ICONE_MAIS} <b>Adicionar à Tela de Início</b>.</span></li>
        <li><span class="num">3</span><span>Abra o <b>Do It Better</b> pelo ícone novo na tela de início. 🎮</span></li>
      </ol>`;
  const passosAndroid = `<button class="btn primario largo" data-instalar ${promptAndroid ? '' : 'hidden'}>📲 Instalar o app</button>
      <ol class="instalar-passos" data-manual ${promptAndroid ? 'hidden' : ''}>
        <li><span class="num">1</span><span>Toque nos <b>três pontinhos</b> do Chrome (no alto).</span></li>
        <li><span class="num">2</span><span>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span></li>
        <li><span class="num">3</span><span>Abra o <b>Do It Better</b> pelo ícone novo. 🎮</span></li>
      </ol>`;
  raiz.innerHTML = `
    <div class="instalar" role="dialog" aria-modal="true" aria-label="Instalar o app">
      <img class="instalar-icone" src="./icons/icon-192.png" alt="" width="84" height="84">
      ${convite ? `<p class="instalar-convite">🔥 <b>@${esc(convite)}</b> te convidou!</p>` : ''}
      <h1>Instale o Do It Better</h1>
      <p class="instalar-sub">Transforme sua rotina num jogo: XP, níveis, um pet que depende de você e ranking com os amigos. Grátis, leve e funciona offline.</p>
      ${ehIOS() ? passosIOS : passosAndroid}
      ${convite ? `<button class="btn secundario largo" data-copiar>📋 Copiar convite de @${esc(convite)}</button>
        <p class="dica centro">Depois de instalar, abra o app e vá em <b>Social → Amigos → Colar convite</b>.</p>` : ''}
      <button class="btn-texto largo" data-continuar>Continuar no navegador</button>
      <p class="dica centro pequena">No navegador também funciona, mas o app instalado abre em tela cheia, funciona sem internet e não perde seus dados.</p>
    </div>`;
  document.body.appendChild(raiz);
  requestAnimationFrame(() => raiz.classList.add('aberta'));

  const fechar = () => {
    try {
      sessionStorage.setItem(CHAVE, '1');
    } catch (_) {}
    raiz.classList.remove('aberta');
    setTimeout(() => raiz.remove(), 250);
    if (aoContinuar) aoContinuar();
  };
  raiz.querySelector('[data-continuar]').addEventListener('click', fechar);
  const copiar = raiz.querySelector('[data-copiar]');
  if (copiar) copiar.addEventListener('click', () => {
    const texto = `@${convite} ${location.origin}${location.pathname}?amigo=${convite}`;
    (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(
      () => (copiar.textContent = '✅ Convite copiado!'),
      () => (copiar.textContent = `Anote: @${convite}`)
    );
  });
  const btn = raiz.querySelector('[data-instalar]');
  const mostrarBotao = () => {
    if (!btn || !promptAndroid) return;
    btn.hidden = false;
    const manual = raiz.querySelector('[data-manual]');
    if (manual) manual.hidden = true;
  };
  document.addEventListener('dib-instalavel', mostrarBotao);
  if (btn) btn.addEventListener('click', async () => {
    if (!promptAndroid) return;
    promptAndroid.prompt();
    const r = await promptAndroid.userChoice.catch(() => null);
    promptAndroid = null;
    if (r && r.outcome === 'accepted') {
      raiz.querySelector('.instalar').innerHTML = '<h1>Instalado! 🎉</h1><p class="instalar-sub">Abra o Do It Better pelo ícone na tela inicial.</p>';
    }
  });
  window.addEventListener('appinstalled', () => setTimeout(fechar, 1500), { once: true });
}
