// =============================================================
// telas-personagem.js — telas do personagem e do pet:
// • cenaHTML(): o seu boneco com o pet ao lado (usado no Hoje e no Perfil)
// • abrirEditorPersonagem(): criar/editar o visual do boneco
// • abrirCuidarPet(): necessidades do pet, carinho, banho e itens
// =============================================================

import { dados, alterar } from './store.js';
import { esc, hojeKey } from './utils.js';
import { avatarSVG, montarEditor, AVATAR_PADRAO, etiquetaRaridade, previaItem } from './visual.js';
import { avatarHTML, companheiro, humor, estagioDoNivel, SKINS_PET } from './personagens.js';
import { estadoPet, descricaoEstado, cuidar, podeBanho, ITENS_PET, bonusPet } from './pet.js';
import { comprar, skinLiberada } from './loja.js';
import { nivelInfo } from './xp.js';
import { abrirSheet, toast, vibrar, confete, celebrar } from './ui.js';
import { tocar } from './sons.js';

/** O boneco com o pet ao lado. */
export function cenaHTML({ tam = 'm', cfg, acoes = true } = {}) {
  const d = dados();
  return `<div class="cena tam-${tam}">
    <button class="cena-avatar" ${acoes ? 'data-acao="editar-personagem"' : 'tabindex="-1"'} aria-label="Editar personagem">${avatarSVG(cfg || d.avatar)}</button>
    <button class="cena-pet" ${acoes ? 'data-acao="cuidar-pet"' : 'tabindex="-1"'} aria-label="Cuidar do pet">${avatarHTML(companheiro(), { tam: tam === 'g' ? 'g' : 'm', humor: humor() })}</button>
    <span class="cena-chao"></span>
  </div>`;
}

/** Barrinhas de força, limpeza e alegria. */
export function barrasPetHTML(compacto = false) {
  const p = dados().pet;
  const barra = (emoji, nome, v) => `<div class="pet-barra ${v < 35 ? 'baixa' : v < 70 ? 'media' : ''}" title="${nome}: ${v}">
    <span>${emoji}${compacto ? '' : ` ${nome}`}</span><i><b style="width:${v}%"></b></i>${compacto ? '' : `<small>${v}</small>`}</div>`;
  return `<div class="pet-barras ${compacto ? 'compacto' : ''}">
    ${barra('💪', 'Força', p.forca)}${barra('🧼', 'Limpeza', p.limpeza)}${barra('😊', 'Alegria', p.alegria)}
  </div>`;
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
// Cuidar do pet
// -------------------------------------------------------------

export function abrirCuidarPet() {
  const html = () => {
    const d = dados();
    const p = companheiro();
    const est = estadoPet();
    const e = estagioDoNivel(nivelInfo().nivel);
    const banho = podeBanho();
    const inv = d.carteira.inventario;
    const item = (id) => {
      const it = ITENS_PET[id];
      const n = inv[id] || 0;
      return `<button class="acao-pet ${n ? '' : 'sem'}" data-item="${id}">
        <span>${it.emoji}</span><b>${it.nome}</b><small>${n ? `${n} na mochila` : `🪙 ${it.preco}`}</small></button>`;
    };
    const skins = SKINS_PET.filter((s) => skinLiberada(s));
    return `<div class="cuidar-topo ${est.radiante ? 'radiante' : ''}">
        ${avatarHTML(p, { tam: 'gg', humor: humor() })}
        <h3>${esc(p.nome)} <small>${esc(p.especie)} · ${e.nome}</small></h3>
        <p class="cuidar-estado">${esc(descricaoEstado(p.nome))}</p>
        ${bonusPet() ? '<span class="tag tag-neon">🐾 +5% XP ativo</span>' : ''}
      </div>
      ${barrasPetHTML()}
      <div class="acoes-pet">
        <button class="acao-pet" data-cuidar="carinho"><span>🤚</span><b>Carinho</b><small>${d.diario[hojeKey()] && d.diario[hojeKey()].carinho ? 'feito hoje' : '+5 🪙 hoje'}</small></button>
        <button class="acao-pet ${banho.ok ? '' : 'sem'}" data-cuidar="banho"><span>🛁</span><b>Banho</b><small>${banho.jaDeu ? 'já tomou hoje' : banho.fezAlgo ? 'grátis hoje' : 'cumpra 1 hábito'}</small></button>
        ${Object.keys(ITENS_PET).map(item).join('')}
      </div>
      <p class="dica">${esc(p.nome)} vive da sua disciplina: cada hábito e treino dá força. Dias sem rotina deixam ${esc(p.nome)} fraco, sujo e triste. Bem cuidado (tudo acima de 70), ele te dá +5% de XP.</p>
      ${skins.length > 1 ? `<h4 class="secao-titulo">Skins</h4><div class="chips-linha">${skins.map((s) => `<button class="chip ${d.pet.skin === s.id ? 'on' : ''}" data-skin="${s.id}">${esc(s.nome)}</button>`).join('')}</div>` : ''}
      <label class="campo"><span>Nome do pet</span><input class="entrada" name="nomePet" maxlength="16" value="${esc(d.pet.nome || p.nome)}"></label>`;
  };
  abrirSheet({
    titulo: 'Cuidar do pet',
    html: `<div class="cuidar-corpo">${html()}</div>`,
    aoMontar(corpo) {
      const box = corpo.querySelector('.cuidar-corpo');
      const redesenhar = () => {
        const rol = corpo.scrollTop;
        box.innerHTML = html();
        corpo.scrollTop = rol;
      };
      const pular = () => {
        const av = box.querySelector('.cuidar-topo .avatar');
        if (av) {
          av.classList.remove('pula');
          void av.offsetWidth;
          av.classList.add('pula');
        }
      };
      box.addEventListener('click', (e) => {
        const c = e.target.closest('[data-cuidar]');
        const it = e.target.closest('[data-item]');
        const sk = e.target.closest('[data-skin]');
        let res = null;
        if (c) alterar(() => (res = cuidar(c.dataset.cuidar)), { silencioso: false });
        if (it) {
          const id = it.dataset.item;
          if (!(dados().carteira.inventario[id] > 0)) {
            alterar(() => (res = comprar(`pet:${id}`)));
            if (res.ok) alterar(() => (res = cuidar(id)));
          } else {
            alterar(() => (res = cuidar(id)));
          }
        }
        if (sk) alterar(() => (res = comprar(`skin:${sk.dataset.skin}`)));
        if (!res) return;
        toast(res.msg, { tipo: res.ok ? '' : 'erro' });
        if (res.ok) {
          tocar(res.moeda ? 'moeda' : 'check');
          vibrar([10, 30, 10]);
        }
        redesenhar();
        if (res.ok) pular();
      });
      box.addEventListener('change', (e) => {
        if (e.target.name !== 'nomePet') return;
        const v = e.target.value.trim();
        if (v) alterar(() => (dados().pet.nome = v.slice(0, 16)));
        toast('Nome do pet salvo 🐾');
      });
    },
  });
}

/** Celebração de um item de visual novo. */
export function celebrarVisual({ cat, item }) {
  celebrar({
    emoji: `<span class="celebra-avatar">${avatarSVG(previaItem(dados().avatar, cat, item.id))}</span>`,
    titulo: 'Novo visual liberado!',
    subtitulo: `${item.nome} (${etiquetaRaridade(item.r).replace(/<[^>]+>/g, '')}) já está no seu guarda-roupa. Equipe em Perfil → Personagem.`,
  });
}
