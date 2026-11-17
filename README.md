# Do It Better 🎮✅

App pessoal (PWA) para organizar o dia a dia como um jogo: você ganha **XP**, sobe de **nível** e desbloqueia **conquistas** cumprindo rotina, pendências e treinos.

- HTML, CSS e JavaScript puros: sem framework, sem npm, sem build.
- Funciona offline e se instala na Tela de Início do iPhone como um app nativo.
- Os dados ficam **só no seu aparelho** (localStorage). Não tem login nem servidor. Faça backup pelo Perfil.

---

## Estrutura de pastas

```
do-it-better/
├── index.html              ← página única do app (meta tags da Apple, abas, gradientes SVG)
├── manifest.json           ← manifesto PWA (nome, ícones, standalone, start_url/scope "./")
├── sw.js                   ← service worker: cache offline + VERSÃO do app
├── .nojekyll               ← avisa o GitHub Pages para servir os arquivos como estão
├── css/
│   └── style.css           ← todo o visual (tema escuro/claro, vidro fosco, animações)
├── icons/
│   ├── icon.svg            ← ícone original (vetor)
│   ├── apple-touch-icon.png  (180×180, usado pelo iPhone)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── ferramentas/
│   └── gerar-icones.html   ← converte o SVG em PNG direto no navegador
└── js/
    ├── app.js              ← ponto de entrada: inicia tudo, virada do dia, botão +, atualização
    ├── store.js            ← CAMADA ÚNICA DE DADOS: versão do esquema, migrações, backup
    ├── utils.js            ← datas (dd/mm/aaaa, semana começa na segunda), formatação, eventos
    ├── historico.js        ← registro diário, virada do dia, sequências e multiplicador
    ├── xp.js               ← XP, níveis e títulos (lançamentos com desfazer)
    ├── conquistas.js       ← medalhas e suas regras
    ├── seed.js             ← dados de exemplo da primeira abertura
    ├── nav.js              ← navegação entre as abas
    ├── ui.js               ← folhas, alertas, toasts, +XP, confete, vibração, arrastar
    ├── graficos.js         ← anel, barras e linha em SVG (sem biblioteca)
    ├── painel.js           ← aba Hoje (placar + blocos/widgets + blocos de check)
    ├── rotina.js           ← aba Rotina (checks diários, bônus, calendário)
    ├── pendencias.js       ← aba Pendências (prazo, prioridade, etiquetas, desfazer)
    ├── treinos.js          ← aba Treinos (fichas, rodízio, Treinando agora, evolução)
    ├── extras.js           ← água, notas rápidas, lista de compras, gastos do mês
    └── perfil.js           ← aba Perfil (nível, gráficos, conquistas, ajustes, backup)
```

---

## Regras do jogo (resumo)

| Ação | XP padrão |
|---|---|
| Item da rotina | 10 (editável por item) |
| Rotina 100% no dia | +50 de bônus |
| Pendência alta / média / baixa | 30 / 20 / 10 (metade se concluída depois do prazo) |
| Bloco de check (ex.: Quarto arrumado) | o que você definir; metade depois do horário-limite |
| Treino finalizado | 100 |
| Recorde de carga no treino | +50 |
| Meta de água do dia | 15 |

- **Nível N** precisa de **100 × N XP** para passar ao próximo.
- **Multiplicador:** a cada 7 dias seguidos com a rotina 100% → +10% de XP (máximo +50%). Falhou um dia, zera. Dias sem itens programados não contam nem quebram.
- **Desfazer** sempre remove o XP — não há pontos duplicados.
- Todos os valores podem ser mudados em **Perfil → Ajustes → Valores de XP**.

---

## Ícone: como converter o SVG em PNG

Os PNGs **já estão prontos** na pasta `icons/`. Se você mudar o `icons/icon.svg`, gere de novo (180×180 e 512×512 são os essenciais) de um destes jeitos:

1. **Pelo próprio app (mais fácil):** depois de publicar, abra
   `https://SEU-USUARIO.github.io/do-it-better/ferramentas/gerar-icones.html`,
   toque em cada botão "Baixar" e substitua os arquivos na pasta `icons/` com os mesmos nomes.
2. **Site de conversão:** em sites como CloudConvert ou svgtopng, envie o `icon.svg`, escolha a largura (180 e depois 512) e baixe.
3. **Linha de comando** (se tiver Inkscape ou librsvg instalados):
   ```bash
   inkscape icons/icon.svg -w 180 -h 180 -o icons/apple-touch-icon.png
   ```
   ```bash
   rsvg-convert -w 512 -h 512 icons/icon.svg -o icons/icon-512.png
   ```

> O ícone é um quadrado inteiro, sem cantos arredondados: o iPhone arredonda sozinho.

---

## Passo a passo

### 1. Criar o repositório "do-it-better" e subir os arquivos

1. Entre em [github.com](https://github.com) e faça login.
2. Clique em **+** (canto superior direito) → **New repository**.
3. Em *Repository name* escreva `do-it-better`, deixe **Public** e clique em **Create repository**.
4. Na página do repositório vazio, clique em **uploading an existing file**.
5. Arraste **todo o conteúdo** desta pasta (os arquivos `index.html`, `manifest.json`, `sw.js`, `.nojekyll`, `README.md` e as pastas `css`, `js`, `icons`, `ferramentas`). O `index.html` precisa ficar na raiz do repositório, não dentro de outra pasta.
   - Pelo computador, arrastar a pasta mantém a estrutura das subpastas.
   - O arquivo `.nojekyll` é oculto em alguns sistemas; se não aparecer, tudo bem: o app funciona sem ele.
6. Clique em **Commit changes**.

Se preferir o terminal (com o Git instalado), dentro da pasta do projeto:

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "Primeira versão do Do It Better"
```
```bash
git branch -M main
```
```bash
git remote add origin https://github.com/SEU-USUARIO/do-it-better.git
```
```bash
git push -u origin main
```

### 2. Ativar o GitHub Pages

1. No repositório, vá em **Settings** → **Pages** (menu da esquerda).
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha **main** e a pasta **/ (root)** → **Save**.
4. Espere 1 a 2 minutos. O endereço aparece no topo da página:
   `https://SEU-USUARIO.github.io/do-it-better/`

### 3. Abrir no Safari do iPhone e adicionar à Tela de Início

1. No iPhone, abra o **Safari** (precisa ser o Safari) e acesse `https://SEU-USUARIO.github.io/do-it-better/`.
2. Espere a página carregar por completo (assim ela fica salva para funcionar offline).
3. Toque no botão **Compartilhar** (quadrado com a seta para cima).
4. Role e toque em **Adicionar à Tela de Início**.
5. Confira o nome **Do It Better** e toque em **Adicionar**.
6. Abra pelo ícone novo: o app abre em tela cheia, sem a barra do Safari.

> Dica: abra pelo ícone da Tela de Início sempre. Os dados do app instalado são separados dos dados do Safari.

### 4. Atualizar o app quando mudar alguma coisa

1. Edite os arquivos que quiser.
2. Abra o `sw.js` e **aumente a versão** na linha:
   ```js
   const VERSAO = '1.0.0';   // ex.: mude para '1.0.1'
   ```
   Sem isso, o iPhone continua usando a versão guardada no cache.
3. Se criou um **arquivo novo** (ex.: `js/financas.js`), adicione o caminho dele na lista `ARQUIVOS` do `sw.js`.
4. Suba as mudanças para o GitHub (pelo site: abra o arquivo → ícone de lápis → *Commit changes*; ou `git add . && git commit -m "..." && git push`).
5. Espere 1 a 2 minutos pelo GitHub Pages.
6. No iPhone, abra o app. Ele mostra **"Nova versão disponível — Atualizar"**. Toque em **Atualizar**.
   Também dá para forçar em **Perfil → Procurar atualização**. Se não aparecer na hora, feche o app (deslize para cima) e abra de novo.

Seus dados **não se perdem** na atualização.

---

## Seus dados e o backup

- Tudo fica no armazenamento local do app no iPhone. Se apagar o app da Tela de Início, os dados vão junto.
- Em **Perfil → Backup → Exportar backup**, o iPhone abre a folha de compartilhamento: escolha **Salvar em Arquivos** (iCloud Drive, por exemplo).
- Para restaurar (ou passar para outro aparelho): **Perfil → Importar backup** e escolha o arquivo `.json`.
- **Apagar todos os dados** pede confirmação dupla (é preciso digitar APAGAR).
- **Limpar dados de exemplo** remove as fichas A/B/C, os 3 itens de rotina e o bloco "Quarto arrumado" de exemplo que você ainda não editou.

---

## Como evoluir o app sem perder dados

- **Campo novo com valor padrão** (ex.: `ajustes.metaSono`): adicione em `estadoPadrao()` no `js/store.js`. Os dados antigos recebem o padrão automaticamente.
- **Mudança de formato** (renomear ou reorganizar dados): em `js/store.js`, aumente `SCHEMA_VERSION` e escreva a migração em `MIGRACOES` (há um exemplo comentado lá).
- **Nova conquista:** adicione um item na lista `CONQUISTAS` em `js/conquistas.js`.
- **Novo tipo de bloco no painel:** veja o comentário no topo de `js/painel.js`.
- Depois de qualquer mudança, lembre de aumentar a `VERSAO` no `sw.js`.
