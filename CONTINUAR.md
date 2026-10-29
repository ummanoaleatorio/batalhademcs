# Estadual SP 2026 · Batalha de MCs — como continuar o projeto

Site estático (HTML + CSS + JS puro, sem build). Domínio: **batalhademcs.com.br** (GitHub Pages, arquivo `CNAME`).
Organização: CPBMC (@cpbmc) · artes: @osuporteline · vaquinha: abacashi.com/vaquinha/final-estadual-sao-paulo-2026---cpbmc

## Abrir na sua máquina

Os navegadores bloqueiam parte do áudio e dos arquivos quando a página é aberta direto do disco, então rode um servidor local na pasta:

```bash
cd estadual-sp
python -m http.server 8000      # ou: npx serve .
```

Depois abra `http://localhost:8000` (chaveamento) e `http://localhost:8000/batalha.html` (jogo).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` · `style.css` · `script.js` | Chaveamento ao vivo (sorteio segurando o botão, palco, mural, campeão) |
| `compartilhar.js` | Gera a imagem de compartilhamento do campeão |
| `batalha.html` · `batalha.css` · `batalha.js` | **Modo Carreira** (simulador de batalha) |
| `musica.js` | Toca os beats. Carrega os loops prontos de `beats/*.mp3`; se o arquivo não abrir (ex.: página aberta direto do disco), monta o som na hora com Web Audio. Usado pelos dois |
| `beats/` | Os 8 loops gravados em MP3 (~2,9 MB no total; cada batalha baixa só os 3 que usa) |
| `imagens/` | Fotos dos 16 MCs, logo CPBMC, texturas |
| `ferramentas/exportar-beats.py` | Regrava os MP3 de `beats/` quando você mudar um estilo no `musica.js` (instruções dentro do arquivo) |
| `ferramentas/simular-equilibrio.js` | Simula milhares de batalhas pra calibrar a dificuldade (não vai pro site) |
| `CNAME` | Domínio do GitHub Pages |

O CSP (`script-src 'self'`) exige que todo JS fique em arquivo próprio, sem `<script>` inline.

## Modo Carreira — regras atuais

- Você escolhe um dos 16 MCs ou sorteia um (tem animação de apresentação). A chave é sorteada e a meta é vencer 4 batalhas.
- **Níveis secretos** (1 a 5) ficam em `MCS`, no topo do `batalha.js`. Hoje estão assim: nível 2 para Nathy, Arielzinha, Dandara, Rxnnin, Stevan e Cost; nível 3 para Hayato, Punka e Flowid; nível 4 para Dehatt, Grafiteh, Lil Vi e Magrão; nível 5 para Big Mike, Jotapê e Levinsk.
- **Chave ao vivo:** na tela da chave, as batalhas dos outros MCs rolam uma por uma, com placar, até chegar a sua (`rodarChave()`). Depois da sua batalha, "Ver as outras batalhas" continua de onde parou.
- **Começar o round dá uma leve vantagem:** `BONUS` tem iniciativa +6 e última palavra +2. A diferença é pequena de propósito.
- `sempreComeca: true` no Jotapê faz ele sempre escolher começar quando ganha o ímpar ou par.
- **Rounds:**
  - R1: um MC rima ~45 s e o outro responde pelo mesmo tempo (`SEGUNDOS_ENTRADA`).
  - R2: inverte quem começa.
  - R3, só se der 1 a 1: bate-volta, com `BATE_VOLTA_N` entradas de `BATE_VOLTA` batidas.
  - Ímpar ou par acontece no R1 e no R3.
- **Jogar:** clica no seu MC (ou aperta espaço) quando a nota chega na linha vermelha.
  - Tolerância em `JANELA` (perfeito 90 ms, boa 170 ms). Clicar fora de qualquer nota quebra o combo, pra ninguém sair metralhando.
  - Cada nota perfeita é FATALITY. 2 compassos perfeitos seguidos soltam um FATALITY grande.
  - 4 compassos limpos seguidos soltam a punchline automática.
- **Beats** ficam em `BEATS` (nome, som, padrao, peso, dica):
  - `som` é o loop do `musica.js`: classico, jazz, sujo, pesado, rapido, turbo, lento, arrastado.
  - `padrao` é o ritmo do clique, definido em `PADROES`: tempo, meio, dobrado, sincopado, galope, contratempo.
  - Os beats **dinâmicos** usam `padrao: 'variado'` mais `seq` (lista de ritmos) e `troca` (a cada quantos compassos muda). Toda batalha tem pelo menos um.
- **Votos** ficam em `VOTANTES`: Jurado 1 (técnica), Jurado 2 (punchline) e Plateia.
  - Os pontos são separados em técnica, impacto e plateia, e cada votante pesa diferente.
  - **Regra da plateia:** nível 5 contra nível 2 ou 3 sempre leva o voto da plateia (função `donoDaRoda`).
- **Dificuldade da IA:** em `planejarEntradaAdv`, `forca * .66 + nivel * .1 + formaAdv`. A sorte dos votos fica em `ruido`, e a "forma do dia" fica em `formaVoce` e `formaAdv`, dentro de `iniciarRound`.
- Antes de mudar esses números, rode `node ferramentas/simular-equilibrio.js` e compare as tabelas. Hoje, com um MC nível 2 jogando "bom", a chance é ~50% contra nível 4 e ~4% contra nível 5.

## Desempenho (pra não travar)

- Nada muda variável CSS no `<body>` a cada quadro. Isso obrigava o navegador a recalcular a página inteira e era o principal motivo do travamento.
- O que se mexe todo quadro (trilha de notas, anel do beat, barra de tempo) usa só `transform` e `opacity`. Os textos só são atualizados quando mudam.
- A trilha de notas e a plateia são desenhadas em **canvas** (`moverTrilha()` e `desenharPlateia()`). A plateia é pré-desenhada em 6 camadas, e cada quadro só copia essas imagens deslocadas.
- Os beats vêm prontos em MP3, então o celular não precisa montar o som na hora.
- **Modo leve automático:** se os quadros ficam lentos (média acima de 26 ms), o jogo liga `body.leve` e corta as animações de enfeite. Fica em `medirDesempenho()` no `batalha.js` e no fim do `batalha.css`.

## Publicar

1. Suba o conteúdo desta pasta num repositório do GitHub. A pasta `ferramentas/` e este arquivo podem ir junto sem problema.
2. Em Settings → Pages, escolha o branch `main` na raiz.
3. No Registro.br, aponte o DNS para o GitHub Pages: registros A `185.199.108.153`, `.109.153`, `.110.153` e `.111.153`, mais CNAME `www` → `SEU-USUARIO.github.io`.
4. Ative "Enforce HTTPS".

O passo a passo completo está no doc "Como publicar batalhademcs.com.br" (no Claude).

## Ideias que ficaram na mesa

- Atualizar a planilha `modo_carreira_estadual_sp_2026.xlsx`, que ainda tem os beats e níveis antigos.
- Mais loops de música (hoje são 4 bases e 4 variações de andamento).
- Placar/ranking salvo, modo 2 jogadores no mesmo celular.
