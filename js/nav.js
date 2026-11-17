// =============================================================
// nav.js — navegação entre as 5 abas (Hoje, Rotina, Pendências,
// Treinos, Perfil) com transição suave. Cada aba é um módulo com:
//   montar(el)            -> chamado uma vez (liga eventos)
//   render(el, params)    -> desenha a tela
// =============================================================

const abas = {};
let atual = null;
let paramsAtuais = {};

/** Registra uma aba. */
export function registrarAba(nome, modulo) {
  const el = document.getElementById(`view-${nome}`);
  abas[nome] = { el, modulo };
  if (modulo.montar) modulo.montar(el);
}

/** Vai para uma aba (params opcionais, ex.: { filtro: 'hoje' }). */
export function irPara(nome, params = {}) {
  const alvo = abas[nome];
  if (!alvo) return;
  paramsAtuais = params;
  const entrando = atual !== nome;
  if (entrando) {
    Object.entries(abas).forEach(([n, a]) => a.el.classList.toggle('ativa', n === nome));
    document.querySelectorAll('.tabbar [data-aba]').forEach((b) => {
      const on = b.dataset.aba === nome;
      b.classList.toggle('ativa', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    atual = nome;
  } else if (params && Object.keys(params).length === 0) {
    // tocar de novo na aba atual sobe para o topo (como no iOS)
    alvo.el.scrollTo({ top: 0, behavior: 'smooth' });
  }
  alvo.modulo.render(alvo.el, { ...params, entrando });
  document.dispatchEvent(new CustomEvent('dib-aba', { detail: nome }));
}

/** Redesenha a aba visível (chamado quando os dados mudam). */
export function renderizarAtual() {
  if (!atual) return;
  const a = abas[atual];
  a.modulo.render(a.el, {});
}

export function abaAtual() {
  return atual;
}
