// =============================================================
// telas-personagem.js — telas do personagem e do pet:
// • cenaHTML(): o seu boneco (com aura) e o pet ao lado
// • abrirEditorPersonagem(): criar/editar o visual do boneco
// • cuidarHTML()/ligarCuidar(): comida, água, carinho, banho e itens
//   (usado na aba Pet; abrirCuidarPet() abre o mesmo numa folha)
// =============================================================

import { dados, alterar } from './store.js';
import { esc, hojeKey } from './utils.js';
import { avatarSVG, personagemHTML, montarEditor, AVATAR_PADRAO, etiquetaRaridade, previaItem } from './visual.js';
import { avatarHTML, companheiro, humor, estagioDoNivel, SKINS_PET } from './personagens.js';
import { estadoPet, descricaoEstado, cuidar, podeBanho, ITENS_PET, bonusPet, NECESSIDADES, valor, precisaDeAtencao, custoDiario } from './pet.js';
import { comprar, skinLiberada } from './loja.js';
import { nivelInfo } from './xp.js';
import { abrirSheet, toast, vibrar, confete, celebrar } from './ui.js';
import { tocar } from './sons.js';

/** O boneco (com a aura do físico) e o pet ao lado. */
export function cenaHTML({ tam = 'm', cfg, acoes = true } = {}) {
  const d = dados();
  return `<div class="cena tam-${tam}">
    <button class="cena-avatar" ${acoes ? 'data-acao="ir-personagem"' : 'tabindex="-1"'} aria-label="Seu personagem">${personagemHTML(cfg || d.avatar)}</button>
    <button class="cena-pet" ${acoes ? 'data-acao="cuidar-pet"' : 'tabindex="-1"'} aria-label="Cuidar do pet">${avatarHTML(companheiro(), { tam: tam === 'g' ? 'g' : 'm', humor: humor() })}</button>
    <span class="cena-chao"></span>
  </div>`;
}

/** Barrinhas das necessidades do pet. */
export function barrasPetHTML(compacto = false) {
  const p = dados().pet;
  const lista = compacto ? NECESSIDADES.filter((n) => ['comida', 'agua', 'forca'].includes(n.id)) : NECESSIDADES;
  const barra = ({ id, emoji, nome }) => {
    const v = valor(id, p);
    return `<div class="pet-barra ${v < 35 ? 'baixa' : v < 60 ? 'media' : ''}" title="${nome}: ${v}">
    <span>${emoji}${compacto ? '' : ` ${nome}`}</span><i><b style="width:${v}%"></b></i>${compacto ? '' : `<small>${v}</small>`}</div>`;
  };
  return `<div class="pet-barras ${compacto ? 'compacto' : ''}">${lista.map(barra).join('')}</div>`;
}

// -------------------------------------------------------------
// Editor do personagem
// -------------------------------------------------------------

export function abrirEditorPersonagem({ primeiraVez = false } = {}) {
  const d = dados();
  const cfg = { ...AVATAR_PADRAO, ...d.avatar };
  const p = companheiro();
  abrirSheet({
    titulo: primeiraVez ? 'Crie seu personagem!' : 'Seu personagem',
    classe: 'sheet-alta',
    html: `${primeiraVez && d.meta.novidadeV3 ? `<p class="dica">Novidade: agora você é um personagem em pixel art e ${esc(p.nome)} virou o seu pet. Monte seu visual — itens raros e lendários liberam conforme você avança.</p>` : ''}
      <div class="editor-personagem"></div>
      ${primeiraVez ? `<label class="campo"><span>Nome do seu pet</span><input class="entrada" name="nomePet" maxlength="16" value="${esc(d.pet.nome || p.nome)}"></label>` : ''}
      <button class="btn primario largo" data-salvar>${primeiraVez ? 'Começar com este visual' : 'Salvar visual'}</button>`,
    aoMontar(corpo, fechar) {
      montarEditor(corpo.querySelector('.editor-personagem'), cfg, {
        preview: (c) => cenaHTML({ tam: 'g', cfg: c, acoes: false }),
      });
      corpo.querySelector('[data-salvar]').addEventListener('click', () => {
        const nomePet = corpo.querySelector('[name="nomePet"]');
        alterar(() => {
          d.avatar = { ...cfg };
          d.meta.avatarCriado = true;
          d.meta.novidadeV3 = false;
          d.visualNovos = [];
          if (nomePet && nomePet.value.trim()) d.pet.nome = nomePet.value.trim();
        });
        fechar();
        tocar('fanfarra');
        confete({ quantidade: 70 });
        toast('Visual salvo! ✨');
      });
    },
  });
}

// -------------------------------------------------------------
// Cuidar do pet (usado na aba Pet e numa folha)
// -------------------------------------------------------------

/** HTML do painel de cuidados. */
export function cuidarHTML() {
  const d = dados();
  const p = companheiro();
  const est = estadoPet();
  const e = estagioDoNivel(nivelInfo().nivel);
  const banho = podeBanho();
  const inv = d.carteira.inventario;
  const carinhoHoje = d.diario[hojeKey()] && d.diario[hojeKey()].carinho;
  const botaoItem = (id, destaque = false) => {
    const it = ITENS_PET[id];
    const n = inv[id] || 0;
    const semDinheiro = !n && d.carteira.moedas < it.preco;
    return `<button class="acao-pet ${destaque ? 'destaque' : ''} ${semDinheiro ? 'sem' : ''}" data-item="${id}">
      <span>${it.emoji}</span><b>${it.nome}</b><small>${n ? `${n} na mochila` : `🪙 ${it.preco}`}</small></button>`;
  };
  const skins = SKINS_PET.filter((s) => skinLiberada(s));
  return `<div class="cuidar-topo ${est.radiante ? 'radiante' : ''}">
      ${avatarHTML(p, { tam: 'gg', humor: humor() })}
      <h3>${esc(p.nome)} <small>${esc(p.especie)} · ${e.nome}</small></h3>
      <p class="cuidar-estado ${precisaDeAtencao() ? 'urgente' : ''}">${esc(descricaoEstado(p.nome))}</p>
      ${bonusPet() ? '<span class="tag tag-pet">🐾 +5% XP ativo</span>' : ''}
    </div>
    ${barrasPetHTML()}
    <h4 class="secao-titulo">Alimentar</h4>
    <div class="acoes-pet">
      ${botaoItem('comida', est.faminto)}${botaoItem('agua', est.sede)}${botaoItem('racao')}
    </div>
    <h4 class="secao-titulo">Cuidar</h4>
    <div class="acoes-pet">
      <button class="acao-pet" data-cuidar="carinho"><span>🤚</span><b>Carinho</b><small>${carinhoHoje ? 'feito hoje' : '+5 🪙 hoje'}</small></button>
      <button class="acao-pet ${banho.ok ? '' : 'sem'} ${est.sujo && banho.ok ? 'destaque' : ''}" data-cuidar="banho"><span>🛁</span><b>Banho</b><small>${banho.jaDeu ? 'já tomou hoje' : banho.fezAlgo ? 'grátis hoje' : 'cumpra 1 hábito'}</small></button>
      ${botaoItem('petisco')}${botaoItem('brinquedo')}${botaoItem('sabonete')}${botaoItem('kit')}
    </div>
    <div class="card economia-pet">
      <b>🪙 ${d.carteira.moedas} moedas</b>
      <small>Manter ${esc(p.nome)} alimentado custa cerca de 🪙 ${custoDiario()} por dia. Moedas vêm da rotina, das missões e do baú diário: sem rotina, sem moedas — e sem moedas, sem comida.</small>
    </div>
    ${skins.length > 1 ? `<h4 class="secao-titulo">Skins</h4><div class="chips-linha">${skins.map((s) => `<button class="chip ${d.pet.skin === s.id ? 'on' : ''}" data-skin="${s.id}">${esc(s.nome)}</button>`).join('')}</div>` : ''}
    <label class="campo"><span>Nome do pet</span><input class="entrada" name="nomePet" maxlength="16" value="${esc(d.pet.nome || p.nome)}"></label>`;
}

/** Liga os toques do painel de cuidados. redesenhar() é chamado depois de cada ação. */
export function ligarCuidar(box, redesenhar) {
  box.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cuidar]');
    const it = e.target.closest('[data-item]');
    const sk = e.target.closest('[data-skin]');
    if (!c && !it && !sk) return;
    let res = null;
    if (c) alterar(() => (res = cuidar(c.dataset.cuidar)), { silencioso: true });
    if (it) alterar(() => (res = cuidar(it.dataset.item)), { silencioso: true });
    if (sk) alterar(() => (res = comprar(`skin:${sk.dataset.skin}`)), { silencioso: true });
    if (!res) return;
    toast(res.msg, { tipo: res.ok ? '' : 'erro', duracao: res.semMoedas ? 5000 : 3200 });
    if (res.ok) {
      tocar(res.moeda ? 'moeda' : 'check');
      vibrar([10, 30, 10]);
    } else {
      vibrar(40);
    }
    redesenhar();
    if (res.ok) {
      const av = box.querySelector('.cuidar-topo .avatar');
      if (av) {
        av.classList.remove('pula');
        void av.offsetWidth;
        av.classList.add('pula');
      }
    }
  });
  box.addEventListener('change', (e) => {
    if (e.target.name !== 'nomePet') return;
    const v = e.target.value.trim();
    if (v) alterar(() => (dados().pet.nome = v.slice(0, 16)), { silencioso: true });
    toast('Nome do pet salvo 🐾');
  });
}

/** Cuidar do pet numa folha (atalho). */
export function abrirCuidarPet() {
  abrirSheet({
    titulo: 'Cuidar do pet',
    html: `<div class="cuidar-corpo">${cuidarHTML()}</div>`,
    aoMontar(corpo) {
      const box = corpo.querySelector('.cuidar-corpo');
      ligarCuidar(box, () => {
        const rol = corpo.scrollTop;
        box.innerHTML = cuidarHTML();
        corpo.scrollTop = rol;
        document.dispatchEvent(new CustomEvent('dib-redesenhar'));
      });
    },
  });
}

/** Celebração de um item de visual novo. */
export function celebrarVisual({ cat, item }) {
  celebrar({
    emoji: `<span class="celebra-avatar">${avatarSVG(previaItem(dados().avatar, cat, item.id))}</span>`,
    titulo: 'Novo visual liberado!',
    subtitulo: `${item.nome} (${etiquetaRaridade(item.r).replace(/<[^>]+>/g, '')}) já está no seu guarda-roupa. Equipe na aba Pet → Personagem.`,
  });
}
