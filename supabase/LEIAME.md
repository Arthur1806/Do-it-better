# Servidor do Do It Better (Supabase)

Projeto: `do-it-better` (região São Paulo, plano grátis) — `https://qrqmqrapxgxnocklgunm.supabase.co`.
A chave usada no app (`js/nuvem.js`) é a **chave pública** (publishable): pode ficar no GitHub.
Quem protege os dados são as regras de segurança (RLS) e as funções abaixo.

## Tabelas

| Tabela | O que guarda | Quem lê | Quem escreve |
|---|---|---|---|
| `perfis` | nick, código de amigo, personagem, pet, nível, XP da semana, sequência, liga | qualquer jogador logado | só as funções (`publicar_perfil`, `trocar_nick`) e a Edge Function |
| `saves` | o jogo inteiro (JSON) + número de revisão | só o dono | só `salvar_save` |
| `recuperacao` | hash do código de recuperação | ninguém pelo app | só a Edge Function |
| `amizades` | pedidos (`pendente`) e amizades (`aceita`) | as duas pessoas | funções (`pedir_amizade`, `responder_amizade`); cada um pode apagar a sua |
| `grupos`, `grupo_membros` | grupos privados (até 50 pessoas, só amigos) | só membros | funções |

| `atividade_diaria` | dias em que cada conta usou o app (gravado por `publicar_perfil`) | ninguém pelo app | só o servidor |
| `recompensas` | prêmios entregues pelo servidor (ex.: indicação) | ninguém pelo app | `registrar_indicacao`; resgate em `resgatar_recompensas` |
| `admins` | e-mails de admin | ninguém pelo app | só pelo painel/SQL |

## Funções (RPC, todas exigem login)

- `resgatar_recompensas()` — devolve e apaga os prêmios pendentes (cada um só uma vez).
- `meus_indicados()` — quantas pessoas entraram pelo seu convite.
- `metricas_admin()` — painel do fundador (nega quem não é admin).
- `sou_admin()` — modo admin.

- `salvar_save(p_dados, p_rev_base, p_dispositivo)` → `{rev, conflito}` — não deixa um aparelho apagar o outro.
- `publicar_perfil(p)` — atualiza o perfil público com **limites** (XP da semana até 15.000, nível até 50...).
- `trocar_nick(p_nick)` — 1 vez a cada 30 dias.
- `buscar_jogador(p_busca)` — por `@nick`, código de amigo ou **e-mail exato** (o e-mail nunca é devolvido).
- `pedir_amizade`, `responder_amizade`, `meus_amigos`.
- `ranking_geral(p_limite)`, `ranking_amigos()`, `ranking_grupo(p_grupo)` — semana de segunda a domingo (fuso de São Paulo).
- `criar_grupo`, `adicionar_ao_grupo`, `sair_do_grupo`, `meus_grupos`.

## Modo admin

A tabela `admins` (só e-mails, ninguém lê pelo app) e a função `sou_admin()` dizem se a conta logada é admin.
Nesse caso o app (`js/admin.js`) deixa tudo no máximo e repõe sempre que abre: nível 50 + 5 estrelas,
Lenda em Chamas, todos os pets/skins/temas/visuais/medalhas, pet Fera Suprema com tudo em 100,
moedas, DNA, escudos e mochila cheios. O XP extra entra como ajuste e **não conta no XP da semana**
(o ranking continua justo). Para adicionar outro admin: `insert into public.admins (email) values ('...')`.

## Edge Function `conta` (sem e-mail)

Código-fonte versionado em `supabase/functions/conta/index.ts` (publicada com `verify_jwt = false`).

O app **não envia e-mails**. A função cria a conta já confirmada e devolve um **código de recuperação**
(mostrado uma vez; no banco fica só o hash):

- `cadastrar` {email, senha, nick, convite?} (com convite: chama `registrar_indicacao`) · `recuperar` {email, codigo, senha} · `novo-codigo` (logado) · `excluir` (logado — apaga tudo em cascata).

## Se alguém perder a senha E o código

O dono do projeto pode definir uma senha nova para a pessoa no painel do Supabase
(**Authentication → Users**, abrir o usuário) e passar para ela — ou pedir isso ao Claude pelo conector do Supabase.
Depois, em **Social → Conta → Novo código de recuperação**, a pessoa gera um código novo.
