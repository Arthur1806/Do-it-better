# Do It Better 🎮✅

App pessoal (PWA) para organizar o dia a dia como um jogo: você ganha **XP**, sobe de **nível** e desbloqueia **conquistas** cumprindo rotina, pendências e treinos.

- HTML, CSS e JavaScript puros: sem framework, sem npm, sem build.
- Funciona offline e se instala na Tela de Início do iPhone como um app nativo.
- Funciona sem conta (dados só no aparelho) ou com conta grátis (v5.1): progresso na nuvem, ranking, amigos e grupos.

---

## Novidades da versão 5.2 — Dieta 🥗

- **A aba Treinos agora tem Treino e Dieta:** um seletor no topo (igual ao da aba Tarefas) troca entre as fichas de treino e o seu **plano alimentar**.
- **Suas refeições com horário:** crie cada refeição (café da manhã, almoço, pré-treino, jantar...) com **horário**, **o que comer** (quantidade + alimento), calorias e proteína (opcionais), observações e os **dias da semana** em que vale. Sem tempo para montar? Toque em **Usar um modelo** e ajuste depois.
- **Sempre sabendo o que comer:** o card **Próxima refeição** mostra o que vem a seguir, quanto falta ("em 20 min", "hora de comer!") e os alimentos. Um toque em **✓ Comi** marca a refeição — o check reinicia sozinho todo dia.
- **No Plano de hoje:** as refeições aparecem na tela Hoje junto com rotina, desafios e treino, em ordem de horário.
- **Aviso na barra de abas:** a aba Treinos ganha um ponto quando chega a hora de uma refeição.
- **Metas do dia:** calorias e proteína consumidas (somadas quando você marca "Comi") contra a sua meta, mais os pontinhos da semana.
- **XP:** cada refeição vale **+8 XP** (cheio até 1h depois do horário; depois 75% → 50% → 25%) e cumprir todas as refeições do dia dá **+30 XP** de bônus. O pet também fica mais forte.
- A dieta é **privada**: não aparece no perfil público nem para os amigos.

## Novidades da versão 5.1 — Online 🌎

- **Conta e nuvem:** crie uma conta com **e-mail, senha e nick** (aba **🏆 Social**). Não mandamos e-mail: na hora você recebe um **código de recuperação** — guarde (print!) para trocar a senha se esquecer.
- **Seu progresso na nuvem:** o jogo continua funcionando offline e salvando no aparelho; logado, cada mudança sobe sozinha para a nuvem alguns segundos depois. Trocou de celular? Entre na conta e tudo volta. Se dois aparelhos mudarem ao mesmo tempo, vale o mais recente (o outro fica como cópia de segurança).
- **Ranking geral da semana** com todo mundo que usa o app (zera toda segunda) e **ranking só dos amigos**. Dá para sair do ranking geral em Social → Conta.
- **Amigos:** busque por **@nick**, **e-mail exato** ou **código de amigo**; pedidos com aceitar/recusar; **convite pelo WhatsApp** com link (`?amigo=nick`). Quem abre o link vê como instalar e o convite já fica pronto para colar.
- **Perfil público:** toque num jogador para ver o personagem, o pet (com a mutação e o fogo), nível, XP da semana, sequência e liga.
- **Grupos privados** (família, academia, trabalho...) só com amigos, cada um com o seu ranking semanal.
- **Privacidade:** pendências, notas, gastos e compras nunca aparecem para ninguém. Botão **Excluir conta** apaga tudo da nuvem.
- Detalhes do servidor em [`supabase/LEIAME.md`](supabase/LEIAME.md).

## Novidades da versão 5.0 — Evolução 🔥

- **Jornada mais longa e desafiadora:** o nível máximo agora é o **50** (cerca de um ano de uso diário). Cada nível pede um pouco mais de XP: `90 × N^1,1` (mínimo 100). Quem já jogava **não perde nível nem físico** (a conversão faz um ajuste automático).
- **⭐ Prestígio:** no nível 50 dá para recomeçar a contagem de níveis e ganhar uma estrela (+5% de XP para sempre, até 5). Tudo o que já foi liberado continua liberado.
- **🎯 Desafios diários e semanais:** os 3 desafios do dia continuam; toda segunda chegam **4 desafios da semana** (rotina 100% em 5 dias, treinos, água, pet, XP da semana...). Pagam XP, moedas e **DNA 🧬**. Resgatar os 4 dá o baú da semana (+250 XP, +150 moedas, +3 DNA e um escudo) e conta para itens exclusivos.
- **🧬 Mutações do pet:** com nível e DNA o pet muta: **Filhote → Mutante (nív. 8, 5 DNA) → Fera (nív. 20, 20 DNA) → Fera Suprema (nív. 35, 40 DNA)**. Cada estágio deixa o pet maior e mais bravo (olhos vermelhos, presas, chifres, garras, espinhos, cicatriz) e com uma **aura de fogo animada** em pixel art.
- **💔 Castigo:** se a comida **ou** a água do pet chegarem a zero (alguns dias abandonado), ele **perde um estágio de mutação**. Voltar a um estágio que ele já teve custa metade do DNA.
- **DNA também vem do pet:** a cada 3 dias seguidos terminando com o pet bem cuidado (tudo ≥ 70), +1 DNA.
- **👕 Personagem redesenhado em 24 × 32:** corpo com 4 moldes (franzino → muito musculoso), roupas com mangas, golas, botões, zíper, bolsos e sombras, calças com cinto e costuras, tênis com sola e cadarço.
- **Peças novas:** camisa de time, jaqueta de couro, kimono, traje ninja, bermuda cargo, calça rasgada, cicatriz, máscara ninja e corrente de ouro (várias liberam completando semanas de desafios).
- **🔥 Forma final do personagem:** físicos nos níveis 5, 12, 22, 35 e **50 — Lenda em Chamas**, com fogo de verdade em volta (simulação de chamas em pixel art, vários quadros animados). O Guerreiro tem brasas e o Imparável, energia azul.
- Esquema de dados 5 (migração automática).

## Novidades da versão 4.1

- **Personagem e pet em destaque na tela Hoje:** um palco grande no topo, com o seu boneco e o pet lado a lado, nomes, nível, estágio do pet, fala e as necessidades.
- **Editor do personagem sem "pulos":** ao tocar numa categoria (Sapato, Cor da roupa, Acessório...) ou num item, a barra de categorias e a lista ficam onde estavam.
- **Abas só pelo toque:** deslizar para o lado não troca mais de aba (evita trocas sem querer).

## Novidades da versão 4.0

- **📋 Plano de hoje:** a tela Hoje agora mostra numa lista só, em ordem de horário, tudo o que é para fazer no dia — itens da rotina, desafios (checks), pendências com prazo hoje ou atrasadas e o treino. Cada linha tem uma **caixinha grande com ✓** para marcar (as atrasadas ficam em laranja). O que já foi feito desce para "Feitos hoje".
- **Marcar feito sem confusão:** os blocos de desafio (ex.: Quarto arrumado) têm um botão **"✓ Marcar feito"**; tocar no resto do cartão não marca mais nada sem querer. Rotina e pendências usam a mesma caixinha com ✓.
- **Abas organizadas:** `Hoje · Tarefas · Treinos · Pet · Perfil`.
  - **Tarefas** junta Rotina e Pendências (seletor no topo; o "+" cria o tipo aberto).
  - **Pet** junta Cuidar, Personagem, Loja e Coleção.
  - **Perfil** fica só com Jornada, Medalhas e Ajustes.
  - Missões do dia têm uma seção própria na tela Hoje; os blocos do painel ficam abaixo.
- **🍖 Comida e água custam moedas:** o pet sente fome e sede com o tempo (mesmo com o app fechado). Água 🪙5, ração 🪙12, ração premium 🪙40. Sem rotina → sem moedas → sem comida, e com fome ou sede ele perde força e alegria.
- **💪 Evolução física do personagem** (pelo nível): Franzino (1) → Treinado (3) → Forte (6) → Guerreiro (10, faixa e pintura de batalha, aura de fogo) → Imparável (20, olhos brilhando e aura de energia).
- Quem já usava o app vê uma tela de novidades uma vez; os dados são migrados sozinhos (esquema 4).

## Novidades da versão 3.0

- **Seu personagem em pixel art:** um boneco humano que você monta do seu jeito: tom de pele, cabelo (estilo e cor), roupa, calça, sapato, chapéu/boné e acessório, cada um com cor.
- **Itens exclusivos por raridade:** comum, raro, épico e lendário. Os comuns são grátis, os raros estão na loja, e os épicos e lendários liberam com o progresso. Exemplos: moicano no nível 6, tranças com 14 dias seguidos, cabelo de fogo com 30 dias, traje de herói no nível 20, coroa com uma semana perfeita, terno na liga Mestre. Quando um exclusivo libera, aparece uma celebração.
- **Pet em pixel art:** você escolhe o pet (cachorro, gato, raposa, panda ou lobo) e dá um nome a ele. Mais 13 pets liberam com o progresso, e há skins (algodão-doce, sombra, neon, dourado, fantasma).
- **Seu pet depende de você:** ele tem 💪 força, 🧼 limpeza e 😊 alegria.
  - Cada hábito, treino e pendência deixa o pet mais forte.
  - Dias sem rotina deixam o pet **fraco, sujo e triste**: ele fica desbotado, com manchas de lama, moscas, olhos caídos e lágrimas.
  - Para recuperar: carinho (1x por dia, +5 moedas), banho (grátis 1x por dia depois de cumprir 1 hábito) e itens da loja.
  - Pet bem cuidado (tudo ≥ 70) dá **+5% de XP**.
- **Horário nas atividades:** cada hábito da rotina pode ter um horário limite. Até ele vale 100% do XP; até 1h depois, 75%; até 3h depois, 50%; depois disso, 25%. Os desafios matinais seguem a mesma regra. As pendências podem ter horário no prazo.
- **Loja ampliada**, com cinco abas:
  - **Itens:** escudo, poção, super poção (XP em dobro), ampulheta (+1h em todos os horários do dia) e baú misterioso (um visual aleatório).
  - **Pet:** petisco, ração premium, brinquedo, sabonete e kit de cuidados.
  - **Visual:** roupas e cores.
  - **Skins de pet.**
  - **Temas.**
- Missões novas: "cumpra hábitos no horário", "dê banho no pet" e "faça carinho no pet".
- Quem já usava o app: o companheiro vira o seu pet (com o mesmo nome) e o app abre o criador de personagem uma vez. Nada é perdido (esquema de dados 2 → 3).

## Novidades da versão 2.0

- **Questionário de primeira entrada:** nome, objetivo, companheiro, áreas que quer melhorar, horário em que acorda, rotina sugerida, desafios matinais, treino (local, frequência, divisão e nível), pendências da vida real e metas. O app monta tudo sob medida — inclusive a ordem do painel. Dá para refazer em **Perfil → Ajustes → Refazer personalização** (seus dados são mantidos).
- **Companheiro que evolui:** Kira (raposa), Bao (panda) ou Rex (lobo). Ele fala com você, muda de humor conforme o seu dia e evolui com o seu nível: Filhote → Aprendiz → Guerreiro → Mestre → Lendário.
- **Coleção de personagens:** 13 personagens extras desbloqueados pelo seu progresso (sequências, treinos, pendências, água, missões, ligas...). O Dragão Ignis é lendário.
- **Missões do dia:** 3 missões sorteadas conforme o que você usa. Resgate XP + moedas; as 3 resgatadas dão um baú bônus.
- **Baú diário:** prêmio surpresa todo dia; abrir em dias seguidos aumenta a "Presença" e o valor do prêmio.
- **Moedas e loja:** 1 moeda a cada 10 XP, mais missões, baús e medalhas. Compre **Escudo de sequência** (salva sua sequência num dia falhado), **Poção de XP** (+50% por 1 hora) e **temas de cor**.
- **Medalhas em 4 níveis:** Bronze, Prata, Ouro e Diamante em 14 séries, mais medalhas especiais. Cada uma paga moedas.
- **Liga da semana:** seu XP semanal define a liga (Bronze → Mestre), comparando com a semana passada.
- **Combos e sons:** concluir várias coisas em sequência rápida gera combo; efeitos sonoros curtos (desligáveis em Ajustes).
- **Alerta de sequência em risco** à noite, se a rotina ainda não fechou.
- **Navegação nova:** transições na direção da aba, indicador luminoso na barra de abas, avisos (números e pontos) nos ícones, barra de título compacta ao rolar, deslizar uma pendência → conclui / ← edita, e o Perfil dividido em Jornada · Coleção · Medalhas · Loja · Ajustes.
- **Correção da barra preta no iPhone:** o app mede a altura real da tela no modo instalado e todas as camadas passaram a ser relativas a ela.
- Seus dados antigos são migrados automaticamente (versão do esquema 1 → 2), sem perder nada.

---

## Estrutura de pastas

```
do-it-better/
├── index.html              ← página única do app (meta tags da Apple, abas, gradientes SVG)
├── manifest.json           ← manifesto PWA (nome, ícones, standalone, start_url/scope "./")
├── sw.js                   ← service worker: cache offline + VERSÃO do app
├── .nojekyll               ← avisa o GitHub Pages para servir os arquivos como estão
├── css/
│   ├── style.css           ← visual base (tema escuro/claro, vidro fosco, listas, treino)
│   ├── jogo.css            ← companheiro, missões, baú, loja, coleção, questionário, navegação
│   └── personagem.css      ← pixel art, personagem, pet, editor, loja e horários
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
    ├── painel.js           ← aba Hoje (placar, Plano de hoje, missões e blocos/widgets)
    ├── tarefas.js          ← aba Tarefas (seletor Rotina | Pendências)
    ├── rotina.js           ← lista da Rotina (checks diários, bônus, calendário)
    ├── pendencias.js       ← lista de Pendências (prazo, prioridade, etiquetas, desfazer)
    ├── treinos.js          ← aba Treinos (fichas, rodízio, Treinando agora, evolução)
    ├── extras.js           ← água, notas rápidas, lista de compras, gastos do mês
    ├── perfil.js           ← aba Perfil (Jornada, Medalhas, Ajustes)
    ├── petaba.js           ← aba Pet (Cuidar, Personagem, Loja, Coleção)
    ├── onboarding.js       ← questionário de primeira entrada (monta o app para você)
    ├── personagens.js      ← pets (pixel art), skins, evolução, coleção, humor e falas
    ├── pixel.js            ← motor de pixel art em SVG + desenhos dos pets
    ├── boneco.js           ← o personagem 24x32: moldes do corpo, roupas como regras, cabelos, chapéus e acessórios
    ├── fogo.js             ← aura de fogo em pixel art (simulação de chamas em quadros)
    ├── mutacao.js          ← mutações do pet (regras, custo em DNA e desenho por camadas)
    ├── desafios.js         ← desafios semanais e DNA 🧬
    ├── nuvem.js            ← conexão com o servidor (login, sessão, chamadas ao banco) sem biblioteca
    ├── sync.js             ← sincronização offline-primeiro do save + perfil público
    ├── social.js           ← aba Social: ranking, amigos, grupos, conta e convite pelo link
    ├── visual.js           ← personalização do personagem, raridades, desbloqueios e evolução física
    ├── visual-padrao.js    ← visual inicial do personagem
    ├── pet.js              ← necessidades do pet (comida, água, força, limpeza, alegria) e cuidados
    ├── telas-personagem.js ← criador do personagem, cena personagem + pet, cuidar do pet
    ├── missoes.js          ← desafios do dia (missões), baú diário e ligas semanais
    ├── loja.js             ← itens (escudo, poção) e temas de cor
    └── sons.js             ← efeitos sonoros gerados na hora (sem arquivos de áudio)
```

---

## Regras do jogo (resumo)

| Ação | XP padrão |
|---|---|
| Item da rotina | 10 (editável por item), conforme o horário: 100% · 75% · 50% · 25% |
| Rotina 100% no dia | +50 de bônus |
| Pendência alta / média / baixa | 30 / 20 / 10 (metade se concluída depois do prazo) |
| Bloco de check (ex.: Quarto arrumado) | o que você definir, com a mesma regra de horário |
| Treino finalizado | 100 |
| Recorde de carga no treino | +50 |
| Meta de água do dia | 15 |

- Para passar do **nível N** ao próximo: **90 × N^1,1 XP** (mínimo 100). Nível máximo: **50**; depois, prestígio ⭐.
- **Multiplicador:** a cada 7 dias seguidos com a rotina 100% → +10% de XP (máximo +50%). Falhou um dia, zera. Dias sem itens programados não contam nem quebram.
- **Desfazer** sempre remove o XP (e as moedas que ele deu) — não há pontos duplicados.
- **Escudo de sequência:** se você falhar a rotina num dia e tiver escudo, ele é usado sozinho na virada do dia e a sequência continua (o dia aparece com 🛡️ no calendário).
- **Moedas:** 1 a cada 10 XP; missões 10–20; baú diário 10–70 (cresce com a presença); medalhas 🥉10 · 🥈25 · 🥇60 · 💎150; carinho no companheiro 5 por dia.
- **Pet:** comida e água caem com o tempo (a comida dura ~3 dias, a água ~2). Compre na aba **Pet → Cuidar** com moedas (ou use o que tem na mochila).
- **Físico do personagem:** muda nos níveis 5, 12, 22, 35 e 50.
- **Mutações do pet:** nível + DNA 🧬; perde um estágio se a comida ou a água chegarem a zero.
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
   const VERSAO = '3.0.0';   // ex.: mude para '3.0.1'
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
- **Nova medalha:** adicione uma série em `SERIES` (ou uma especial em `ESPECIAIS`) em `js/conquistas.js`.
- **Novo pet:** adicione em `PERSONAGENS` em `js/personagens.js` (escolha um desenho de `PET_SPRITES` em `js/pixel.js` e uma paleta de cores), com o requisito e a função `teste(d)`.
- **Nova roupa/cabelo/chapéu:** desenhe a grade em `js/pixel.js` (16 colunas; cada letra é uma cor) e adicione a linha em `ESTILOS` em `js/visual.js` com a raridade e a forma de desbloquear.
- **Nova cor:** adicione em `CORES` em `js/visual.js`.
- **Nova missão:** adicione em `CATALOGO` em `js/missoes.js`.
- **Novo item ou tema na loja:** `ITENS` e `TEMAS` em `js/loja.js`.
- **Novo tipo de bloco no painel:** veja o comentário no topo de `js/painel.js`.
- Depois de qualquer mudança, lembre de aumentar a `VERSAO` no `sw.js`.
