// =============================================================
// sons.js — efeitos sonoros curtos, gerados na hora (sem arquivos de áudio).
// Podem ser desligados em Perfil → Ajustes → Sons.
// No iPhone, o áudio só toca depois do primeiro toque na tela, e não toca
// com o botão de silencioso ligado.
// =============================================================

import { dados } from './store.js';

let ctx = null;

/** Libera o áudio (precisa vir de um toque). */
export function liberarAudio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
}
document.addEventListener('pointerdown', liberarAudio, { capture: true, passive: true });

function nota(freq, inicio, dur = 0.12, tipo = 'sine', vol = 0.18) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
  const t = ctx.currentTime + inicio;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SONS = {
  // check: dois tons subindo
  check: () => {
    nota(660, 0, 0.09, 'triangle');
    nota(990, 0.07, 0.14, 'triangle');
  },
  // combo: sobe de tom conforme o combo
  combo: (n = 2) => {
    const base = 520 + Math.min(n, 8) * 60;
    nota(base, 0, 0.08, 'square', 0.08);
    nota(base * 1.5, 0.06, 0.12, 'square', 0.08);
  },
  moeda: () => {
    nota(1320, 0, 0.07, 'square', 0.07);
    nota(1760, 0.06, 0.16, 'square', 0.07);
  },
  desfazer: () => nota(330, 0, 0.12, 'sine', 0.1),
  // fanfarra: subir de nível / conquista
  fanfarra: () => {
    [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.1, 0.22, 'triangle', 0.16));
    nota(1319, 0.42, 0.4, 'triangle', 0.14);
  },
  bau: () => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.06, 0.18, 'sine', 0.14));
  },
};

/** Toca um efeito ('check', 'combo', 'moeda', 'desfazer', 'fanfarra', 'bau'). */
export function tocar(nome, arg) {
  try {
    if (!dados().ajustes.sons) return;
    liberarAudio();
    if (!ctx || !SONS[nome]) return;
    SONS[nome](arg);
  } catch (_) {}
}
