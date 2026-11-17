// =============================================================
// nav.js — navegação entre as 5 abas (Hoje, Rotina, Pendências,
// Treinos, Perfil).
// • Transição na direção da aba (desliza para a esquerda/direita).
// • Indicador luminoso que corre pela barra de abas.
// • Barra de título compacta que aparece ao rolar a tela.
// • Deslizar o dedo para os lados troca de aba.
// Cada aba é um módulo com:
//   montar(el)            -> chamado uma vez (liga eventos)
//   render(el, params)    -> desenha a tela
// =============================================================

const ORDEM = ['hoje', 'rotina', 'pendencias', 'treinos', 'perfil'];
const TITULOS = { hoje: 'Hoje', rotina: 'Rotina', pendencias: 'Pendências', treinos: 'Treinos', perfil: 'Perfil' };

const abas = {};
let atual = null;

/** Registra uma aba. */
export function registrarAba(nome, modulo) {
  const el = document.getElementById(`view-${nome}`);
  abas[nome] = { el, modulo };
  if (modulo.montar) modulo.montar(el);
  el.addEventListener('scroll', () => nome === atual && atualizarCompacto(), { passive: true });
}

/** Vai para uma aba (params opcionais, ex.: { filtro: 'hoje' }). */
export function irPara(nome, params = {}) {
  const alvo = abas[nome];
  if (!alvo) return;
  const entrando = atual !== nome;
  if (entrando) {
    const iNovo = ORDEM.indexOf(nome);
    Object.entries(abas).forEach(([n, a]) => {
      const i = ORDEM.indexOf(n);
      a.el.classList.toggle('ativa', n === nome);
      a.el.dataset.pos = i < iNovo ? 'esq' : i > iNovo ? 'dir' : '';
      a.el.setAttribute('aria-hidden', n === nome ? 'false' : 'true');
    });
    document.querySelectorAll('.tabbar [data-aba]').forEach((b) => {
      const on = b.dataset.aba === nome;
      b.classList.toggle('ativa', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    document.getElementById('tabbar').style.setProperty('--aba-i', iNovo);
    atual = nome;
  } else if (params && Object.keys(params).length === 0) {
    // tocar de novo na aba atual sobe para o topo (como no iOS)
    alvo.el.scrollTo({ top: 0, behavior: 'smooth' });
  }
  alvo.modulo.render(alvo.el, { ...params, entrando });
  atualizarCompacto();
  document.dispatchEvent(new CustomEvent('dib-aba', { detail: nome }));
}

/** Redesenha a aba visível (chamado quando os dados mudam). */
export function renderizarAtual() {
  if (!atual) return;
  const a = abas[atual];
  a.modulo.render(a.el, {});
  document.dispatchEvent(new CustomEvent('dib-redesenhou', { detail: atual }));
}

export function abaAtual() {
  return atual;
}

/** Aba vizinha (para o gesto de deslizar). */
function vizinha(direcao) {
  const i = ORDEM.indexOf(atual) + direcao;
  return ORDEM[i] || null;
}

// ---------- Barra de título compacta ----------
function atualizarCompacto() {
  const barra = document.getElementById('topo-compacto');
  if (!barra || !atual) return;
  const rolou = abas[atual].el.scrollTop > 70;
  barra.classList.toggle('visivel', rolou);
  const t = barra.querySelector('.topo-compacto-titulo');
  if (t.textContent !== TITULOS[atual]) t.textContent = TITULOS[atual];
}

// ---------- Deslizar para trocar de aba ----------
// Ignora gestos que começam em áreas que já usam o deslize (listas
// roláveis para o lado, cartões de pendência, alças de arrastar...).
const IGNORAR = '.pend-swipe, .filtros, .emoji-sugestoes, .alca, .grade-blocos.editando, input, textarea, select, .subnav, .chips-linha, .grafico, .liga-escada, .trilha-evolucao, .onb-estagios';

export function ligarGestos() {
  const telas = document.getElementById('telas');
  let ini = null;
  telas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1 || e.target.closest(IGNORAR)) {
        ini = null;
        return;
      }
      const t = e.touches[0];
      // perto da borda esquerda o iOS usa o gesto de "voltar"
      if (t.clientX < 18) {
        ini = null;
        return;
      }
      ini = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    { passive: true }
  );
  telas.addEventListener(
    'touchend',
    (e) => {
      if (!ini) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - ini.x;
      const dy = t.clientY - ini.y;
      const rapido = Date.now() - ini.t < 600;
      ini = null;
      if (!rapido || Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
      const prox = vizinha(dx < 0 ? 1 : -1);
      if (prox) irPara(prox);
    },
    { passive: true }
  );
}
