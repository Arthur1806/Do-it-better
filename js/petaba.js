// =============================================================
// petaba.js — aba PET: tudo do seu personagem e do seu pet num lugar só.
//   Cuidar      -> comida, água, banho, carinho e itens (com moedas)
//   Personagem  -> evolução física, visual e itens exclusivos
//   Loja        -> itens, cuidados do pet, visual, skins e temas
//   Coleção     -> pets desbloqueados (adotar outro)
// =============================================================

import { dados, alterar } from './store.js';
import { hojeKey, esc, formatarDataHora, formatarHora } from './utils.js';
import { nivelInfo, pocaoAtiva, xpParaChegar } from './xp.js';
import { PERSONAGENS, ESTAGIOS, avatarHTML, companheiro, estagioDoNivel, novosNaColecao, personagem, SKINS_PET } from './personagens.js';
import { TEMAS, ITENS, ITENS_DO_PET, comprar, visuaisDaLoja, skinLiberada, usarAmpulheta, abrirBauMisterioso } from './loja.js';
import { CATEGORIAS, opcoes, liberado, comoLiberar, etiquetaRaridade, avatarSVG, personagemHTML, RARIDADES, previaItem, FISICOS, FISICO_MAX, fisicoAtual } from './visual.js';
import { cuidarHTML, ligarCuidar, abrirEditorPersonagem } from './telas-personagem.js';
import { precisaDeAtencao } from './pet.js';
import { abrirSheet, toast, vibrar, confete } from './ui.js';
import { tocar } from './sons.js';

let secao = 'cuidar';
let abaLoja = 'itens';

const SECOES = [
  ['cuidar', '🐾 Cuidar'],
  ['personagem', '🧑 Personagem'],
  ['loja', '🛒 Loja'],
  ['colecao', '📚 Coleção'],
];

export function montar(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    switch (b.dataset.acao) {
      case 'secao':
        secao = b.dataset.secao;
        vibrar(6);
        render(el);
        el.scrollTo({ top: 0 });
        break;
      case 'cuidar-pet':
        secao = 'cuidar';
        render(el);
        el.scrollTo({ top: 0 });
        break;
      case 'personagem':
        mostrarPersonagem(b.dataset.id);
        break;
      case 'editar-personagem':
        abrirEditorPersonagem();
        break;
      case 'aba-loja':
        abaLoja = b.dataset.aba;
        vibrar(6);
        render(el);
        break;
      case 'comprar':
        comprarItem(b.dataset.id);
        break;
      case 'usar-ampulheta': {
        let res;
        alterar(() => (res = usarAmpulheta()));
        toast(res.msg, { tipo: res.ok ? '' : 'erro' });
        if (res.ok) tocar('moeda');
        break;
      }
      case 'abrir-bau-misterioso':
        abrirBauMisteriosoAnimado();
        break;
    }
  });
}

export function render(el, params = {}) {
  if (params.secao) secao = params.secao;
  if (params.aba) abaLoja = params.aba;
  const d = dados();
  const info = nivelInfo(d.xp.total);
  const novos = novosNaColecao() + d.visualNovos.length;
  if ((secao === 'colecao' || secao === 'personagem') && novos > 0) {
    alterar(() => {
      if (secao === 'colecao') d.colecaoVista = Object.keys(d.colecao);
      if (secao === 'personagem') d.visualNovos = [];
    }, { silencioso: true });
  }
  const pontos = { cuidar: precisaDeAtencao(), colecao: novosNaColecao() > 0, personagem: d.visualNovos.length > 0 };
  el.innerHTML = `
    <header class="cabecalho">
      <h1 class="titulo-tela">Pet</h1>
      <button class="pilula-moedas" data-acao="secao" data-secao="loja">🪙 <b>${d.carteira.moedas}</b></button>
    </header>
    <nav class="subnav" role="tablist" aria-label="Seções do pet">
      ${SECOES.map(([id, nome]) => `<button role="tab" aria-selected="${secao === id}" class="${secao === id ? 'on' : ''}" data-acao="secao" data-secao="${id}">${nome}${pontos[id] && secao !== id ? '<i class="ponto-novo">!</i>' : ''}</button>`).join('')}
    </nav>
    <div class="secao-conteudo" data-secao="${secao}">${SECAO[secao](d, info)}</div>`;
  if (secao === 'cuidar') {
    const box = el.querySelector('.cuidar-corpo');
    ligarCuidar(box, () => {
      box.innerHTML = cuidarHTML();
      document.dispatchEvent(new CustomEvent('dib-redesenhar-badges'));
    });
  }
}

const SECAO = {
  cuidar: () => `<div class="cuidar-corpo">${cuidarHTML()}</div>`,

  personagem(d, info) {
    const f = fisicoAtual();
    const prox = FISICOS.find((x) => x.nivel > info.nivel);
    const exclusivos = [];
    for (const c of CATEGORIAS) for (const o of opcoes(c.id)) if (!['gratis', 'loja'].includes(o.d.tipo)) exclusivos.push({ c, o, ok: liberado(c.id, o, d) });
    const liberados = exclusivos.filter((x) => x.ok).length;
    const proximos = exclusivos.filter((x) => !x.ok).slice(0, 5);
    return `
    <section class="card personagem-card fisico-card-${f.n}">
      <div class="personagem-palco">${personagemHTML(d.avatar, { classe: 'grande' })}</div>
      <h2 class="gradiente-texto">${esc(d.ajustes.nome || 'Você')} · ${f.nome}</h2>
      <p class="dica centro">${esc(f.desc)}</p>
      <button class="btn primario largo" data-acao="editar-personagem">🎨 Editar visual</button>
    </section>

    <section class="card">
      <div class="secao-cab" style="padding:14px 14px 0"><h3>Evolução física</h3><small class="apagado">pelo seu nível</small></div>
      <div class="evolucao-fisica">${FISICOS.map((x) => `<div class="${info.nivel >= x.nivel ? 'on' : 'travado'} ${x.n === f.n ? 'atual' : ''}">
          <span class="mini-fisico">${personagemHTML(d.avatar, { classe: 'mini', fisico: x.n })}</span>
          <b>${x.nome}</b><small>nível ${x.nivel}</small></div>`).join('')}</div>
      <p class="dica" style="padding:0 14px 14px">${prox ? `Próximo: <b>${prox.nome}</b> no nível ${prox.nivel} — faltam ${xpParaChegar(prox.nivel) - d.xp.total} XP. ${esc(prox.desc)}` : `Você chegou à forma máxima: ${FISICO_MAX.nome}! ⚡`}</p>
    </section>

    <div class="secao-cab"><h2 class="secao-titulo">Itens exclusivos</h2><small class="apagado">${liberados}/${exclusivos.length} liberados</small></div>
    <div class="lista card">${proximos.length ? proximos.map(({ c, o }) => `<div class="item-linha">
        <span class="mini-visual">${c.tipo === 'cor' ? `<span class="amostra-cor" style="background:${o.hex}"></span>` : avatarSVG(previaItem(d.avatar, c.id, o.id), 'mini')}</span>
        <span class="item-info"><span class="item-nome">${esc(o.nome)} ${etiquetaRaridade(o.r)}</span><span class="item-sub">🔒 ${esc(comoLiberar(o))} · ${esc(c.nome)}</span></span>
      </div>`).join('') : '<div class="item-linha"><span class="item-info"><span class="item-nome">Você liberou todos os exclusivos! 👑</span></span></div>'}</div>`;
  },

  loja: (d, info) => lojaHTML(d, info),

  colecao(d, info) {
    const p = companheiro();
    const qtd = Object.keys(d.colecao).length;
    const est = estagioDoNivel(info.nivel);
    const prox = ESTAGIOS.find((e) => e.nivel > info.nivel);
    return `
    <section class="card pet-card">
      <div class="secao-cab"><h3>Evolução de ${esc(p.nome)}</h3><small class="apagado">${est.nome}</small></div>
      <div class="trilha-evolucao">${ESTAGIOS.map((e) => `<div class="${info.nivel >= e.nivel ? 'on' : ''} ${e.estagio === est.estagio ? 'atual' : ''}"><i>${e.enfeite || '•'}</i><small>${e.nome}</small></div>`).join('')}</div>
      <p class="dica">${prox ? `Evolui para <b>${prox.nome}</b> no nível ${prox.nivel}.` : 'Forma máxima alcançada! 🌟'}</p>
    </section>
    <div class="secao-cab"><h2 class="secao-titulo">Pets</h2><small class="apagado">${qtd}/${PERSONAGENS.length} desbloqueados</small></div>
    <div class="grade-colecao">
      ${PERSONAGENS.map((x) => {
        const ok = !!d.colecao[x.id];
        const ativo = x.id === d.pet.especie;
        return `<button class="pers-card ${ok ? 'ok' : 'bloqueado'} ${ativo ? 'ativo' : ''} ${x.lendario ? 'lendario' : ''}" data-acao="personagem" data-id="${x.id}" style="--cor-pers:${x.cor}">
          ${ativo ? '<span class="selo-ativo">Seu pet</span>' : ''}
          ${avatarHTML(x, { tam: 'm', nivel: ok ? info.nivel : 1, estado: ativo ? undefined : false })}
          <b>${ok ? esc(ativo ? p.nome : x.especie) : '???'}</b>
          <small>${ok ? (ativo ? x.especie : 'Toque para adotar') : '🔒 ' + esc(x.requisito || '')}</small>
        </button>`;
      }).join('')}
    </div>`;
  },
};

function lojaHTML(d, info) {
  const pocao = pocaoAtiva();
  const inv = d.carteira.inventario;
  const abas = [['itens', '⚡ Itens'], ['pet', '🐾 Pet'], ['visual', '👕 Visual'], ['skins', '✨ Skins de pet'], ['temas', '🎨 Temas']];
  const botao = (id, preco, { travado = false, possui = false, rotulo } = {}) => {
    const pode = !travado && !possui && d.carteira.moedas >= preco;
    return `<button class="btn ${possui ? 'secundario' : pode ? 'primario' : 'secundario'} btn-comprar" data-acao="comprar" data-id="${id}" ${travado ? 'disabled' : ''}>${rotulo || (possui ? 'Usar' : `🪙 ${preco}`)}</button>`;
  };
  let conteudo = '';
  if (abaLoja === 'itens') {
    conteudo = `<div class="lista-loja">${ITENS.map((it) => {
      const max = it.id === 'escudo' && d.carteira.escudos >= 2;
      const qtd = it.inventario ? inv[it.id] || 0 : null;
      return `<div class="item-loja card">
        <span class="item-loja-emoji">${it.emoji}</span>
        <span class="item-info"><b>${it.nome}${qtd ? ` <span class="tag">×${qtd}</span>` : ''}</b><small>${it.desc}</small></span>
        ${botao(`item:${it.id}`, it.preco, { travado: max, rotulo: max ? 'Máx.' : undefined })}
      </div>`;
    }).join('')}</div>
    ${inv.ampulheta || inv.bauMisterioso ? `<h2 class="secao-titulo">Mochila</h2><div class="botoes-linha">
      ${inv.ampulheta ? `<button class="btn secundario largo" data-acao="usar-ampulheta">⏳ Usar ampulheta (${inv.ampulheta})</button>` : ''}
      ${inv.bauMisterioso ? `<button class="btn primario largo" data-acao="abrir-bau-misterioso">🎁 Abrir baú (${inv.bauMisterioso})</button>` : ''}
    </div>` : ''}`;
  } else if (abaLoja === 'pet') {
    conteudo = `<p class="dica">Itens vão para a mochila e são usados em "Cuidar do pet". Seu pet vive da sua disciplina — os itens ajudam nos dias difíceis.</p>
    <div class="lista-loja">${ITENS_DO_PET.map((it) => `<div class="item-loja card">
        <span class="item-loja-emoji">${it.emoji}</span>
        <span class="item-info"><b>${it.nome}${inv[it.id] ? ` <span class="tag">×${inv[it.id]}</span>` : ''}</b><small>${it.desc}</small></span>
        ${botao(`pet:${it.id}`, it.preco)}
      </div>`).join('')}</div>
    <button class="btn secundario largo" data-acao="cuidar-pet">🐾 Ir cuidar do pet</button>`;
  } else if (abaLoja === 'visual') {
    const itens = visuaisDaLoja();
    const exclusivos = [];
    for (const c of CATEGORIAS) for (const o of opcoes(c.id)) if (!['gratis', 'loja'].includes(o.d.tipo)) exclusivos.push({ cat: c.id, catNome: c.nome, item: o });
    const card = ({ cat, catNome, item }, venda) => {
      const ok = liberado(cat, item, d);
      const equipado = d.avatar[cat] === item.id;
      const amostra = CATEGORIAS.find((c) => c.id === cat).tipo === 'cor' ? `<span class="amostra-cor grande" style="background:${item.hex}"></span>` : avatarSVG(previaItem(d.avatar, cat, item.id), 'mini');
      return `<div class="visual-card card r-${item.r}" style="--cor-r:${RARIDADES[item.r].cor}">
        <span class="visual-amostra">${amostra}</span>
        <b>${esc(item.nome)}</b>
        <small>${esc(catNome)}</small>
        ${etiquetaRaridade(item.r)}
        ${equipado ? '<span class="tag tag-neon">Equipado</span>' : ok ? botao(`visual:${cat}:${item.id}`, 0, { possui: true, rotulo: 'Equipar' }) : venda ? botao(`visual:${cat}:${item.id}`, item.d.preco) : `<small class="cadeado-texto">🔒 ${esc(comoLiberar(item))}</small>`}
      </div>`;
    };
    conteudo = `<p class="dica">Compre visuais para o seu personagem. Os itens exclusivos (épicos e lendários) não são vendidos: liberam com o seu progresso.</p>
      <div class="grade-visual">${itens.map((x) => card(x, true)).join('')}</div>
      <h2 class="secao-titulo">Exclusivos de progresso</h2>
      <div class="grade-visual">${exclusivos.map((x) => card(x, false)).join('')}</div>`;
  } else if (abaLoja === 'skins') {
    const p = companheiro();
    conteudo = `<p class="dica">Skins mudam as cores do ${esc(p.nome)}. As lendárias liberam com o progresso.</p>
      <div class="grade-visual">${SKINS_PET.map((sk) => {
        const ok = skinLiberada(sk, d);
        const usando = d.pet.skin === sk.id;
        return `<div class="visual-card card r-${sk.r}" style="--cor-r:${RARIDADES[sk.r].cor}">
          <span class="visual-amostra">${avatarHTML(p, { tam: 'm', skin: sk.id, estado: false })}</span>
          <b>${esc(sk.nome)}</b>
          ${etiquetaRaridade(sk.r)}
          ${usando ? '<span class="tag tag-neon">Em uso</span>' : ok ? botao(`skin:${sk.id}`, 0, { possui: true, rotulo: 'Usar' }) : sk.d.tipo === 'loja' ? botao(`skin:${sk.id}`, sk.d.preco) : `<small class="cadeado-texto">🔒 ${esc(comoLiberar({ d: sk.d }))}</small>`}
        </div>`;
      }).join('')}</div>`;
  } else {
    conteudo = `<div class="grade-temas">
    ${TEMAS.map((t) => {
      const tem = d.loja.temas.includes(t.id);
      const usando = d.loja.temaAtivo === t.id;
      const travado = t.nivel && info.nivel < t.nivel;
      return `<button class="tema-card card ${usando ? 'usando' : ''}" data-acao="comprar" data-id="tema:${t.id}" style="--t1:${t.c1};--t2:${t.c2}">
        <span class="tema-amostra"></span>
        <b>${t.nome}</b>
        <small>${usando ? '✓ Em uso' : tem ? 'Usar' : travado ? `🔒 Nível ${t.nivel}` : `🪙 ${t.preco}`}</small>
      </button>`;
    }).join('')}
  </div>`;
  }
  return `
  <section class="card carteira">
    <div><small>Suas moedas</small><strong class="numero-grande">🪙 ${d.carteira.moedas}</strong></div>
    <div class="carteira-itens">
      <span class="tag">🛡️ ${d.carteira.escudos}/2 escudos</span>
      ${pocao ? `<span class="tag tag-pocao">🧪 +${d.carteira.boostPct || 50}% até ${formatarHora(d.carteira.boostAte)}</span>` : ''}
      ${d.carteira.ampulhetaDia === hojeKey() ? '<span class="tag">⏳ +1h hoje</span>' : ''}
    </div>
    <p class="dica">Ganhe moedas com XP (1 a cada 10), missões, baú diário, carinho no pet e medalhas.</p>
  </section>
  <div class="abas-loja">${abas.map(([id, nome]) => `<button class="${abaLoja === id ? 'on' : ''}" data-acao="aba-loja" data-aba="${id}">${nome}</button>`).join('')}</div>
  ${conteudo}`;
  }

function mostrarPersonagem(id) {
  const d = dados();
  const x = personagem(id);
  const ok = !!d.colecao[id];
  const ativo = d.pet.especie === id;
  const nivel = nivelInfo().nivel;
  abrirSheet({
    titulo: ok ? x.especie : 'Pet bloqueado',
    html: `<div class="conquista-detalhe ${ok ? 'ok' : ''}" style="--cor-pers:${x.cor}">
        <div class="${ok ? '' : 'silhueta'}">${avatarHTML(x, { tam: 'gg', nivel: ok ? nivel : 1, estado: ativo ? undefined : false })}</div>
        <h3 class="${ok ? 'gradiente-texto' : ''}">${ok ? esc(ativo ? companheiro().nome : x.especie) : '???'}</h3>
        <p>${ok ? (x.jeito ? `Personalidade: ${x.jeito}.` : `Desbloqueado em ${formatarDataHora(d.colecao[id])}.`) : `Como desbloquear: <b>${esc(x.requisito)}</b>`}</p>
        ${ok ? `<div class="onb-estagios">${ESTAGIOS.map((e) => `<div class="${nivel >= e.nivel ? '' : 'apagado'}">${avatarHTML(x, { tam: 'p', nivel: e.nivel, estado: false })}<small>${e.nome}</small></div>`).join('')}</div>` : ''}
        ${ok && !ativo ? `<label class="campo"><span>Nome do novo pet</span><input class="entrada" name="nomeNovo" maxlength="16" value="${esc(x.nome)}"></label>
          <button class="btn primario largo" data-escolher>Adotar como meu pet</button>
          <p class="dica">Os cuidados (força, limpeza, alegria) continuam os mesmos.</p>` : ''}
        ${ativo ? '<p class="dica">✓ Este é o seu pet atual.</p>' : ''}
      </div>`,
    aoMontar(corpo, fechar) {
      const b = corpo.querySelector('[data-escolher]');
      if (b) {
        b.addEventListener('click', () => {
          const nome = (corpo.querySelector('[name="nomeNovo"]').value || x.nome).trim().slice(0, 16);
          alterar(() => {
            d.pet.especie = id;
            d.pet.nome = nome;
            d.pet.skin = skinLiberada(SKINS_PET.find((s) => s.id === d.pet.skin) || SKINS_PET[0], d) ? d.pet.skin : 'normal';
          });
          fechar();
          tocar('fanfarra');
          confete({ quantidade: 70 });
          toast(`${nome} agora é o seu pet! 🐾`);
        });
      }
    },
  });
}

/** Baú misterioso com suspense. */
function abrirBauMisteriosoAnimado() {
  let res;
  alterar(() => (res = abrirBauMisterioso()), { silencioso: true });
  if (!res.ok) return toast(res.msg, { tipo: 'erro' });
  const d = dados();
  const amostra = res.premio
    ? CATEGORIAS.find((c) => c.id === res.premio.cat).tipo === 'cor'
      ? `<span class="amostra-cor gigante" style="background:${res.premio.item.hex}"></span>`
      : avatarSVG(previaItem(d.avatar, res.premio.cat, res.premio.item.id), 'grande')
    : '🪙';
  const raiz = document.createElement('div');
  raiz.className = 'bau-raiz';
  raiz.innerHTML = `<div class="bau-caixa">
      <div class="bau-emoji tremendo">🎁</div>
      <div class="bau-premio">
        <div class="bau-visual">${amostra}</div>
        ${res.premio ? etiquetaRaridade(res.premio.item.r) : ''}
        <h3 class="gradiente-texto">${esc(res.premio ? res.premio.item.nome : '300 moedas')}</h3>
        <p>${esc(res.msg)}</p>
        <div class="botoes-linha">
          ${res.premio ? '<button class="btn primario largo" data-equipar>Equipar agora</button>' : ''}
          <button class="btn secundario largo" data-fechar-bau>Fechar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(raiz);
  requestAnimationFrame(() => raiz.classList.add('aberta'));
  vibrar([20, 40, 20, 40, 20]);
  setTimeout(() => {
    raiz.classList.add('revelado');
    tocar('bau');
    confete({ quantidade: res.premio && res.premio.item.r === 'epico' ? 160 : 100 });
  }, 1100);
  raiz.addEventListener('click', (e) => {
    if (!raiz.classList.contains('revelado')) return;
    const eq = e.target.closest('[data-equipar]');
    if (eq) alterar(() => (d.avatar[res.premio.cat] = res.premio.item.id));
    if (eq || e.target.closest('[data-fechar-bau]')) {
      raiz.classList.remove('aberta');
      setTimeout(() => raiz.remove(), 250);
      alterar(() => {});
    }
  });
}

function comprarItem(id) {
  let res;
  alterar(() => (res = comprar(id)));
  if (!res) return;
  if (res.ok) {
    tocar(res.festa ? 'fanfarra' : 'moeda');
    if (res.festa) confete({ quantidade: 80 });
    vibrar([15, 30, 15]);
  } else {
    vibrar(40);
  }
  toast(res.msg, { tipo: res.ok ? '' : 'erro' });
}

