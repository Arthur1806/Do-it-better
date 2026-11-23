// =============================================================
// nav.js — navegação entre as 6 abas (Hoje, Tarefas, Treinos, Pet,
// Social, Perfil).
// • Transição na direção da aba (desliza para a esquerda/direita).
// • Indicador luminoso que corre pela barra de abas.
// • Barra de título compacta que aparece ao rolar a tela.
// Cada aba é um módulo com:
//   montar(el)            -> chamado uma vez (liga eventos)
//   render(el, params)    -> desenha a tela
// =============================================================

const ORDEM = ['hoje', 'tarefas', 'treinos', 'pet', 'social', 'perfil'];
const TITULOS = { hoje: 'Hoje', tarefas: 'Tarefas', treinos: 'Treino & Dieta', pet: 'Pet', social: 'Social', perfil: 'Perfil' };

// Atalhos antigos continuam funcionando:
//   'rotina' e 'pendencias' agora são seções da aba Tarefas;
//   loja, personagem e coleção agora ficam na aba Pet.
const ATALHOS = {
  rotina: ['tarefas', { sub: 'rotina' }],
  pendencias: ['tarefas', { sub: 'pendencias' }],
  // a dieta fica na aba Treinos (v5.2)
  dieta: ['treinos', { sub: 'dieta' }],
};
const SECOES_DO_PET = ['loja', 'personagem', 'colecao', 'cuidar'];

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
  if (ATALHOS[nome]) return irPara(ATALHOS[nome][0], { ...ATALHOS[nome][1], ...params });
  if (nome === 'perfil' && SECOES_DO_PET.includes(params.secao)) return irPara('pet', params);
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

// ---------- Barra de título compacta ----------
function atualizarCompacto() {
  const barra = document.getElementById('topo-compacto');
  if (!barra || !atual) return;
  const rolou = abas[atual].el.scrollTop > 70;
  barra.classList.toggle('visivel', rolou);
  const t = barra.querySelector('.topo-compacto-titulo');
  if (t.textContent !== TITULOS[atual]) t.textContent = TITULOS[atual];
}

// ---------- Trocar de aba ----------
// A aba só muda tocando na barra de abas (o gesto de deslizar foi
// removido na v4.1 porque trocava de aba sem querer).
