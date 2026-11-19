// =============================================================
// sw.js — Service worker: deixa o app funcionando OFFLINE.
//
// COMO ATUALIZAR O APP: depois de mudar qualquer arquivo, aumente a
// VERSAO abaixo (ex.: '1.0.0' -> '1.0.1') e suba para o GitHub.
// O iPhone baixa tudo de novo e o app mostra "Nova versão disponível".
// Se criar um arquivo novo, adicione-o também na lista ARQUIVOS.
// =============================================================

const VERSAO = '6.0.0';
const CACHE = `do-it-better-v${VERSAO}`;

// Todos os caminhos são relativos (o site roda em /do-it-better/)
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/jogo.css',
  './css/personagem.css',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './js/historico.js',
  './js/xp.js',
  './js/conquistas.js',
  './js/seed.js',
  './js/nav.js',
  './js/ui.js',
  './js/graficos.js',
  './js/painel.js',
  './js/rotina.js',
  './js/pendencias.js',
  './js/tarefas.js',
  './js/petaba.js',
  './js/treinos.js',
  './js/extras.js',
  './js/perfil.js',
  './js/personagens.js',
  './js/missoes.js',
  './js/loja.js',
  './js/onboarding.js',
  './js/sons.js',
  './js/pixel.js',
  './js/visual.js',
  './js/visual-padrao.js',
  './js/pet.js',
  './js/telas-personagem.js',
  './js/desafios.js',
  './js/mutacao.js',
  './js/fogo.js',
  './js/boneco.js',
  './js/nuvem.js',
  './js/sync.js',
  './js/social.js',
  './js/admin.js',
  './js/instalar.js',
  './js/jornada.js',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// Instala: baixa tudo (ignorando o cache HTTP, para pegar a versão nova)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))
  );
  // Não ativa sozinho: o app pergunta antes ("Nova versão disponível").
  // Na primeira instalação não há versão antiga, então ativa direto.
  if (!self.registration.active) self.skipWaiting();
});

// Ativa: apaga caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith('do-it-better-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Mensagens vindas do app
self.addEventListener('message', (e) => {
  if (e.data === 'pular-espera') self.skipWaiting();
  if (e.data === 'versao' && e.ports && e.ports[0]) e.ports[0].postMessage({ versao: VERSAO });
});

// Busca: primeiro o cache (rápido e offline); se não tiver, a rede
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Abrir o app (navegação) sempre devolve o index.html do cache
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((r) => r || fetch(req).catch(() => caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (r) =>
        r ||
        fetch(req).then((resp) => {
          if (resp.ok && resp.type === 'basic') {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
    )
  );
});
