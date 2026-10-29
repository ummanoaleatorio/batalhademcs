/* ==========================================================================
   ESTADUAL SP 2026 — MODO CARREIRA (simulador de batalha)
   • Você escolhe um dos 16 MCs (ou sorteia). Os níveis são SECRETOS.
   • A chave do Estadual é sorteada: oitavas → quartas → semi → final.
     A meta é vencer as 4 batalhas. As outras batalhas são simuladas.
   • Cada batalha tem até 3 rounds e CADA ROUND É UM BEAT diferente, com
     andamento e ritmo de clique próprios (no tempo, dobrado, galope…).
   • Rounds 1 e 2: um MC rima ~45 s e o outro responde pelo mesmo tempo
     (no round 2 inverte). Round 3: bate-volta, entradas curtas alternadas.
     Ímpar ou par no round 1 e no round 3 (quem ganha escolhe começar ou responder).
   • Na sua vez você bate no ritmo das notas que deslizam na trilha. Acertos
     perfeitos soltam FATALITY e 4 compassos limpos soltam PUNCHLINE sozinhos.
   • Cada round é decidido por 3 votos: 2 jurados + 1 da plateia.
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   1. MCs — nome, foto e nível SECRETO (1 a 5). O nível nunca aparece no jogo;
      ajuste aqui se quiser.
   -------------------------------------------------------------------------- */
const MCS = [
  { nome: 'Nathy',      imagem: 'imagens/nathy.jpg',      nivel: 2 },
  { nome: 'Dehatt',     imagem: 'imagens/dehatt.jpg',     nivel: 4 },
  { nome: 'Hayato',     imagem: 'imagens/hayato.jpg',     nivel: 3 },
  { nome: 'Arielzinha', imagem: 'imagens/arielzinha.jpg', nivel: 2 },
  { nome: 'Dandara',    imagem: 'imagens/dandara.jpg',    nivel: 2 },
  { nome: 'Rxnnin',     imagem: 'imagens/rxnnin.jpg',     nivel: 2 },
  { nome: 'Big Mike',   imagem: 'imagens/big-mike.jpg',   nivel: 5 },
  { nome: 'Punka',      imagem: 'imagens/punka.jpg',      nivel: 3 },
  { nome: 'Stevan',     imagem: 'imagens/stevan.jpg',     nivel: 2 },
  { nome: 'Flowid',     imagem: 'imagens/flowid.jpg',     nivel: 3 },
  { nome: 'Cost',       imagem: 'imagens/cost.jpg',       nivel: 2 },
  { nome: 'Grafiteh',   imagem: 'imagens/grafiteh.jpg',   nivel: 4 },
  { nome: 'Lil Vi',     imagem: 'imagens/lil-vi.jpg',     nivel: 4 },
  { nome: 'Magrão',     imagem: 'imagens/magrao.jpg',     nivel: 4 },
  { nome: 'Jotapê',     imagem: 'imagens/jotape.jpg',     nivel: 5, sempreComeca: true },   // ganhou o ímpar ou par? sempre começa
  { nome: 'Levinsk',    imagem: 'imagens/levinsk.jpg',    nivel: 5 }
];

/* --------------------------------------------------------------------------
   2. Utilitários
   -------------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sorte = (a, b) => a + Math.random() * (b - a);
const escolher = (l) => l[Math.floor(Math.random() * l.length)];
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const embaralhar = (l) => { const c = [...l]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
const semente = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
const icone = (id, c = '') => `<svg class="${c}" aria-hidden="true"><use href="#${id}"/></svg>`;
const REDUZIR = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* atributos secretos (0–100), derivados do nível + um "jeito" próprio de cada MC */
MCS.forEach((mc, i) => {
  const base = [0, 52, 58, 64, 70, 75][mc.nivel];
  const jeito = (k) => Math.round(limitar(base + (semente(i * 7 + k) - .5) * 26, 25, 98));
  mc.attr = { punch: jeito(1), flow: jeito(2), rima: jeito(3), presenca: jeito(4) };
  mc.numero = String(i + 1).padStart(2, '0');
});

/* --------------------------------------------------------------------------
   3. Beats: cada estilo valoriza atributos diferentes (dica aparece no jogo)
   -------------------------------------------------------------------------- */
const P = {   // pesos dos atributos
  raiz:   { flow: .35, rima: .35, punch: .2, presenca: .1 },
  swing:  { flow: .5, rima: .3, punch: .1, presenca: .1 },
  porrada:{ punch: .45, presenca: .3, flow: .15, rima: .1 },
  peso:   { punch: .4, rima: .3, presenca: .2, flow: .1 },
  rapido: { flow: .45, punch: .25, rima: .2, presenca: .1 },
  enxame: { punch: .4, flow: .3, presenca: .2, rima: .1 },
  calma:  { rima: .45, presenca: .25, flow: .2, punch: .1 },
  palco:  { presenca: .45, punch: .25, rima: .2, flow: .1 }
};
/* ritmos de clique: onde caem os toques dentro de cada compasso (4 tempos) */
const PADROES = {
  tempo:       { nome: 'No tempo',    notas: [0, 1, 2, 3],                      dica: 'um toque em cada tempo' },
  meio:        { nome: 'Meio tempo',  notas: [0, 2],                            dica: 'toques espaçados, sem pressa' },
  dobrado:     { nome: 'Dobrado',     notas: [0, .5, 1, 1.5, 2, 2.5, 3, 3.5],   dica: 'dois toques por tempo, dedo rápido' },
  sincopado:   { nome: 'Sincopado',   notas: [0, 1, 1.5, 3],                    dica: 'um, dois-e, … quatro' },
  galope:      { nome: 'Galope',      notas: [0, .5, 1, 2, 2.5, 3],             dica: 'ta-ta-tá, ta-ta-tá' },
  contratempo: { nome: 'Contratempo', notas: [.5, 1.5, 2.5, 3.5],               dica: 'toca entre as batidas' },
  variado:     { nome: 'Variado',     notas: null,                              dica: 'o ritmo muda no meio do beat, fica de olho na trilha' }
};
/* som = qual loop do musica.js toca (o BPM vem dele) · padrao = ritmo do clique */
const BEATS = {
  goldenGhost:   { nome: 'Golden Era Ghost',  som: 'classico',  padrao: 'tempo',       peso: P.raiz,    dica: 'boom bap raiz: flow e rima' },
  smokySax:      { nome: 'Smoky Sax Cipher',  som: 'jazz',      padrao: 'sincopado',   peso: P.swing,   dica: 'swing de praça: quem tem flow manda' },
  basementBrute: { nome: 'Basement Bruiser',  som: 'sujo',      padrao: 'galope',      peso: P.porrada, dica: 'sujo e seco: punchline e presença' },
  concreteSermon:{ nome: 'Concrete Sermon',   som: 'pesado',    padrao: 'tempo',       peso: P.peso,    dica: 'lento e pesado: espaço pra punch' },
  bulletTrain:   { nome: 'Bullet Train Bars', som: 'rapido',    padrao: 'galope',      peso: P.rapido,  dica: 'rápido: flow afiado' },
  hornetSwarm:   { nome: 'Hornet Swarm',      som: 'turbo',     padrao: 'dobrado',     peso: P.enxame,  dica: 'o enxame vem rápido: dedo leve' },
  caffeineCrime: { nome: 'Caffeine Crime',    som: 'sujo',      padrao: 'dobrado',     peso: P.porrada, dica: 'três cafés e um beat sujo' },
  slowMoRiot:    { nome: 'Slow Motion Riot',  som: 'arrastado', padrao: 'galope',      peso: P.peso,    dica: 'câmera lenta, rima pesada' },
  midnightSyrup: { nome: 'Midnight Syrup',    som: 'lento',     padrao: 'sincopado',   peso: P.calma,   dica: 'meia-noite melada: rima bem pensada' },
  gravityWell:   { nome: 'Gravity Well',      som: 'pesado',    padrao: 'contratempo', peso: P.palco,   dica: 'tudo puxa pra baixo: presença segura a roda' },
  chaosCypher:   { nome: 'Chaos Cypher',      som: 'turbo',     padrao: 'meio',        peso: P.enxame,  dica: 'beat correndo, rima no meio tempo' },
  subwaySeance:  { nome: 'Subway Séance',     som: 'jazz',      padrao: 'contratempo', peso: P.palco,   dica: 'sessão espírita no metrô' },
  vinylVoodoo:   { nome: 'Vinyl Voodoo',      som: 'rapido',    padrao: 'tempo',       peso: P.calma,   dica: 'disco arranhado e feitiço: rima afiada' },
  /* beats DINÂMICOS: o ritmo do clique muda a cada `troca` compassos, seguindo `seq` */
  moodSwing:     { nome: 'Mood Swing Mafia',  som: 'classico',  padrao: 'variado', seq: ['tempo', 'galope', 'sincopado', 'dobrado'], troca: 2, peso: P.raiz,    dica: 'muda de humor a cada dois compassos' },
  plotTwist:     { nome: 'Plot Twist Parade', som: 'jazz',      padrao: 'variado', seq: ['sincopado', 'tempo', 'contratempo', 'galope'], troca: 2, peso: P.swing, dica: 'cada virada é uma surpresa' },
  gearbox:       { nome: 'Gearbox Gangsta',   som: 'turbo',     padrao: 'variado', seq: ['meio', 'tempo', 'dobrado', 'tempo'], troca: 2, peso: P.enxame,    dica: 'troca de marcha: lento, médio, rápido' },
  elevatorDrop:  { nome: 'Elevator Drop',     som: 'pesado',    padrao: 'variado', seq: ['tempo', 'galope', 'dobrado', 'meio'], troca: 2, peso: P.peso,      dica: 'sobe, sobe, sobe… e despenca' },
  shapeshifter:  { nome: 'Shapeshifter',      som: 'sujo',      padrao: 'variado', seq: ['galope', 'contratempo', 'tempo', 'dobrado', 'sincopado'], troca: 1, peso: P.porrada, dica: 'muda TODO compasso: só os brabos' }
};
const infoBeat = (id) => {
  const B = BEATS[id], E = (typeof Musica !== 'undefined' && Musica.ESTILOS?.[B.som]) || { bpm: 90 };
  return { id, nome: B.nome, bpm: E.bpm, dica: B.dica, padrao: B.padrao, som: B.som };
};
const forcaNoBeat = (mc, id) => Object.entries(BEATS[id].peso).reduce((s, [k, p]) => s + mc.attr[k] * p, 0);   // 0–100
/** 3 beats com ritmos de clique diferentes entre si; sempre 1 dinâmico (ritmo que muda) */
function sortearBeats() {
  const ids = embaralhar(Object.keys(BEATS));
  const lista = [ids.find((id) => BEATS[id].padrao === 'variado')], usados = new Set(['variado']);
  for (const id of ids) { if (!usados.has(BEATS[id].padrao)) { usados.add(BEATS[id].padrao); lista.push(id); } if (lista.length === 3) break; }
  return embaralhar(lista);
}
/** ritmo de clique do compasso c (contado desde o início da entrada) */
const padraoNoCompasso = (id, c) => { const B = BEATS[id]; return B.seq ? B.seq[Math.floor(c / B.troca) % B.seq.length] : B.padrao; };
const seloRitmo = (p) => `<span class="selo-ritmo selo-ritmo--${p}">${PADROES[p].nome}</span>`;

const FASES = ['Oitavas', 'Quartas', 'Semifinal', 'Final'];
const INTRO = 4;              // batidas antes da 1ª entrada (contagem 3, 2, 1)
const SEGUNDOS_ENTRADA = 45;  // rounds 1 e 2: cada MC rima ~45 s seguidos
const BATE_VOLTA = 16;        // round 3: entradas curtas alternadas (4 compassos)
const BATE_VOLTA_N = 4;       // quantas entradas no bate-volta
/* quem começa o round tem uma leve vantagem (dita o ritmo); quem responde fica com a última palavra.
   Diferença pequena de propósito: num round de ~150–250 pontos, 4 pontos não decidem sozinhos. */
const BONUS = { iniciativa: 6, ultimaPalavra: 2 };

/* --------------------------------------------------------------------------
   4. Estado
   -------------------------------------------------------------------------- */
const J = {
  voce: null,
  chave: [],            // chave[fase][jogo] = { a, b, vencedor, placar:[ra, rb] }
  fase: 0,
  bat: null,            // batalha em andamento
  rnd: null,            // round ao vivo
  som: true
};
try { const p = JSON.parse(localStorage.getItem('estadual-sp-prefs') || '{}'); if (typeof p.som === 'boolean') J.som = p.som; } catch (e) { /* ok */ }
const outro = (l) => (l === 'voce' ? 'adv' : 'voce');
const mcDe = (l) => MCS[l === 'voce' ? J.voce : J.bat.adv];

/* --------------------------------------------------------------------------
   5. Sons de efeito (plateia, vaia, buzina, clique) — Web Audio, sem arquivos
   -------------------------------------------------------------------------- */
const Som = (() => {
  let ctx = null, saida = null, ruido = null;
  function a() {
    if (!J.som) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); saida = ctx.createGain(); saida.gain.value = .5; saida.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function plateia(forca = 1, dur = 1.3) {
    const c = a(); if (!c) return;
    const t = c.currentTime, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = ruido; n.loop = true; f.type = 'bandpass'; f.frequency.value = 900 + forca * 500; f.Q.value = .5;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08 + .16 * forca, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(f).connect(g).connect(saida); n.start(t); n.stop(t + dur);
    if (forca > .75) {
      const o = c.createOscillator(), go = c.createGain(), lp = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(240, t + .5); o.frequency.linearRampToValueAtTime(170, t + 1.1);
      lp.type = 'lowpass'; lp.frequency.value = 700;
      go.gain.setValueAtTime(.0001, t); go.gain.exponentialRampToValueAtTime(.05 * forca, t + .15); go.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
      o.connect(lp).connect(go).connect(saida); o.start(t); o.stop(t + 1.25);
    }
  }
  function vaia() {
    const c = a(); if (!c) return;
    const t = c.currentTime, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = ruido; n.loop = true; f.type = 'lowpass'; f.frequency.value = 480;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + .9);
    n.connect(f).connect(g).connect(saida); n.start(t); n.stop(t + .9);
  }
  function buzina(grande = false) {
    const c = a(); if (!c) return;
    const t = c.currentTime;
    (grande ? [0, .16, .32, .5] : [0, .16, .34]).forEach((d, i, arr) => {
      const dur = i === arr.length - 1 ? .55 : .12, f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 2400;
      g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(.13, t + d + .02);
      g.gain.setValueAtTime(.13, t + d + dur - .05); g.gain.exponentialRampToValueAtTime(.0001, t + d + dur);
      f.connect(g).connect(saida);
      [466, 470, 700].forEach((hz) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(t + d); o.stop(t + d + dur); });
    });
    if (typeof Musica !== 'undefined') Musica.abaixar(2.5);
  }
  function clique(agudo = true) {
    const c = a(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = agudo ? 1500 : 500;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(agudo ? .07 : .05, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    o.connect(g).connect(saida); o.start(t); o.stop(t + .06);
  }
  /** FATALITY: a roda solta um "UH!" curto (forte = grito maior) */
  function fatality(forte = false) {
    const c = a(); if (!c) return;
    const t = c.currentTime, dur = forte ? .75 : .34;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = ruido; n.loop = true; n.playbackRate.value = .9 + Math.random() * .2;
    f.type = 'bandpass'; f.frequency.value = forte ? 1500 : 1150; f.Q.value = .7;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(forte ? .2 : .085, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(f).connect(g).connect(saida); n.start(t); n.stop(t + dur);
    // "UH" de várias vozes: serras graves passando por um formante
    const fo = c.createBiquadFilter(), go = c.createGain();
    fo.type = 'bandpass'; fo.frequency.value = 620; fo.Q.value = 2.5;
    go.gain.setValueAtTime(.0001, t); go.gain.exponentialRampToValueAtTime(forte ? .1 : .045, t + .04); go.gain.exponentialRampToValueAtTime(.0001, t + dur * .9);
    fo.connect(go).connect(saida);
    [138, 152, 171, 205].forEach((hz) => {
      const o = c.createOscillator(); o.type = 'sawtooth';
      const h = hz * (.97 + Math.random() * .06);
      o.frequency.setValueAtTime(h * 1.12, t); o.frequency.exponentialRampToValueAtTime(h * .86, t + dur);
      o.connect(fo); o.start(t); o.stop(t + dur);
    });
  }
  return { plateia, vaia, buzina, clique, fatality };
})();

/* --------------------------------------------------------------------------
   6. Chave e simulação das outras batalhas
   -------------------------------------------------------------------------- */
function novaChave() {
  const ordem = embaralhar(MCS.map((_, i) => i));
  J.chave = [
    Array.from({ length: 8 }, (_, m) => ({ a: ordem[m * 2], b: ordem[m * 2 + 1], vencedor: null, placar: null })),
    Array.from({ length: 4 }, () => ({ a: null, b: null, vencedor: null, placar: null })),
    Array.from({ length: 2 }, () => ({ a: null, b: null, vencedor: null, placar: null })),
    [{ a: null, b: null, vencedor: null, placar: null }]
  ];
  J.fase = 0;
}

/** nível 5 contra nível 2 ou 3: a plateia já é dele. Devolve o índice do dono da roda (ou null) */
function donoDaRoda(a, b) {
  const na = MCS[a].nivel, nb = MCS[b].nivel;
  if (na === 5 && (nb === 2 || nb === 3)) return a;
  if (nb === 5 && (na === 2 || na === 3)) return b;
  return null;
}

/** batalha entre dois MCs controlados pelo computador (rounds em beats sorteados, 2 jurados + plateia) */
function simularBatalha(a, b) {
  const beats = sortearBeats();
  const placar = [0, 0];
  for (let r = 0; placar[0] < 2 && placar[1] < 2; r++) {
    const fa = forcaNoBeat(MCS[a], beats[r]) + MCS[a].nivel * 4, fb = forcaNoBeat(MCS[b], beats[r]) + MCS[b].nivel * 4;
    const pA = 1 / (1 + Math.exp(-(fa - fb) / 9)), dono = donoDaRoda(a, b);
    const votosA = (Math.random() < pA) + (Math.random() < pA) + (dono === null ? Math.random() < pA : dono === a);
    placar[votosA >= 2 ? 0 : 1]++;
  }
  return { vencedor: placar[0] > placar[1] ? a : b, placar };
}

function avancar(fase, m) {
  const jogo = J.chave[fase][m];
  if (fase >= 3) return;
  const prox = J.chave[fase + 1][Math.floor(m / 2)];
  prox[m % 2 === 0 ? 'a' : 'b'] = jogo.vencedor;
}

function simularResto(fase) {
  J.chave[fase].forEach((jogo, m) => {
    if (jogo.vencedor !== null || jogo.a === null || jogo.b === null) return;
    const r = simularBatalha(jogo.a, jogo.b);
    jogo.vencedor = r.vencedor; jogo.placar = r.placar;
    avancar(fase, m);
  });
}

/* ---------- a chave anda batalha por batalha ---------- */
const numBatalha = (f, m) => String([0, 8, 12, 14][f] + m + 1).padStart(2, '0');
const ehMinha = (j) => j.a === J.voce || j.b === J.voce;
/** próxima batalha a acontecer, na ordem da chave (fase, depois número) */
function proximaBatalha() {
  for (let f = 0; f < 4; f++) for (let m = 0; m < J.chave[f].length; m++) {
    const j = J.chave[f][m];
    if (j.vencedor === null && j.a !== null && j.b !== null) return { f, m, jogo: j };
  }
  return null;
}
const nadaDecidido = () => J.chave[0].every((j) => j.vencedor === null);
function statusChave(html) { const el = $('#chave-status'); if (el) el.innerHTML = html; }
function pintarChave(op = {}) { $('#chave-vis').innerHTML = htmlChave({ destaqueFase: J.fase, ...op }); }

/** botões e textos da tela da chave conforme o momento */
function cabecalhoChave() {
  const p = proximaBatalha(), rodando = J.rodandoChave, btn = $('#btn-comecar');
  $('#btn-pular-chave').hidden = !rodando;
  $('#btn-resortear').hidden = $('#btn-trocar').hidden = rodando || !nadaDecidido();
  btn.hidden = rodando;
  if (rodando) return;
  if (!p) {   // campeonato acabou
    const camp = J.chave[3][0].vencedor;
    btn.textContent = `Nova carreira com ${MCS[J.voce].nome}`;
    $('#btn-trocar').hidden = false;
    statusChave(camp === null ? '' : camp === J.voce ? '<b>Você é o campeão do Estadual!</b>' : `Campeão do Estadual: <b>${esc(MCS[camp].nome)}</b>`);
    return;
  }
  const adv = MCS[p.jogo.a === J.voce ? p.jogo.b : p.jogo.a];
  if (ehMinha(p.jogo)) {
    btn.textContent = `Sua vez · ${FASES[p.f]}: contra ${adv.nome}`;
    if (!nadaDecidido()) statusChave(`Chegou a sua vez: <b>batalha ${numBatalha(p.f, p.m)}</b>.`);
    else statusChave('');
  } else {
    btn.textContent = nadaDecidido() ? 'Começar o Estadual' : 'Continuar as batalhas';
    statusChave(nadaDecidido() ? `Sua batalha é a <b>${numBatalha(...posMinha())}</b>. Antes dela, rolam as outras.` : '');
  }
}
function posMinha() {
  for (let f = 0; f < 4; f++) { const m = J.chave[f].findIndex((j) => ehMinha(j) && j.vencedor === null); if (m >= 0) return [f, m]; }
  return [0, 0];
}

/** roda as batalhas dos outros MCs, mostrando o placar de cada uma, até chegar a sua (ou até o campeão) */
async function rodarChave() {
  if (J.rodandoChave) return;
  const ger = J.geracao;
  J.rodandoChave = true; J.pular = false;
  mostrar('tela-chave');
  cabecalhoChave();
  pintarChave();
  await esperar(REDUZIR ? 0 : 350);
  for (;;) {
    if (J.geracao !== ger) return;
    const p = proximaBatalha();
    if (!p || ehMinha(p.jogo)) { if (p) J.fase = p.f; break; }
    J.fase = p.f;
    const A = MCS[p.jogo.a], Bm = MCS[p.jogo.b];
    pintarChave({ rolando: p });
    statusChave(`${FASES[p.f]} · batalha ${numBatalha(p.f, p.m)}: <b>${esc(A.nome)}</b> × <b>${esc(Bm.nome)}</b> <i class="ao-vivo-txt">rolando…</i>`);
    $('.cv-jogo--rolando')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: REDUZIR ? 'auto' : 'smooth' });
    await esperar(J.pular || REDUZIR ? 0 : 900);
    if (J.geracao !== ger) return;
    const r = simularBatalha(p.jogo.a, p.jogo.b);
    p.jogo.vencedor = r.vencedor; p.jogo.placar = r.placar; avancar(p.f, p.m);
    const V = MCS[r.vencedor];
    pintarChave({ revelado: p });
    statusChave(`${FASES[p.f]} · batalha ${numBatalha(p.f, p.m)}: ${esc(A.nome)} <b>${r.placar[0]} × ${r.placar[1]}</b> ${esc(Bm.nome)} · <b>${esc(V.nome)}</b> passou`);
    if (!J.pular) { Som.clique(false); Som.plateia(.35, .7); }
    await esperar(J.pular || REDUZIR ? 0 : 700);
  }
  J.rodandoChave = false;
  pintarChave();
  cabecalhoChave();
  const camp = J.chave[3][0].vencedor;
  if (camp !== null && !proximaBatalha()) { Som.buzina(true); setTimeout(() => sprayEm($('.cv-camp'), 60), 200); }
  else if (proximaBatalha()) { Som.buzina(false); $('#btn-comecar').focus({ preventScroll: true }); $$('.cv-jogo--meu').filter((el) => !el.querySelector('.cv-chip--venceu, .cv-chip--caiu')).forEach((el) => el.classList.add('cv-jogo--sua-vez')); }
}

/** botão principal da tela da chave */
function acaoChave() {
  if (J.rodandoChave) return;
  const p = proximaBatalha();
  if (!p) { escolherMC(J.voce); return; }
  if (ehMinha(p.jogo)) { J.fase = p.f; telaPre(); return; }
  rodarChave();
}

const meuJogo = () => {
  const m = J.chave[J.fase].findIndex((j) => j.a === J.voce || j.b === J.voce);
  return m < 0 ? null : { m, jogo: J.chave[J.fase][m] };
};

/* --------------------------------------------------------------------------
   7. Desenho da chave (colunas: oitavas → final)
   -------------------------------------------------------------------------- */
function htmlChave({ destaqueFase = -1, rolando = null, revelado = null } = {}) {
  const igual = (x, f, m) => x && x.f === f && x.m === m;
  const chip = (i, jogo) => {
    if (i === null) return '<span class="cv-chip cv-chip--vazio"><i>?</i></span>';
    const mc = MCS[i];
    const cls = ['cv-chip'];
    if (i === J.voce) cls.push('cv-chip--voce');
    if (jogo.vencedor !== null) cls.push(jogo.vencedor === i ? 'cv-chip--venceu' : 'cv-chip--caiu');
    const lado = jogo.a === i ? 0 : 1;
    return `<span class="${cls.join(' ')}"><img src="${esc(mc.imagem)}" alt=""><b>${esc(mc.nome)}</b>${jogo.placar ? `<em>${jogo.placar[lado]}</em>` : ''}</span>`;
  };
  const cols = J.chave.map((jogos, f) => `
    <div class="cv-col${f === destaqueFase ? ' cv-col--atual' : ''}">
      <span class="cv-cab">${FASES[f]}</span>
      <div class="cv-jogos">${jogos.map((j, m) => `<div class="cv-jogo${j.a === J.voce || j.b === J.voce ? ' cv-jogo--meu' : ''}${igual(rolando, f, m) ? ' cv-jogo--rolando' : ''}${igual(revelado, f, m) ? ' cv-jogo--revelado' : ''}">${chip(j.a, j)}${chip(j.b, j)}</div>`).join('')}</div>
    </div>`).join('');
  const final = J.chave[3][0];
  const camp = final.vencedor !== null ? MCS[final.vencedor] : null;
  return `<div class="cv">${cols}
    <div class="cv-col cv-col--camp"><span class="cv-cab">Campeão</span>
      <div class="cv-jogos"><div class="cv-camp${camp && final.vencedor === J.voce ? ' cv-camp--voce' : ''}">${icone('i-trofeu', 'cv-trofeu')}${camp ? `<img src="${esc(camp.imagem)}" alt=""><b>${esc(camp.nome)}</b>` : '<b>?</b>'}</div></div>
    </div></div>`;
}

/* --------------------------------------------------------------------------
   8. Telas: escolha, chave, pré-batalha
   -------------------------------------------------------------------------- */
function mostrar(id) {
  ['tela-mc', 'tela-chave', 'tela-pre', 'tela-arena', 'tela-pos'].forEach((t) => { $('#' + t).hidden = t !== id; });
  document.body.dataset.fase = id;
  ligarPlateia();
  window.scrollTo({ top: 0, behavior: REDUZIR ? 'auto' : 'smooth' });
}

function montarEscolha() {
  $('#grade-mc').innerHTML = MCS.map((mc, i) => `
    <button class="card-mc" type="button" role="listitem" data-i="${i}" style="--r:${((semente(i + 3) - .5) * 5).toFixed(1)}deg; --i:${i}" aria-label="Jogar com ${esc(mc.nome)}">
      <span class="card-mc__foto"><img src="${esc(mc.imagem)}" alt="" loading="lazy"></span>
      <span class="card-mc__num">#${mc.numero}</span>
      <span class="card-mc__nome">${esc(mc.nome)}</span>
    </button>`).join('');
}

/** animação: o MC escolhido/sorteado entra na tela antes da chave */
function apresentar(i, sorteado) {
  return new Promise((ok) => {
    const mc = MCS[i], el = document.createElement('div');
    el.className = 'apresenta';
    el.innerHTML = `<div class="apresenta__card"><img src="${esc(mc.imagem)}" alt=""><b>${esc(mc.nome)}</b><small>#${mc.numero}</small><span class="apresenta__selo">${sorteado ? 'SORTEADO!' : 'ESCOLHIDO!'}</span></div>
      <p class="apresenta__txt">${sorteado ? 'O destino te jogou na roda' : 'É você na roda'}</p>`;
    document.body.append(el);
    Som.buzina(false); setTimeout(() => Som.plateia(.8, 1.4), 300);
    setTimeout(() => sprayEm(el.querySelector('.apresenta__card'), 60), 450);
    let feito = false;
    const fim = () => { if (feito) return; feito = true; el.remove(); ok(); };
    el.addEventListener('click', fim);
    setTimeout(fim, REDUZIR ? 600 : 2100);
  });
}

function escolherMC(i, sorteado = false) {
  J.voce = i;
  J.geracao = (J.geracao || 0) + 1; J.rodandoChave = false;
  novaChave();
  mostrar('tela-chave');
  $('#chave-titulo-mc').textContent = MCS[i].nome;
  $('#chave-vis').innerHTML = htmlChave({ destaqueFase: 0 });
  cabecalhoChave();
  if (!REDUZIR) {   // "sorteio" da chave: os confrontos entram um a um
    $$('#chave-vis .cv-col:first-child .cv-jogo').forEach((el, k) => { el.style.animationDelay = k * 70 + 'ms'; el.classList.add('cv-entrar'); });
  }
}

function telaPre() {
  const meu = meuJogo();
  const adv = meu.jogo.a === J.voce ? meu.jogo.b : meu.jogo.a;
  const beats = sortearBeats();
  J.bat = {
    adv, beats, round: 1, placar: { voce: 0, adv: 0 }, iniciante: { 1: null, 2: null, 3: null }, rounds: [],
    stats: { batidas: 0, perfeitos: 0, bons: 0, erros: 0, maiorCombo: 0, punchOk: 0, punchTotal: 0, encaradasOk: 0, plateias: 0, fatal: 0 }
  };
  if (typeof Musica !== 'undefined') beats.reduce((fila, b) => fila.then(() => Musica.preparar(BEATS[b].som)).catch(() => null), Promise.resolve());   // prepara os 3 beats, um de cada vez
  const v = MCS[J.voce], a = MCS[adv];
  const numBatalha = [0, 8, 12, 14][J.fase] + meu.m + 1;
  $('#tela-pre').innerHTML = `
    <p class="pre__fase">${FASES[J.fase]} · batalha ${String(numBatalha).padStart(2, '0')}</p>
    <div class="pre__duelo">
      <figure class="pre__mc"><span class="pre__foto"><img src="${esc(v.imagem)}" alt=""></span><figcaption>${esc(v.nome)}<small>você</small></figcaption></figure>
      <span class="pre__vs">VS</span>
      <figure class="pre__mc"><span class="pre__foto"><img src="${esc(a.imagem)}" alt=""></span><figcaption>${esc(a.nome)}<small>adversário</small></figcaption></figure>
    </div>
    <div class="pre__info">
      <div class="pre__beats">
        <h2>Os beats da batalha</h2>
        <ol>${beats.map((b, k) => { const I = infoBeat(b); return `<li><span class="pre__r">R${k + 1}</span><span><b>${esc(I.nome)}</b> <em>${I.bpm} BPM</em> ${seloRitmo(I.padrao)}<small>${esc(I.dica)} · ${esc(PADROES[I.padrao].dica)}</small></span></li>`; }).join('')}</ol>
        <p class="pre__nota">R1: um rima ${SEGUNDOS_ENTRADA} s e o outro responde. R2: inverte. R3 (só se der 1 a 1): bate-volta.</p>
      </div>
      <div class="pre__como">
        <h2>Como rimar</h2>
        <ul>
          <li><b>Na sua vez</b>, as notas deslizam na trilha: <b>clica no seu MC</b> quando cada uma chegar na <b>linha vermelha</b>. Clicar à toa quebra o combo.</li>
          <li>Cada beat tem um <b>ritmo de clique</b>: no tempo, meio tempo, dobrado, galope, sincopado ou contratempo.</li>
          <li>Acerto perfeito é <b>FATALITY</b>. Emendou 4 compassos sem errar? A <b>punchline</b> sai sozinha.</li>
          <li><b>Chamar a plateia</b>: 1 por round. Seus lances seguintes valem mais.</li>
          <li><b>Encarar</b>: 1 por round, na entrada do adversário. Se der certo, ele trava.</li>
          <li><b>Quem decide</b>: 2 jurados (um olha técnica, outro punchline) e 1 voto da plateia.</li>
        </ul>
      </div>
    </div>
    <button class="btn-tinta btn-tinta--xl" type="button" id="btn-ir">Bora pra roda</button>`;
  mostrar('tela-pre');
  $('#btn-ir').addEventListener('click', () => { mostrar('tela-arena'); antesDoRound(); });
}

/* --------------------------------------------------------------------------
   9. Placar e palco
   -------------------------------------------------------------------------- */
function renderPlacar() {
  const B = J.bat, R = J.rnd;
  const lado = (l) => {
    const mc = mcDe(l), noMic = R && R.noMic === l;
    return `<div class="pl-mc pl-mc--${l}${noMic ? ' no-mic' : ''}">
        <img src="${esc(mc.imagem)}" alt="">
        <span class="pl-mc__info"><small>${l === 'voce' ? 'você' : 'adversário'}</small><b>${esc(mc.nome)}</b>
          <span class="pl-rounds" aria-label="${B.placar[l]} rounds">${[0, 1].map((k) => `<i class="${B.placar[l] > k ? 'on' : ''}"></i>`).join('')}</span></span>
      </div>`;
  };
  const beat = infoBeat(B.beats[B.round - 1]);
  const pv = R ? R.pontos.voce : 0, pa = R ? R.pontos.adv : 0;
  $('#placar').innerHTML = `
    ${lado('voce')}
    <div class="pl-meio">
      <span class="pl-round">${FASES[J.fase]} · Round ${B.round}</span>
      <span class="pl-pontos"><b id="pts-voce">${pv}</b><i>×</i><b id="pts-adv">${pa}</b></span>
      <span class="pl-beat">${esc(beat.nome)} · ${beat.bpm} BPM · ${PADROES[beat.padrao].nome}</span>
    </div>
    ${lado('adv')}
    <div class="pl-dominio" aria-label="domínio da roda"><i id="dominio" style="transform:scaleX(.5)"></i><span>domínio da roda</span></div>
    <div class="pl-tempo"><i id="progresso" style="transform:scaleX(0)"></i></div>`;
}

function atualizarPontos() {
  const R = J.rnd; if (!R) return;
  [['#pts-voce', R.pontos.voce], ['#pts-adv', R.pontos.adv]].forEach(([id, v]) => {
    const el = $(id); if (!el || el.textContent === String(v)) return;
    el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  });
  const alvo = limitar(50 + (R.pontos.voce - R.pontos.adv) * 1.4 + R.embalo * 8, 4, 96);
  $('#dominio').style.transform = `scaleX(${(alvo / 100).toFixed(3)})`;
}

const palco = (html) => { $('#palco').innerHTML = html; };

/* --------------------------------------------------------------------------
   10. Antes de cada round: ímpar ou par (R1 e R3) ou inversão (R2)
   -------------------------------------------------------------------------- */
function antesDoRound() {
  J.rnd = null;
  renderPlacar();
  $('#lances').innerHTML = `<li class="lance lance--info"><span class="lance__t">—</span><i class="lance__dj"></i><p>${J.bat.round === 1 ? 'A roda tá formada. Vai começar!' : `Round ${J.bat.round}.`}</p></li>`;
  if (J.bat.round === 2) {
    J.bat.iniciante[2] = outro(J.bat.iniciante[1]);
    palco(`<div class="pal-aviso"><h2 class="titulo-pincel"><span class="pincel-preto">Round</span> <span class="pincel-vermelho">2</span></h2>
      <p>Inverte: ${J.bat.iniciante[2] === 'voce' ? '<b>você começa</b>' : `<b>${esc(mcDe('adv').nome)} começa</b>`}.</p>
      <p class="pal-beat">${beatHtml()}</p>
      <button class="btn-tinta btn-tinta--xl" type="button" id="btn-round">Solta o beat</button></div>`);
    $('#btn-round').addEventListener('click', iniciarRound, { once: true });
  } else imparOuPar();
}
const beatHtml = () => { const I = infoBeat(J.bat.beats[J.bat.round - 1]); return `Beat: <b>${esc(I.nome)}</b> · ${I.bpm} BPM ${seloRitmo(I.padrao)}<br><em>${esc(PADROES[I.padrao].dica)} · ${J.bat.round < 3 ? 'cada MC rima ' + SEGUNDOS_ENTRADA + ' s' : 'bate-volta'}</em>`; };

function imparOuPar() {
  let escolha = null;
  palco(`<div class="pal-ip">
    <h2 class="titulo-pincel"><span class="pincel-preto">Ímpar</span> <span class="pincel-vermelho">ou par?</span></h2>
    <p>${J.bat.round === 1 ? 'Quem ganhar escolhe se começa ou responde.' : 'Deu 1 a 1! Ímpar ou par pro round decisivo.'}</p>
    <p class="pal-beat">${beatHtml()}</p>
    <div class="ip-escolha">${['impar', 'par'].map((x) => `<button class="ip-btn" type="button" data-ip="${x}">${x === 'impar' ? 'Ímpar' : 'Par'}</button>`).join('')}</div>
    <div class="ip-dedos" hidden><p>Quantos dedos?</p><div class="dedos">${[0, 1, 2, 3, 4, 5].map((n) => `<button class="dedo" type="button" data-n="${n}">${n}</button>`).join('')}</div></div>
  </div>`);
  $$('.ip-btn').forEach((b) => b.addEventListener('click', () => {
    escolha = b.dataset.ip; $$('.ip-btn').forEach((x) => x.classList.toggle('sel', x === b));
    $('.ip-dedos').hidden = false; Som.clique();
  }));
  $$('.dedo').forEach((b) => b.addEventListener('click', () => { if (escolha) revelar(escolha, Number(b.dataset.n)); }));
}

async function revelar(escolha, meu) {
  const dele = Math.floor(Math.random() * 6), soma = meu + dele, deu = soma % 2 ? 'impar' : 'par', ganhou = deu === escolha;
  const nomeAdv = esc(mcDe('adv').nome);
  palco(`<div class="pal-ip">
    <h2 class="titulo-pincel"><span class="pincel-preto">Um, dois,</span> <span class="pincel-vermelho">já!</span></h2>
    <div class="maos">
      <div class="mao"><span>você</span>${icone('i-mao', 'mao__ic')}<b>${meu}</b></div>
      <div class="mao__soma"><b>${soma}</b><em>${deu === 'impar' ? 'ímpar' : 'par'}</em></div>
      <div class="mao mao--adv"><span>${nomeAdv}</span>${icone('i-mao', 'mao__ic')}<b>${dele}</b></div>
    </div>
    <p class="pal-res ${ganhou ? 'bom' : ''}">${ganhou ? 'Você ganhou!' : `${nomeAdv} ganhou.`}</p>
    <div class="pal-acoes" id="decisao"></div></div>`);
  Som.clique(false);
  await esperar(REDUZIR ? 0 : 800);
  if (ganhou) {
    $('#decisao').innerHTML = `<button class="btn-tinta" type="button" data-d="voce">Começar</button><button class="btn-tinta btn-tinta--papel" type="button" data-d="adv">Responder</button>
      <p class="dica">Quem começa dita o ritmo: <b>+6 de iniciativa</b>. Quem responde fica com a <b>última palavra (+2)</b>.</p>`;
    $$('#decisao [data-d]').forEach((b) => b.addEventListener('click', () => { J.bat.iniciante[J.bat.round] = b.dataset.d; iniciarRound(); }, { once: true }));
  } else {
    const comeca = MCS[J.bat.adv].sempreComeca || Math.random() < .7;   // começar tem uma leve vantagem
    J.bat.iniciante[J.bat.round] = comeca ? 'adv' : 'voce';
    $('#decisao').innerHTML = `<p>${nomeAdv} escolheu <b>${comeca ? 'começar' : 'responder'}</b>${MCS[J.bat.adv].sempreComeca ? ' (como sempre: ele nunca abre mão de começar)' : ''}.</p><button class="btn-tinta" type="button" id="btn-round">Solta o beat</button>`;
    $('#btn-round').addEventListener('click', iniciarRound, { once: true });
  }
}

/* --------------------------------------------------------------------------
   11. ROUND AO VIVO
   -------------------------------------------------------------------------- */
/** monta as entradas do round: R1/R2 = um rima ~45 s e o outro responde; R3 = bate-volta */
function montarEntradas(round, quemComeca, bpm) {
  const a = quemComeca, b = outro(a);
  if (round < 3) {
    const dur = Math.max(32, Math.round((SEGUNDOS_ENTRADA * bpm / 60) / 4) * 4);
    return [{ quem: a, ini: INTRO, dur }, { quem: b, ini: INTRO + dur, dur }];
  }
  return Array.from({ length: BATE_VOLTA_N }, (_, k) => ({ quem: k % 2 ? b : a, ini: INTRO + k * BATE_VOLTA, dur: BATE_VOLTA }));
}

async function iniciarRound() {
  const B = J.bat, beatId = B.beats[B.round - 1], I = infoBeat(beatId);
  const novoCat = () => ({ tec: 0, imp: 0, pla: 0 });
  const entradas = montarEntradas(B.round, B.iniciante[B.round], I.bpm);
  J.rnd = {
    beatId, som: I.som, padrao: I.padrao, bpm: I.bpm, msBatida: 60000 / I.bpm,
    inicio: performance.now() + 400, offset: 0, rodando: true, pausado: false,
    entradas, fim: entradas.at(-1).ini + entradas.at(-1).dur,
    entrada: -1, entradaFechada: -1, noMic: null,
    pontos: { voce: 0, adv: 0 }, embalo: 0,
    cat: { voce: novoCat(), adv: novoCat() },   // técnica / impacto / plateia (os votos pesam diferente)
    hype: { voce: false, adv: false }, plateiaUsada: false, encararUsada: false, encarada: false,
    notas: [], comps: [], mudancas: [], prox: 0, combo: 0, seqComp: 0, seqPerf: 0, acertos: 0, semToque: 0, ultimoFat: 0, txtPad: '',
    eventosAdv: [], avisou: -1,
    formaVoce: 1 + sorte(-.22, .22), formaAdv: sorte(-.25, .25)   // forma do dia (os dois lados)
  };
  renderPlacar();
  document.body.style.setProperty('--batida', Math.round(60000 / I.bpm) + 'ms');
  $('#lances').innerHTML = '';
  const formato = B.round < 3 ? `cada MC rima <b>${Math.round(entradas[0].dur * 60 / I.bpm)} s</b>` : '<b>bate-volta</b>';
  lance(null, 'info', `O DJ soltou o <b>${esc(I.nome)}</b> (${I.bpm} BPM, ${PADROES[I.padrao].nome.toLowerCase()}) · ${formato}.`);
  palco(`<div class="pal-intro"><p id="intro-txt">prepara…</p><b id="contagem">3</b></div>`);
  sincronizarBeat(J.rnd);
  requestAnimationFrame(quadro);
}

/** liga o beat do round SEM travar o jogo: o relógio espera o beat no máximo ~2,5 s.
    Se o beat chegar depois (PC lento renderizando o som), só realinha se ainda estiver na contagem. */
function sincronizarBeat(R, sempre = false) {
  if (typeof Musica === 'undefined') return;
  R.esperandoBeat = true; R.esperaDesde = performance.now();
  const ligar = async () => {
    let t = await Musica.trocarEstilo(R.som);
    if ((t === null || t === undefined) && Musica.ligado && !Musica.tocando) t = await Musica.tocar();
    return t;
  };
  ligar().catch(() => null).then((t) => {
    if (J.rnd !== R) return;
    const aindaNaContagem = R.esperandoBeat || (!sempre && batidaAtual() < INTRO - 1);
    if (t && aindaNaContagem) { R.inicio = t; R.offset = R.offsetBase || 0; }
    R.esperandoBeat = false;
  });
}

const batidaAtual = () => (performance.now() - J.rnd.inicio) / J.rnd.msBatida + J.rnd.offset;
const tempoTxt = (b) => { const s = Math.max(0, Math.floor((b * J.rnd.msBatida) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const entradaEm = (b) => J.rnd.entradas.findIndex((e) => b >= e.ini && b < e.ini + e.dur);

function quadro() {
  const R = J.rnd;
  if (!R || !R.rodando) return;
  if (R.pausado) { requestAnimationFrame(quadro); return; }
  if (R.esperandoBeat) {
    const espera = performance.now() - R.esperaDesde;
    if (espera < 2500) {
      R.inicio = performance.now() + 120;   // segura o relógio
      if (espera > 700) { const t = document.getElementById('intro-txt'); if (t && t.textContent !== 'carregando o beat…') t.textContent = 'carregando o beat…'; }
      requestAnimationFrame(quadro); return;
    }
    R.esperandoBeat = false;   // demorou demais: segue sem esperar o som
    const t = document.getElementById('intro-txt'); if (t) t.textContent = 'prepara…';
  }
  const b = batidaAtual();
  medirDesempenho();
  // barra de tempo: só mexe quando andou um pouco (e via transform, sem refazer layout)
  const prog = Math.round(limitar(b / R.fim, 0, 1) * 400) / 400;
  if (prog !== R.ultProg) { R.ultProg = prog; const pg = document.getElementById('progresso'); if (pg) pg.style.transform = `scaleX(${prog})`; }

  if (b < INTRO) {
    const n = limitar(INTRO - Math.floor(Math.max(0, b)), 1, 3);
    const c = $('#contagem'); if (c && c.textContent !== String(n)) { c.textContent = n; c.classList.remove('pulo'); void c.offsetWidth; c.classList.add('pulo'); Som.clique(n === 1); }
  } else if (b >= R.fim) { encerrarEntrada(); fimDoRound(); return; }
  else {
    const e = entradaEm(b);
    if (e !== R.entrada && e >= 0) { encerrarEntrada(); comecarEntrada(e); }
    const E = R.entradas[R.entrada];
    const anel = document.getElementById('anel');
    if (anel) { const f = b - Math.floor(b); anel.style.transform = `scale(${(1 + .68 * (1 - f)).toFixed(3)})`; anel.style.opacity = (.15 + f * .85).toFixed(2); }
    const falta = E.ini + E.dur - b;
    const seg = Math.max(0, Math.ceil(falta * R.msBatida / 1000));
    if (seg !== R.ultSeg) { R.ultSeg = seg; const restam = document.getElementById('restam'); if (restam) restam.textContent = seg + ' s'; }
    if (R.noMic === 'adv') {
      dispararEventosAdv(b);
      // aviso de que a sua vez está chegando
      const prox = R.entradas[R.entrada + 1];
      if (prox && prox.quem === 'voce' && falta <= 4) {
        const n = Math.ceil(falta);
        if (R.avisou !== n) { R.avisou = n; const av = $('#aviso-vez'); if (av) { av.hidden = false; av.innerHTML = `prepara! <b>sua vez em ${n}</b>`; } }
      }
    } else { verificarNotasPerdidas(b); moverTrilha(b); avisoRitmo(b); }
  }
  requestAnimationFrame(quadro);
}

/* ---------- entradas ---------- */
function anunciarVez(voce, nome) {
  const el = document.createElement('div');
  el.className = 'vez-banner' + (voce ? ' vez-banner--voce' : '');
  el.innerHTML = voce ? '<b>SUA VEZ!</b><small>clica no seu MC no ritmo</small>' : `<b>VEZ DE ${esc(nome).toUpperCase()}</b><small>segura a onda</small>`;
  $('#palco').append(el);
  setTimeout(() => el.remove(), REDUZIR ? 900 : 1500);
}

function comecarEntrada(e) {
  const R = J.rnd, E = R.entradas[e];
  R.entrada = e;
  R.noMic = E.quem;
  document.body.classList.toggle('vez-voce', E.quem === 'voce');
  renderPlacar(); atualizarPontos();
  const mc = mcDe(R.noMic), voce = R.noMic === 'voce';
  const minhas = R.entradas.filter((x) => x.quem === E.quem), n = minhas.indexOf(E) + 1;
  const qual = minhas.length > 1 ? `entrada ${n} de ${minhas.length}` : (e === 0 ? 'abre o round' : 'responde');
  const seg = Math.round(E.dur * R.msBatida / 1000) + ' s';
  if (voce) {
    // notas da entrada (posição em batidas, a partir do início do round)
    R.notas = []; R.comps = []; R.mudancas = [];
    let anterior = null;
    for (let c = 0; c * 4 < E.dur; c++) {
      const pd = padraoNoCompasso(R.beatId, c), notas = PADROES[pd].notas;
      if (pd !== anterior) { R.mudancas.push({ t: E.ini + c * 4, pd, primeira: anterior === null }); anterior = pd; }
      R.comps.push({ resta: notas.length, limpo: true, perfeito: true });
      notas.forEach((x) => R.notas.push({ t: E.ini + c * 4 + x, comp: c, feita: false }));
    }
    Object.assign(R, { prox: 0, combo: 0, seqComp: 0, seqPerf: 0, acertos: 0, semToque: 0, txtPad: '', pb: 0, ultSeg: -1 });
    palco(`<div class="pal-mic pal-mic--voce">
      <p class="pal-mic__quem"><b>SUA VEZ</b> · ${qual} · ${seloRitmo(R.padrao)} · faltam <span id="restam">${seg}</span></p>
      <div class="pista" aria-hidden="true"><canvas id="pista-cv"></canvas></div>
      <div class="pad-area">
        <span class="feedback" id="feedback"></span>
        <button class="pad pad--danca" id="pad" type="button" aria-label="Clique no seu MC no ritmo">
          <span class="pad__anel" id="anel"></span>
          <img src="${esc(mc.imagem)}" alt="">
          <span class="pad__txt" id="pad-txt">clica no ritmo!</span>
        </button>
        <span class="combo" id="combo">combo <b>0</b></span>
      </div>
      <div class="jogadas">
        <button class="jogada" id="btn-plateia" type="button" ${R.plateiaUsada ? 'disabled' : ''}><b>Chamar a plateia</b><small>${R.plateiaUsada ? 'já usou' : '1 por round'}</small></button>
      </div>
      <p class="dica dica--clique"><b>Clica no seu MC</b> quando a nota chegar na linha vermelha. Compassos limpos soltam <b>punchline</b> e <b>fatality</b>.</p>
      <p class="dica dica--teclas">também dá pra usar <kbd>espaço</kbd> · <kbd>C</kbd> plateia</p>
    </div>`);
    const p = $('#pad');
    p.addEventListener('pointerdown', (ev) => { ev.preventDefault(); bater(); });
    p.addEventListener('contextmenu', (ev) => ev.preventDefault());
    $('#btn-plateia').addEventListener('click', chamarPlateia);
    lance(null, 'info', `<b>${esc(mc.nome)}</b> (você) pega o mic.`);
    if (e === 0) lance('voce', 'bom', 'Abriu o round e <b>ditou o ritmo</b>: iniciativa.', BONUS.iniciativa, 'imp');
    moverTrilha(batidaAtual());
  } else {
    R.eventosAdv = planejarEntradaAdv(e);
    R.avisou = -1; R.ultSeg = -1;
    palco(`<div class="pal-mic pal-mic--adv">
      <p class="pal-mic__quem"><b>${esc(mc.nome)}</b> no mic · ${qual} · faltam <span id="restam">${seg}</span></p>
      <div class="pad-area">
        <span class="feedback" id="feedback"></span>
        <div class="pad pad--adv pad--danca"><span class="pad__anel" id="anel"></span><img src="${esc(mc.imagem)}" alt=""></div>
      </div>
      <p class="aviso-vez" id="aviso-vez" hidden></p>
      <div class="jogadas">
        <button class="jogada jogada--encarar" id="btn-encarar" type="button" ${R.encararUsada ? 'disabled' : ''}><b>Encarar</b><small>${R.encararUsada ? 'já usou' : '1 por round'}</small></button>
        <button class="jogada" id="btn-pular" type="button"><b>Pular</b><small>resultado da entrada</small></button>
      </div>
      <p class="dica dica--teclas"><kbd>E</kbd> encarar · <kbd>S</kbd> pular</p>
    </div>`);
    $('#btn-encarar').addEventListener('click', encarar);
    $('#btn-pular').addEventListener('click', pularEntrada);
    lance(null, 'info', `<b>${esc(mc.nome)}</b> pega o mic.`);
  }
  anunciarVez(voce, mc.nome);
}

/** fecha a entrada que estava rolando (bônus do jogador / lances que sobraram do adversário) */
function encerrarEntrada() {
  const R = J.rnd;
  if (!R || R.entrada < 0 || R.entradaFechada === R.entrada) return;
  R.entradaFechada = R.entrada;
  const E = R.entradas[R.entrada], ultima = R.entrada === R.entradas.length - 1, blocos = E.dur / 16;
  if (R.noMic === 'voce') {
    verificarNotasPerdidas(Infinity, true);
    const precisao = limitar(R.acertos / Math.max(1, R.notas.length), 0, 1);
    const forca = forcaNoBeat(MCS[J.voce], R.beatId) / 100;
    const pts = Math.round(precisao * (4 + 6 * forca) * blocos * (R.hype.voce ? 1.2 : 1));
    if (pts > 0) lance('voce', precisao > .7 ? 'top' : 'bom', precisao > .7 ? 'Entrada redondinha, <b>do começo ao fim no ritmo</b>.' : 'Fechou a entrada.', pts);
    else lance('voce', 'ruim', 'Entrada sem pegada, a roda ficou fria.', 0);
    if (ultima) lance('voce', 'bom', '<b>Última palavra</b> é sua.', BONUS.ultimaPalavra, 'imp');
  } else {
    R.eventosAdv.filter((ev) => !ev.feito).forEach((ev) => executarEventoAdv(ev));
    if (ultima) lance('adv', 'bom', `<b>Última palavra</b> de ${esc(mcDe('adv').nome)}.`, BONUS.ultimaPalavra, 'imp');
  }
}

/* ---------- jogador ---------- */
const NOTA = { perfeito: 1, boa: .6, fora: 0 };
const JANELA = { perfeito: 90, boa: 170 };   // ms de tolerância (quanto maior, mais fácil)
const julgar = (ms, p = JANELA.perfeito, b = JANELA.boa) => (ms <= p ? 'perfeito' : ms <= b ? 'boa' : 'fora');

/** desenha a trilha de notas no canvas: a nota bate na linha vermelha quando é hora de clicar */
function moverTrilha(b) {
  const R = J.rnd, cv = document.getElementById('pista-cv'); if (!cv) return;
  if (R.pcv !== cv || !R.pctx) {   // prepara o canvas (nitidez em tela retina, até 2x)
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    if (!r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    R.pctx = cv.getContext('2d'); R.pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.pcv = cv; R.pw = r.width; R.ph = r.height; R.pb = r.width < 400 ? 58 : 72;
  }
  const c = R.pctx, w = R.pw, h = R.ph, pb = R.pb, ax = w * .18, cy = h / 2, agora = performance.now();
  c.fillStyle = '#141212'; c.fillRect(0, 0, w, h);
  const desde = b - ax / pb - .5, ate = b + (w - ax) / pb + .5;
  // mudanças de ritmo: linha tracejada amarela com o nome
  c.font = '600 9px "Bebas Neue", Impact, sans-serif'; c.textBaseline = 'top';
  for (const m of R.mudancas) {
    if (m.primeira || m.t < desde || m.t > ate) continue;
    const x = ax + (m.t - b) * pb - 18;
    c.strokeStyle = '#f2b92e'; c.lineWidth = 2; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f2b92e'; c.fillText(PADROES[m.pd].nome.toUpperCase(), x + 3, 3);
  }
  // notas
  for (let k = Math.max(0, R.prox - 16); k < R.notas.length; k++) {
    const nt = R.notas[k];
    if (nt.t < desde) continue;
    if (nt.t > ate) break;
    const x = ax + (nt.t - b) * pb, meia = nt.t % 1 !== 0;
    let raio = meia ? 9 : 12, cor = meia ? '#f2b92e' : '#f4efe5', alfa = 1;
    if (nt.res === 'ok') {
      const idade = (agora - nt.tRes) / 250; if (idade >= 1) continue;
      raio *= 1 + idade * .5; alfa = 1 - idade; cor = '#3fb35f';
    } else if (nt.res === 'erro') { cor = '#6d6560'; alfa = .45; }
    c.globalAlpha = alfa; c.fillStyle = cor;
    c.beginPath(); c.arc(x, cy, raio, 0, Math.PI * 2); c.fill();
    if (!nt.res) { c.fillStyle = 'rgba(20,18,18,.25)'; c.beginPath(); c.arc(x, cy, raio, .15 * Math.PI, .85 * Math.PI); c.fill(); }
  }
  c.globalAlpha = 1;
  // linha de acerto (brilha no acerto)
  const fl = R.flash && agora - R.flash.t < 300 ? 1 - (agora - R.flash.t) / 300 : 0;
  if (fl) { c.globalAlpha = fl * .6; c.fillStyle = R.flash.cor; c.beginPath(); c.arc(ax, cy, 22 + fl * 6, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  c.fillStyle = fl ? R.flash.cor : '#c13234'; c.fillRect(ax - 2, 0, 4, h);
  c.strokeStyle = fl ? R.flash.cor : '#c13234'; c.lineWidth = 3;
  c.beginPath(); c.arc(ax, cy, 17, 0, Math.PI * 2); c.stroke();
}
window.addEventListener('resize', () => { if (J.rnd) J.rnd.pctx = null; plateiaCv.pronto = false; });

/** se o aparelho estiver sofrendo (quadros lentos), liga o modo leve: corta as animações de enfeite */
const DESEMP = { n: 0, soma: 0, ult: 0 };
function medirDesempenho() {
  const agora = performance.now(), dt = agora - DESEMP.ult; DESEMP.ult = agora;
  if (document.body.classList.contains('leve') || dt > 250) return;   // pulos grandes = aba em segundo plano
  DESEMP.soma += dt; DESEMP.n++;
  if (DESEMP.n >= 90) {
    if (DESEMP.soma / DESEMP.n > 26) document.body.classList.add('leve');
    DESEMP.n = 0; DESEMP.soma = 0;
  }
}

/** soma um acerto no combo (o combo é só o contador de toques seguidos) */
/** texto do botão: avisa quando o ritmo vai mudar */
function avisoRitmo(b) {
  const R = J.rnd;
  const m = R.mudancas.find((x) => !x.primeira && x.t > b - 1 && x.t - b <= 2.5);
  const txt = m ? (m.t > b ? `muda!<small>${PADROES[m.pd].nome}</small>` : PADROES[m.pd].nome) : 'clica no ritmo!';
  if (txt !== R.txtPad) { R.txtPad = txt; const el = $('#pad-txt'); if (el) { el.innerHTML = txt; el.classList.toggle('muda', !!m); } }
}
function somarCombo() {
  const R = J.rnd, S = J.bat.stats;
  R.combo++; R.semToque = 0;
  S.maiorCombo = Math.max(S.maiorCombo, R.combo);
  const c = $('#combo'); if (c) { c.innerHTML = `combo <b>${R.combo}</b>`; if (R.combo % 8 === 0) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
}
function quebrarCombo(motivo) {
  const R = J.rnd;
  if (R.combo >= 4 && motivo) lance('voce', 'ruim', motivo.replace('%c', R.combo), 0);
  R.combo = 0; R.embalo = Math.max(-3, R.embalo - 1);
  const c = $('#combo'); if (c) c.innerHTML = 'combo <b>0</b>';
}
/** registra o resultado de uma nota no compasso dela; quando o compasso termina, vira lance */
function registrarNota(nt, nota) {
  const R = J.rnd, C = R.comps[nt.comp];
  if (nota !== 'perfeito') C.perfeito = false;
  if (nota === 'fora' || nota === 'perdeu') C.limpo = false;
  if (--C.resta === 0) fecharCompasso(C);
}
function fecharCompasso(C) {
  const R = J.rnd;
  const forca = forcaNoBeat(MCS[J.voce], R.beatId) / 100;
  if (C.limpo) {
    const comp = ++R.seqComp;
    const pts = Math.round((2.5 + 3 * forca) * (comp >= 2 ? 1.25 : 1) * (R.hype.voce ? 1.2 : 1));
    const frases = comp >= 3 ? ['Flow <b>atropelando o beat</b>, a roda tá hipnotizada!', `Sequência absurda, <b>${comp} compassos limpos</b>!`]
      : comp >= 2 ? ['Encaixando rima atrás de rima.', 'A roda <b>balança a cabeça junto</b>.']
        : ['Pegou o ritmo do beat.', 'Encaixou bonito na batida.'];
    lance('voce', comp >= 2 ? 'top' : 'bom', escolher(frases), pts);
    if (comp >= 2) Som.plateia(.5, .8);
    R.embalo = Math.min(3, R.embalo + 1);
    if (comp % 4 === 0) punchlineAuto();   // 4 compassos sem errar: a punch vem
  } else R.seqComp = 0;
  if (C.perfeito) {
    if (++R.seqPerf % 2 === 0) {   // 2 compassos perfeitos seguidos: FATALITY grande
      Som.fatality(true); R.cat.voce.pla += 1;
      lance('voce', 'top', escolher(['<b>FATALITY!</b> Dois compassos cravados, a roda gritou!', '<b>FATALITY!</b> Nem uma sílaba fora do lugar.']), 2, 'pla');
      mostrarFeedback('FATALITY!!', 'perfeito');
    }
  } else R.seqPerf = 0;
}
function pulsoPad(ok) { const pad = $('#pad'); if (pad) { pad.classList.remove('hit', 'miss'); void pad.offsetWidth; pad.classList.add(ok ? 'hit' : 'miss'); } }

/** punchline sai sozinha quando você emenda 4 compassos no ritmo */
function punchlineAuto() {
  const R = J.rnd, S = J.bat.stats, mc = MCS[J.voce];
  const at = mc.attr.punch / 100, limpeza = Math.min(R.seqPerf, 4) / 4;
  const chance = limitar(.3 + at * .4 + limpeza * .25 + (R.hype.voce ? .06 : 0), .15, .92);
  S.punchTotal++;
  if (Math.random() < chance) {
    S.punchOk++;
    const pts = Math.round((7 + 8 * at) * (R.hype.voce ? 1.2 : 1));
    lance('voce', 'explode', escolher(['<b>PUNCHLINE PESADA!</b> A roda veio abaixo!', `${esc(mc.nome)} <b>acertou em cheio</b>, até o adversário riu!`, '<b>UUUUUH!</b> Essa vai pros melhores momentos!']), pts);
    palcoFlash('PUNCHLINE!');
    Som.plateia(1, 1.6); R.embalo = 3; sprayEm($('#pad'), 40);
    $('#palco')?.classList.remove('tremor'); void $('#palco')?.offsetWidth; $('#palco')?.classList.add('tremor');
  } else lance('voce', 'info', 'Armou a punch, <b>a roda segurou o grito</b>.', 1, 'imp');
}

/** fatality: cada acerto perfeito solta um "UH" da roda */
function fatality() {
  const R = J.rnd, S = J.bat.stats;
  S.fatal++; R.cat.voce.pla += .25;
  const agora = performance.now();
  if (agora - R.ultimoFat > 280) { Som.fatality(false); R.ultimoFat = agora; }
}

/* ---------- jogador: toque ---------- */
function bater() {
  const R = J.rnd;
  if (!R || R.noMic !== 'voce' || R.pausado || !R.rodando) return;
  const b = batidaAtual();
  // nota pendente mais próxima
  let melhor = -1, dist = Infinity;
  for (let k = R.prox; k < R.notas.length; k++) {
    const d = Math.abs(R.notas[k].t - b);
    if (!R.notas[k].feita && d < dist) { dist = d; melhor = k; }
    if (R.notas[k].t > b + 1) break;
  }
  const S = J.bat.stats;
  const erroMs = dist * R.msBatida;
  if (melhor < 0 || erroMs > JANELA.boa) {   // clique fora de qualquer nota: conta como atravessar (impede sair metralhando)
    const agora = performance.now();
    if (agora - (R.ultimoErro || 0) < 180) return;
    R.ultimoErro = agora; S.erros++;
    if (melhor >= 0) R.comps[R.notas[melhor].comp].limpo = false;
    quebrarCombo('Clicou fora do ritmo e <b>perdeu o combo de %c</b>.');
    mostrarFeedback('FORA', 'fora'); pulsoPad(false);
    return;
  }
  const nt = R.notas[melhor];
  const nota = julgar(erroMs);
  nt.feita = true; R.acertos += NOTA[nota];
  S.batidas++;
  acertoNaPista(nota);
  nt.res = nota === 'fora' ? 'erro' : 'ok'; nt.tRes = performance.now();
  mostrarFeedback(nota === 'perfeito' ? 'FATALITY' : nota === 'boa' ? 'BOA' : 'FORA', nota);
  if (nota === 'fora') { S.erros++; quebrarCombo('Atravessou o beat e <b>perdeu o combo de %c</b>.'); }
  else {
    if (nota === 'perfeito') { S.perfeitos++; Som.clique(); fatality(); } else S.bons++;
    somarCombo();
  }
  registrarNota(nt, nota);
  pulsoPad(nota !== 'fora');
}

function verificarNotasPerdidas(b, tudo = false) {
  const R = J.rnd, janela = (JANELA.boa + 20) / R.msBatida;
  while (R.prox < R.notas.length && (tudo || R.notas[R.prox].t < b - janela)) {
    const nt = R.notas[R.prox++];
    if (nt.feita) continue;
    nt.feita = true;
    if (tudo) continue;
    nt.res = 'erro';
    R.semToque++;
    if (R.combo > 0 && R.semToque >= 2) quebrarCombo('Deixou o beat passar e <b>perdeu o combo de %c</b>.');
    registrarNota(nt, 'perdeu');
    if (R.semToque === 4) { lance('voce', 'ruim', 'Ficou <b>um compasso inteiro sem rimar</b>… alguém tosse no fundo.', 0); Som.vaia(); R.embalo = Math.max(-3, R.embalo - 1); }
  }
}

function mostrarFeedback(txt, nota) {
  const f = $('#feedback'); if (!f) return;
  f.textContent = txt;
  f.className = 'feedback feedback--' + nota;
  void f.offsetWidth; f.classList.add('mostrar');
}

function chamarPlateia() {
  const R = J.rnd;
  if (!R || R.noMic !== 'voce' || R.plateiaUsada || R.pausado) return;
  R.plateiaUsada = true; R.hype.voce = true; J.bat.stats.plateias++;
  const btn = $('#btn-plateia'); if (btn) { btn.disabled = true; btn.querySelector('small').textContent = 'já usou'; }
  const pts = Math.round(2 + MCS[J.voce].attr.presenca / 100 * 3);
  lance('voce', 'top', 'Chamou a plateia: <b>a roda bate palma no tempo</b>. Próximos lances valem +20%.', pts, 'pla');
  Som.plateia(.8, 1.4);
}

/* ---------- adversário ---------- */
/** monta os lances da entrada do adversário (o nível secreto pesa aqui). A cada 16 batidas: ~5 lances */
function planejarEntradaAdv(e) {
  const R = J.rnd, mc = MCS[J.bat.adv], E = R.entradas[e];
  const forca = forcaNoBeat(mc, R.beatId) / 100;
  const q = limitar(forca * .66 + mc.nivel * .1 + R.formaAdv + sorte(-.12, .12), .2, .97);   // qualidade desta entrada
  const evs = [];
  let plateiaFeita = R.hype.adv;
  for (let c = 0; c < E.dur; c += 16) {
    const ini = E.ini + c, len = Math.min(16, E.dur - c), nSlots = Math.max(2, Math.round(5 * len / 16));
    const slots = Array.from({ length: nSlots }, (_, k) => ini + 2 + k * (len - 2) / nSlots + sorte(0, 1.5));
    const punchSlot = Math.random() < (.3 + mc.nivel * .06) * len / 16 ? Math.floor(sorte(1, nSlots)) : -1;
    const plateiaSlot = !plateiaFeita && Math.random() < .35 ? Math.floor(sorte(0, Math.min(3, nSlots))) : -1;
    if (plateiaSlot >= 0) plateiaFeita = true;
    slots.forEach((t, k) => {
      if (k === punchSlot) return evs.push({ t, tipo: Math.random() < q * .85 ? 'punch' : 'punchFalha', q });
      if (k === plateiaSlot) return evs.push({ t, tipo: 'plateia', q });
      const r = Math.random();
      evs.push({ t, tipo: r < q ? 'encaixe' : r < q + (1 - q) * .45 ? 'morno' : 'travou', q });
    });
  }
  evs.push({ t: E.ini + E.dur - .5, tipo: 'fechou', q, blocos: E.dur / 16 });
  if (e === 0) evs.unshift({ t: E.ini + .5, tipo: 'iniciativa', q });
  return evs;
}

function dispararEventosAdv(b) {
  J.rnd.eventosAdv.forEach((ev) => { if (!ev.feito && b >= ev.t) executarEventoAdv(ev); });
}

function executarEventoAdv(ev) {
  const R = J.rnd, mc = MCS[J.bat.adv], nome = esc(mc.nome);
  ev.feito = true;
  const mult = R.hype.adv ? 1.2 : 1;
  const forca = forcaNoBeat(mc, R.beatId) / 100;
  if (R.encarada && ['encaixe', 'punch', 'plateia'].includes(ev.tipo)) {   // encarada certa estraga o próximo lance bom
    R.encarada = false;
    lance('adv', 'ruim', `${nome} <b>sentiu a encarada e travou</b>!`, 0); Som.vaia();
    R.embalo = Math.min(3, R.embalo + 2); return;
  }
  switch (ev.tipo) {
    case 'iniciativa': lance('adv', 'bom', `${nome} abriu o round e <b>ditou o ritmo</b>.`, BONUS.iniciativa, 'imp'); break;
    case 'encaixe': {
      const pts = Math.round((2.5 + 3 * forca) * mult);
      const lista = [`${nome} <b>encaixou no ritmo</b>.`, `${nome} tá confortável nesse beat.`, `Rima atrás de rima de ${nome}, a roda balança.`, `${nome} <b>conversou com o beat</b>.`, `${nome} <b>emendou uma sequência</b> sem respirar.`];
      lance('adv', ev.q > .75 ? 'top' : 'bom', escolher(lista), pts);
      if (ev.q > .75) { Som.fatality(false); R.cat.adv.pla += .75; }
      R.embalo = Math.max(-3, R.embalo - 1); break;
    }
    case 'punch': {
      const pts = Math.round((7 + 8 * mc.attr.punch / 100) * mult);
      lance('adv', 'explode', escolher([`<b>PUNCHLINE de ${nome}!</b> A roda explodiu!`, `${nome} <b>te atingiu em cheio</b>. UUUUH!`, `Essa doeu: <b>${nome} acertou a punch</b>.`]), pts);
      Som.plateia(1, 1.5); R.embalo = -3; break;
    }
    case 'punchFalha': lance('adv', 'ruim', `${nome} tentou a punch e <b>ficou no vácuo</b>.`, 1, 'imp'); Som.vaia(); R.embalo = Math.min(3, R.embalo + 2); break;
    case 'plateia': R.hype.adv = true; lance('adv', 'top', `${nome} <b>chamou a plateia</b>: a roda tá com ele.`, Math.round(2 + 3 * mc.attr.presenca / 100), 'pla'); Som.plateia(.7, 1.2); break;
    case 'morno': lance('adv', 'info', escolher([`${nome} segurando sem brilho.`, `${nome} rimou no automático.`, `Plateia morna com ${nome}.`]), 1); break;
    case 'travou': lance('adv', 'ruim', escolher([`${nome} <b>atravessou o beat</b>!`, `${nome} <b>esqueceu a rima</b> por um segundo.`, `${nome} travou e a roda percebeu.`]), 0); R.embalo = Math.min(3, R.embalo + 1); break;
    case 'fechou': {
      const pts = Math.round(ev.q * (4 + 6 * forca) * (ev.blocos || 1) * mult);
      lance('adv', ev.q > .7 ? 'top' : 'bom', ev.q > .7 ? `${nome} <b>fechou a entrada com força</b>.` : `${nome} fechou a entrada.`, pts); break;
    }
  }
}

function encarar() {
  const R = J.rnd;
  if (!R || R.noMic !== 'adv' || R.encararUsada || R.pausado) return;
  R.encararUsada = true;
  const btn = $('#btn-encarar'); if (btn) { btn.disabled = true; btn.querySelector('small').textContent = 'já usou'; }
  const vp = MCS[J.voce].attr.presenca, ap = MCS[J.bat.adv].attr.presenca;
  if (Math.random() < limitar(.38 + (vp - ap) / 120, .12, .75)) { R.encarada = true; J.bat.stats.encaradasOk++; lance('voce', 'bom', 'Você <b>encarou de perto</b>… ele sentiu.', 0); }
  else lance('voce', 'info', 'Você encarou, mas <b>ele nem piscou</b>.', 0);
}

function pularEntrada() {
  const R = J.rnd;
  if (!R || R.noMic !== 'adv') return;
  const E = R.entradas[R.entrada], b = batidaAtual();
  R.offset += Math.max(0, Math.ceil(E.ini + E.dur - b) - (R.entradas[R.entrada + 1]?.quem === 'voce' ? 4 : 0));   // pula batidas inteiras; se a próxima é sua, para 4 antes pra você se preparar
}

/* ---------- lance a lance ---------- */
function lance(lado, tipo, html, pts, cat) {
  const R = J.rnd;
  // a 'forma do dia' pesa nos seus lances: tem round que a roda compra, tem round que não
  if (R && lado === 'voce' && pts > 0) pts = Math.max(1, Math.round(pts * R.formaVoce));
  if (R && lado && pts) { R.pontos[lado] += pts; R.cat[lado][cat || (tipo === 'explode' ? 'imp' : 'tec')] += pts; if (R.rodando) pontosVoando(lado, pts); }
  if (tipo === 'explode' || (cat === 'pla' && pts)) agitarPlateia();
  const li = document.createElement('li');
  li.className = `lance lance--${tipo}${lado ? ' lance--' + lado : ''}`;
  const mc = lado ? mcDe(lado) : null;
  li.innerHTML = `<span class="lance__t">${R ? tempoTxt(Math.max(0, batidaAtual())) : '—'}</span>
    ${mc ? `<img src="${esc(mc.imagem)}" alt="">` : '<i class="lance__dj"></i>'}
    <p>${html}</p>${pts ? `<b class="lance__pts">+${pts}</b>` : ''}`;
  const lista = $('#lances');
  lista.prepend(li);
  while (lista.children.length > 25) lista.lastChild.remove();
  atualizarPontos();
}

function palcoFlash(txt) {
  const f = $('#feedback'); if (!f) return;
  f.textContent = txt; f.className = 'feedback feedback--punch'; void f.offsetWidth; f.classList.add('mostrar');
}

/* ---------- fim do round: 2 jurados + 1 voto da plateia ---------- */
const VOTANTES = [
  { id: 'j1', nome: 'Jurado 1', olho: 'técnica e flow',     peso: { tec: 1, imp: .5, pla: .2 },  ruido: .2 },
  { id: 'j2', nome: 'Jurado 2', olho: 'punchline e impacto', peso: { tec: .5, imp: 1.1, pla: .3 }, ruido: .2 },
  { id: 'pl', nome: 'Plateia',  olho: 'barulho da roda',     peso: { tec: .4, imp: .8, pla: 1.2 }, ruido: .38 }
];
function apurarVotos(R) {
  const dono = donoDaRoda(J.voce, J.bat.adv);
  return VOTANTES.map((v) => {
    if (v.id === 'pl' && dono !== null) return { ...v, voto: dono === J.voce ? 'voce' : 'adv', dono: true };
    const nota = (l) => { const c = R.cat[l]; return (c.tec * v.peso.tec + c.imp * v.peso.imp + c.pla * v.peso.pla) * (1 + sorte(-v.ruido, v.ruido)); };
    const nv = nota('voce'), na = nota('adv');
    return { ...v, voto: nv === na ? (Math.random() < .5 ? 'voce' : 'adv') : nv > na ? 'voce' : 'adv' };
  });
}

async function fimDoRound() {
  const R = J.rnd, B = J.bat;
  R.rodando = false; R.noMic = null; document.body.classList.remove('vez-voce');
  renderPlacar(); atualizarPontos();
  const pv = R.pontos.voce, pa = R.pontos.adv;
  const votos = apurarVotos(R);
  const vv = votos.filter((v) => v.voto === 'voce').length, va = 3 - vv;
  const vencedor = vv >= 2 ? 'voce' : 'adv';
  palco(`<div class="pal-juri">
    <h2 class="titulo-pincel"><span class="pincel-preto">Hora do</span> <span class="pincel-vermelho">voto</span></h2>
    <p class="pal-sub">2 jurados + 1 voto da plateia · pontos do round ${pv} × ${pa}</p>
    <div class="votos">${votos.map((v) => `<div class="voto" id="voto-${v.id}">
      <span class="voto__quem"><b>${v.nome}</b><small>${v.olho}</small></span>
      <span class="voto__carta"><span class="voto__verso">?</span></span></div>`).join('')}</div>
    <p class="pal-res" id="juri-res">quem levou esse?</p></div>`);
  Som.plateia(.6, 1.6);
  for (const v of votos) {
    await esperar(REDUZIR ? 0 : 900);
    if (J.rnd !== R) return;
    const mc = mcDe(v.voto), el = $('#voto-' + v.id);
    el.classList.add('aberto', v.voto === 'voce' ? 'voto--voce' : 'voto--adv');
    el.querySelector('.voto__carta').innerHTML = `<img src="${esc(mc.imagem)}" alt=""><b>${esc(mc.nome)}</b>`;
    if (v.dono) el.querySelector('.voto__quem small').textContent = 'a roda já tem dono';
    if (v.id === 'pl') { Som.plateia(v.voto === 'voce' ? 1 : .7, 1.6); agitarPlateia(); } else Som.clique(false);
  }
  await esperar(REDUZIR ? 0 : 700);
  B.placar[vencedor]++;
  B.rounds.push({ beat: R.beatId, voce: pv, adv: pa, vencedor, votos: [vv, va] });
  Som.buzina(false);
  const acabou = B.placar.voce === 2 || B.placar.adv === 2;
  const unanime = vv === 3 || va === 3;
  $('#juri-res').innerHTML = `<b>${vencedor === 'voce' ? 'VOCÊ LEVOU O ROUND' : esc(mcDe('adv').nome).toUpperCase() + ' LEVOU O ROUND'}</b> · ${unanime ? 'unânime' : `${Math.max(vv, va)} votos a ${Math.min(vv, va)}`}`;
  $('#juri-res').classList.toggle('bom', vencedor === 'voce');
  renderPlacar(); atualizarPontos();
  lance(null, 'info', `<b>Fim do round ${B.round}:</b> ${vencedor === 'voce' ? 'você' : esc(mcDe('adv').nome)} levou por ${Math.max(vv, va)} × ${Math.min(vv, va)} nos votos (pontos ${pv} × ${pa}). Batalha: ${B.placar.voce} × ${B.placar.adv}.`);
  const btn = document.createElement('button');
  btn.className = 'btn-tinta btn-tinta--xl'; btn.type = 'button'; btn.id = 'btn-seguir';
  btn.textContent = acabou ? 'Resultado da batalha' : `Round ${B.round + 1}`;
  btn.addEventListener('click', () => { if (acabou) fimDaBatalha(); else { B.round++; antesDoRound(); } }, { once: true });
  $('.pal-juri').append(btn); btn.focus({ preventScroll: true });
  if (vencedor === 'voce') { sprayEm($('#placar'), 30); agitarPlateia(2200); }
}

/* --------------------------------------------------------------------------
   12. Fim da batalha, resultados da fase, campeão
   -------------------------------------------------------------------------- */
function fimDaBatalha() {
  const B = J.bat, meu = meuJogo(), ganhou = B.placar.voce === 2;
  const lado = meu.jogo.a === J.voce ? 0 : 1;
  meu.jogo.vencedor = ganhou ? J.voce : B.adv;
  meu.jogo.placar = lado === 0 ? [B.placar.voce, B.placar.adv] : [B.placar.adv, B.placar.voce];
  avancar(J.fase, meu.m);
  const faseJogada = J.fase;
  const S = B.stats;
  const precisao = Math.round(((S.perfeitos + S.bons) / Math.max(1, S.perfeitos + S.bons + S.erros)) * 100);
  const campeaoVoce = ganhou && faseJogada === 3;
  const titulo = campeaoVoce ? 'Campeão estadual!' : ganhou ? `Passou ${['das oitavas', 'das quartas', 'da semi'][faseJogada]}!` : `Eliminado ${['nas oitavas', 'nas quartas', 'na semi', 'na final'][faseJogada]}`;
  $('#tela-pos').innerHTML = `
    <p class="pos__eyebrow">${campeaoVoce ? icone('i-trofeu') : ''}${FASES[faseJogada]}</p>
    <h1 class="pos__titulo ${ganhou ? 'bom' : ''}">${titulo}</h1>
    <div class="pos__duelo">
      <figure class="${ganhou ? 'venceu' : 'perdeu'}"><span class="pos__foto"><img src="${esc(MCS[J.voce].imagem)}" alt=""></span>${ganhou ? icone('i-coroa', 'pos__coroa') : ''}<figcaption>${esc(MCS[J.voce].nome)}<small>você</small></figcaption></figure>
      <span class="pos__placar">${B.placar.voce} × ${B.placar.adv}</span>
      <figure class="${ganhou ? 'perdeu' : 'venceu'}"><span class="pos__foto"><img src="${esc(MCS[B.adv].imagem)}" alt=""></span>${ganhou ? '' : icone('i-coroa', 'pos__coroa')}<figcaption>${esc(MCS[B.adv].nome)}</figcaption></figure>
    </div>
    <ol class="pos__rounds">${B.rounds.map((r, k) => `<li><span>R${k + 1} · ${esc(infoBeat(r.beat).nome)} ${seloRitmo(BEATS[r.beat].padrao)}</span><b>${r.votos[0]} × ${r.votos[1]} <small>votos</small></b><em>${r.vencedor === 'voce' ? 'você' : esc(MCS[B.adv].nome)}</em></li>`).join('')}</ol>
    <div class="pos__stats">
      <div><b>${precisao}%</b><small>no tempo</small></div>
      <div><b>${S.maiorCombo}</b><small>maior combo</small></div>
      <div><b>${S.punchOk}/${S.punchTotal}</b><small>punchlines</small></div>
      <div><b>${S.fatal}</b><small>fatalities</small></div>
    </div>
    <div class="pos__acoes" id="pos-acoes"></div>`;
  const acoes = $('#pos-acoes');
  if (ganhou && faseJogada < 3) {
    acoes.innerHTML = `<button class="btn-tinta btn-tinta--xl" type="button" id="btn-prox">Ver as outras batalhas</button>`;
    $('#btn-prox').addEventListener('click', rodarChave, { once: true });
  } else if (!ganhou) {
    acoes.innerHTML = `
      <button class="btn-tinta btn-tinta--xl" type="button" id="btn-prox">Ver o resto do campeonato</button>
      <button class="btn-tinta btn-tinta--papel" type="button" id="btn-denovo">Nova carreira com ${esc(MCS[J.voce].nome)}</button>
      <button class="btn-giz" type="button" id="btn-outro-mc">escolher outro MC</button>`;
    $('#btn-prox').addEventListener('click', rodarChave, { once: true });
    $('#btn-denovo').addEventListener('click', () => escolherMC(J.voce));
    $('#btn-outro-mc').addEventListener('click', () => mostrar('tela-mc'));
  } else {
    acoes.innerHTML = `
      ${campeaoVoce ? '<button class="btn-tinta btn-tinta--ouro btn-tinta--xl" type="button" id="btn-share">Compartilhar o título</button>' : ''}
      <button class="btn-tinta ${campeaoVoce ? 'btn-tinta--papel' : 'btn-tinta--xl'}" type="button" id="btn-denovo">Nova carreira com ${esc(MCS[J.voce].nome)}</button>
      <button class="btn-giz" type="button" id="btn-outro-mc">escolher outro MC</button>`;
    $('#btn-denovo').addEventListener('click', () => escolherMC(J.voce));
    $('#btn-outro-mc').addEventListener('click', () => mostrar('tela-mc'));
    $('#btn-share')?.addEventListener('click', compartilhar);
  }
  mostrar('tela-pos');
  if (ganhou) { Som.buzina(campeaoVoce); Som.plateia(1, campeaoVoce ? 3 : 1.8); setTimeout(() => sprayEm($('.pos__duelo .venceu'), campeaoVoce ? 90 : 50), 300); }
  else Som.vaia();
}

async function compartilhar() {
  const derrubados = J.chave.map((f) => f.find((j) => j.a === J.voce || j.b === J.voce)).map((j) => MCS[j.a === J.voce ? j.b : j.a].nome);
  const txt = `🏆 Fui campeão do Estadual SP 2026 no simulador de batalha com ${MCS[J.voce].nome}! Passei por ${derrubados.join(', ')}.`;
  const url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  try { if (navigator.share) { await navigator.share({ title: 'Campeão do Estadual SP 2026', text: txt, url: url || undefined }); return; } }
  catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url ? `${txt} ${url}` : txt); toast('Texto copiado, é só colar e postar'); }
  catch (e) { toast('Não deu pra copiar neste navegador'); }
}

/* --------------------------------------------------------------------------
   13. Efeitos, pausa e montagem
   -------------------------------------------------------------------------- */
function sprayEm(el, qtd = 24) {
  if (REDUZIR || !el) return;
  const r = el.getBoundingClientRect(), camada = $('#efeitos'), cores = ['#c13234', '#f2b92e', '#141212', '#22b8cc'];
  for (let i = 0; i < qtd; i++) {
    const g = document.createElement('span'), ang = Math.random() * Math.PI * 2, d = sorte(30, 150);
    g.className = 'gota-spray';
    g.style.cssText = `left:${r.left + r.width / 2}px; top:${r.top + r.height / 2}px; --s:${sorte(3, 9).toFixed(1)}px; --dx:${(Math.cos(ang) * d).toFixed(0)}px; --dy:${(Math.sin(ang) * d).toFixed(0)}px; --c:${cores[i % 4]}; --t:${sorte(.5, .9).toFixed(2)}s`;
    camada.append(g); setTimeout(() => g.remove(), 1000);
  }
}

let toastT;
function toast(msg) { const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>`; t.classList.add('mostrar'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('mostrar'), 2600); }

/** plateia em silhueta no fundo, desenhada num canvas: 2 fileiras × 3 camadas pré-desenhadas
    (cada quadro só "carimba" 6 imagens deslocadas = levíssimo). Pulam no beat e levantam a mão nos lances fortes. */
const plateiaCv = { pronto: false, camadas: [], agitoAte: 0, rodando: false };
function montarPlateia() {
  const pessoa = (i, n, y0, esc, sem) => {
    const x = (i + .5) * (1200 / n) + (semente(i + sem) - .5) * 24, y = y0 + (semente(i + sem + 50) - .5) * 18, r = 15 * esc;
    const ombro = 32 * esc, lado = semente(i + sem + 9) < .5 ? -1 : 1, mx = x + lado * ombro * .8, my = y + r * 2.2, tipo = semente(i + sem + 17);
    return { x, y, r, ombro, mx, my, mao: [mx + lado * 10 * esc, y - r * 2.6], larg: 9 * esc, bracoSempre: tipo < .25, cel: tipo > .9 };
  };
  const fila = (n, y0, esc, sem) => Array.from({ length: n }, (_, i) => pessoa(i, n, y0, esc, sem));
  const fundo = fila(30, 120, .8, 300), frente = fila(20, 160, 1.15, 600);
  plateiaCv.def = [0, 1, 2].map((k) => ({ pessoas: fundo.filter((_, i) => i % 3 === k), cor: 'rgba(20,18,18,.16)', a: 4, d: -k / 3 }))
    .concat([0, 1, 2].map((k) => ({ pessoas: frente.filter((_, i) => i % 3 === k), cor: 'rgba(20,18,18,.3)', corVez: 'rgba(80,14,16,.34)', a: 7, d: -k / 3 })));
  const cv = document.createElement('canvas');
  cv.className = 'plateia-sombra'; cv.id = 'plateia'; cv.setAttribute('aria-hidden', 'true');
  $('#parede-tags').after(cv);
  plateiaCv.cv = cv;
}
/** pré-desenha cada camada (normal, com braços levantados e versão "sua vez") no tamanho da tela */
function prepararPlateia() {
  const P = plateiaCv, cv = P.cv, r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  cv.width = W; cv.height = H;
  const s = Math.max(W / 1200, H / 240), ox = (W - 1200 * s) / 2, oy = H - 240 * s;
  const pintar = (camada, cor, bracos) => {
    const o = document.createElement('canvas'); o.width = W; o.height = H + Math.ceil(30 * s);
    const c = o.getContext('2d'); c.setTransform(s, 0, 0, s, ox, oy + 30 * s);
    c.fillStyle = cor; c.strokeStyle = cor; c.lineCap = 'round';
    for (const p of camada.pessoas) {
      if (p.bracoSempre || bracos) { c.lineWidth = p.larg; c.beginPath(); c.moveTo(p.mx, p.my); c.lineTo(p.mao[0], p.mao[1]); c.stroke(); }
      if (p.cel) { c.save(); c.fillStyle = 'rgba(242,185,46,.55)'; c.shadowColor = 'rgba(242,185,46,.8)'; c.shadowBlur = 6 * s; c.fillRect(p.mao[0] - 5, p.y - p.r * 3.4, 10, 16); c.restore(); }
      c.beginPath(); c.moveTo(p.x - p.ombro, 240);
      c.quadraticCurveTo(p.x - p.ombro, p.y + p.r * 1.9, p.x, p.y + p.r * 1.6);
      c.quadraticCurveTo(p.x + p.ombro, p.y + p.r * 1.9, p.x + p.ombro, 240); c.closePath(); c.fill();
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    }
    return o;
  };
  P.camadas = P.def.map((d) => ({ ...d, img: pintar(d, d.cor, false), agito: pintar(d, d.cor, true), vez: d.corVez ? pintar(d, d.corVez, false) : null, vezAgito: d.corVez ? pintar(d, d.corVez, true) : null }));
  P.W = W; P.H = H; P.s = s; P.ctx = cv.getContext('2d'); P.pronto = true;
  return true;
}
function desenharPlateia(agora) {
  const P = plateiaCv;
  if (!P.pronto && !prepararPlateia()) return;
  const c = P.ctx, bat = J.rnd?.msBatida || 650, agito = agora < P.agitoAte, vez = document.body.classList.contains('vez-voce');
  const parado = document.body.classList.contains('leve') || REDUZIR;
  c.clearRect(0, 0, P.W, P.H);
  for (const L of P.camadas) {
    const per = agito ? bat / 2 : bat, fase = (((agora / per + L.d) % 2) + 2) % 2;
    const sobe = parado ? 0 : (1 - Math.cos(Math.PI * (fase < 1 ? fase : 2 - fase))) / 2;   // vai e volta, suave
    const y = -sobe * L.a * (agito ? 3 : 1) * P.s - 30 * P.s;
    const img = vez && L.vez ? (agito ? L.vezAgito : L.vez) : (agito ? L.agito : L.img);
    c.drawImage(img, 0, Math.round(y));
  }
}
/** liga/desliga o loop da plateia conforme a tela (só anima na batalha) */
function plateiaLoop() {
  const P = plateiaCv;
  const tela = document.body.dataset.fase, visivel = tela === 'tela-arena' || tela === 'tela-pre' || tela === 'tela-pos';
  if (!visivel || document.hidden) { P.rodando = false; return; }
  desenharPlateia(performance.now());
  const anima = tela === 'tela-arena' && !document.body.classList.contains('leve') && !REDUZIR;
  if (anima) requestAnimationFrame(plateiaLoop); else P.rodando = false;
}
function ligarPlateia() { if (!plateiaCv.rodando) { plateiaCv.rodando = true; requestAnimationFrame(plateiaLoop); } }
function agitarPlateia(ms = 1400) {
  plateiaCv.agitoAte = performance.now() + ms;
  ligarPlateia();
}
/** "+N" voando de cima do MC que pontuou */
function pontosVoando(lado, pts) {
  if (REDUZIR) return;
  const alvo = J.rnd?.noMic === lado ? $('.pad') : $(`.pl-mc--${lado} img`);
  if (!alvo) return;
  const r = alvo.getBoundingClientRect(), el = document.createElement('span');
  el.className = 'pts-voa' + (lado === 'voce' ? ' pts-voa--voce' : '') + (pts >= 7 ? ' pts-voa--grande' : '');
  el.textContent = '+' + pts;
  el.style.cssText = `left:${(r.left + r.width / 2 + sorte(-30, 30)).toFixed(0)}px; top:${(r.top + r.height * .25).toFixed(0)}px`;
  $('#efeitos').append(el); setTimeout(() => el.remove(), 1100);
}
/** brilho na linha da trilha quando acerta */
function acertoNaPista(nota) {
  if (J.rnd) J.rnd.flash = { t: performance.now(), cor: nota === 'perfeito' ? '#f2b92e' : '#3fb35f' };
  const a = null; if (!a) return;
  a.classList.remove('acerto', 'acerto--top'); void a.offsetWidth;
  a.classList.add(nota === 'perfeito' ? 'acerto--top' : 'acerto');
}

function montarParedeTags() {
  const palavras = ['RIMA', 'SP', 'FREESTYLE', 'CPBMC', 'ZN', 'ZL', 'ZS', 'ZO', '011', 'FLOW', 'MIC', 'BATALHA', 'CORRE', 'VERSO', 'RUA', 'CENA', 'TÁ FORA', 'BOOM BAP', 'PUNCH', 'SEM CAÔ', 'QUEBRADA'];
  const cores = ['var(--tinta)', 'var(--tinta)', 'var(--vermelho)', 'var(--vermelho)', 'var(--neon-ciano)', 'var(--neon-rosa)', 'var(--neon-roxo)', 'var(--neon-verde)', 'var(--ouro)'];
  let h = '';
  for (let i = 0; i < 40; i++) {
    const e = semente(i + 700), cl = e < .3 ? 'oco' : e < .45 ? 'sombra' : '';
    h += `<span class="${cl}" style="--x:${(semente(i + 100) * 96).toFixed(1)}%; --y:${(semente(i + 200) * 96).toFixed(1)}%; --t:${(18 + semente(i + 400) * 46).toFixed(0)}px; --r:${((semente(i + 600) - .5) * 34).toFixed(0)}deg; --k:${((semente(i + 800) - .5) * 24).toFixed(0)}deg; --c:${cores[Math.floor(semente(i + 500) * cores.length)]}; --o:${(.1 + semente(i + 900) * .16).toFixed(2)}">${palavras[Math.floor(semente(i + 300) * palavras.length)]}</span>`;
  }
  $('#parede-tags').innerHTML = h;
}

function pintarSom() {
  const b = $('#btn-som');
  b.setAttribute('aria-pressed', String(J.som)); b.title = J.som ? 'Efeitos ligados' : 'Efeitos desligados';
  b.innerHTML = icone(J.som ? 'i-som' : 'i-mudo');
}

/** aba em segundo plano: pausa o round; ao voltar, a pessoa retoma no clique */
function pausar() {
  const R = J.rnd; if (!R || !R.rodando || R.pausado) return;
  R.pausado = true; R.batidaPausa = batidaAtual();
  const v = document.createElement('div');
  v.className = 'pausa'; v.id = 'pausa';
  v.innerHTML = '<div><h2 class="titulo-pincel"><span class="pincel-preto">Pausado</span></h2><button class="btn-tinta btn-tinta--xl" type="button" id="btn-voltar">Voltar pra roda</button></div>';
  document.body.append(v);
  $('#btn-voltar').addEventListener('click', retomar, { once: true });
}
async function retomar() {
  const R = J.rnd; if (!R) return;
  $('#pausa')?.remove();
  let t = null;
  R.offset = R.offsetBase = Math.ceil(R.batidaPausa);
  R.inicio = performance.now() + 300;
  R.pausado = false;
  sincronizarBeat(R, true);
}

function ligar() {
  $('#grade-mc').addEventListener('click', (e) => { const c = e.target.closest('.card-mc'); if (c) { Som.clique(); const i = Number(c.dataset.i); apresentar(i, false).then(() => escolherMC(i)); } });
  $('#btn-aleatorio').addEventListener('click', async () => {
    const cards = $$('#grade-mc .card-mc');
    if (!REDUZIR) for (let k = 0; k < 16; k++) { cards.forEach((c) => c.classList.remove('piscando')); escolher(cards).classList.add('piscando'); Som.clique(); await esperar(60 + k * 10); }
    cards.forEach((c) => c.classList.remove('piscando'));
    const i = Math.floor(Math.random() * MCS.length);
    await apresentar(i, true);
    escolherMC(i, true);
  });
  $('#btn-comecar').addEventListener('click', acaoChave);
  $('#btn-pular-chave').addEventListener('click', () => { J.pular = true; });
  $('#btn-trocar').addEventListener('click', () => mostrar('tela-mc'));
  $('#btn-resortear').addEventListener('click', () => escolherMC(J.voce));
  $('#btn-reiniciar').addEventListener('click', () => { J.geracao = (J.geracao || 0) + 1; J.rodandoChave = false; if (J.rnd) J.rnd.rodando = false; J.rnd = null; $('#pausa')?.remove(); mostrar('tela-mc'); });
  $('#btn-som').addEventListener('click', () => {
    J.som = !J.som; pintarSom();
    try { const p = JSON.parse(localStorage.getItem('estadual-sp-prefs') || '{}'); p.som = J.som; localStorage.setItem('estadual-sp-prefs', JSON.stringify(p)); } catch (e) { /* ok */ }
  });
  document.addEventListener('keydown', (e) => {
    const R = J.rnd; if (!R || !R.rodando || R.pausado) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && R.noMic === 'voce') bater(); }
    else if (e.key === 's' || e.key === 'S') pularEntrada();
    else if (e.key === 'c' || e.key === 'C') chamarPlateia();
    else if (e.key === 'e' || e.key === 'E') encarar();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); else ligarPlateia(); });
}

montarParedeTags();
montarPlateia();
montarEscolha();
pintarSom();
ligar();
