/* ==========================================================================
   ESTADUAL DE SP — BATALHA DE MCs
   Lógica do campeonato em JavaScript puro.

   Sumário
   1. Dados dos MCs            → edite aqui nomes, cidades e fotos
   2. Configuração
   3. Estado
   4. Utilitários
   5. Som (airhorn e torcida — sintetizados, sem arquivos)
   6. Regras do campeonato     → sorteio, vencedor, desfazer
   7. Renderização             → topo, palco, chave espelhada, lista
   8. Efeitos                  → spray, banner, confete, toast
   9. Sorteio ao vivo
   10. Tela do campeão
   11. Eventos e inicialização
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   1. DADOS DOS MCs
   --------------------------------------------------------------------------
   • As fotos são recortes do pôster enviado (pasta /imagens).
   • Para trocar: substitua o arquivo em /imagens mantendo o nome, ou mude o
     caminho em `imagem`.
   • `cidade` está vazia porque não foi informada — preencha quando tiver
     (ex.: "Campinas - SP"). Vazia, o card mostra "Rep. SP".
   • Se uma foto não carregar, aparece um placeholder com as iniciais.
   -------------------------------------------------------------------------- */
const mcs = [
  { nome: 'Nathy',      cidade: '', imagem: 'imagens/nathy.jpg' },      // ← foto #01
  { nome: 'Dehatt',     cidade: '', imagem: 'imagens/dehatt.jpg' },     // ← foto #02
  { nome: 'Hayato',     cidade: '', imagem: 'imagens/hayato.jpg' },     // ← foto #03
  { nome: 'Arielzinha', cidade: '', imagem: 'imagens/arielzinha.jpg' }, // ← foto #04
  { nome: 'Dandara',    cidade: '', imagem: 'imagens/dandara.jpg' },    // ← foto #05
  { nome: 'Rxnnin',     cidade: '', imagem: 'imagens/rxnnin.jpg' },     // ← foto #06
  { nome: 'Big Mike',   cidade: '', imagem: 'imagens/big-mike.jpg' },   // ← foto #07
  { nome: 'Punka',      cidade: '', imagem: 'imagens/punka.jpg' },      // ← foto #08
  { nome: 'Stevan',     cidade: '', imagem: 'imagens/stevan.jpg' },     // ← foto #09
  { nome: 'Flowid',     cidade: '', imagem: 'imagens/flowid.jpg' },     // ← foto #10
  { nome: 'Cost',       cidade: '', imagem: 'imagens/cost.jpg' },       // ← foto #11
  { nome: 'Grafiteh',   cidade: '', imagem: 'imagens/grafiteh.jpg' },   // ← foto #12
  { nome: 'Lil Vi',     cidade: '', imagem: 'imagens/lil-vi.jpg' },     // ← foto #13
  { nome: 'Magrão',     cidade: '', imagem: 'imagens/magrao.jpg' },     // ← foto #14
  { nome: 'Jotapê',     cidade: '', imagem: 'imagens/jotape.jpg' },     // ← foto #15
  { nome: 'Levinsk',    cidade: '', imagem: 'imagens/levinsk.jpg' }     // ← foto #16
];
mcs.forEach((mc, i) => { mc.numero = String(i + 1).padStart(2, '0'); });

/* --------------------------------------------------------------------------
   2. CONFIGURAÇÃO
   -------------------------------------------------------------------------- */
const FASES = [
  { titulo: '1ª fase',   apelido: 'oitavas', mcs: 16 },
  { titulo: '2ª fase',   apelido: 'quartas', mcs: 8 },
  { titulo: 'Semifinal', apelido: 'semi',    mcs: 4 },
  { titulo: 'Final',     apelido: 'final',   mcs: 2 }
];
const ULTIMA = FASES.length - 1;
const REDUZIR_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MQ_ESPELHO = window.matchMedia('(min-width: 1100px)');
const CHAVE_PREFS = 'estadual-sp-prefs';

/* --------------------------------------------------------------------------
   3. ESTADO
   rodadas[r][m] = { a, b, vencedor } — a/b/vencedor são índices em `mcs`
   (null = vaga vazia).
   historico guarda "fotos" do estado para o desfazer.
   -------------------------------------------------------------------------- */
const estado = {
  tela: 'inicio',
  sorteado: false,
  sorteando: false,
  rodadas: [],
  campeao: null,
  historico: [],
  foco: null,          // { r, m } batalha que está no palco
  abaFase: null,       // aba escolhida na lista (null = segue a fase atual)
  som: true,
  // marcadores de animação, consumidos no próximo render
  animarEntrada: false,
  flash: null         // { r, m } resultado recém-definido
};

try {
  const prefs = JSON.parse(localStorage.getItem(CHAVE_PREFS) || '{}');
  if (typeof prefs.som === 'boolean') estado.som = prefs.som;
} catch (e) { /* sem armazenamento, segue com o padrão */ }

function salvarPrefs() {
  try { localStorage.setItem(CHAVE_PREFS, JSON.stringify({ som: estado.som })); } catch (e) { /* ok */ }
}

/* --------------------------------------------------------------------------
   4. UTILITÁRIOS
   -------------------------------------------------------------------------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const aleatorio = (min, max) => Math.random() * (max - min) + min;
/** pseudo-aleatório fixo por semente (mantém as inclinações estáveis entre renders) */
const semente = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };

function esc(txt) {
  return String(txt).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Fisher–Yates */
function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function placeholder(nome) {
  const iniciais = nome.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <rect width='100' height='100' fill='#1c1a18'/>
    <circle cx='30' cy='28' r='26' fill='#c13234' opacity='.55'/>
    <circle cx='78' cy='80' r='18' fill='#c13234' opacity='.35'/>
    <text x='50' y='62' text-anchor='middle' font-family='Impact,Arial Black,sans-serif' font-size='38' fill='#f1ebdf'>${iniciais}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** posição relativa a um ancestral, ignorando transforms */
function posicaoRelativa(el, ancestral) {
  let x = 0, y = 0, atual = el;
  while (atual && atual !== ancestral) { x += atual.offsetLeft; y += atual.offsetTop; atual = atual.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function confirmar(titulo, texto, rotuloSim = 'Confirmar') {
  const dlg = $('#confirmar');
  $('#confirmar-titulo').textContent = titulo;
  $('#confirmar-texto').textContent = texto;
  $('#confirmar-sim').textContent = rotuloSim;
  if (typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
  return new Promise((ok) => {
    dlg.returnValue = '';
    dlg.addEventListener('close', () => ok(dlg.returnValue === 'sim'), { once: true });
    dlg.showModal();
  });
}

const icone = (id, classe = '') => `<svg class="${classe}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* --------------------------------------------------------------------------
   5. SOM — Web Audio puro: estalo do sorteio, airhorn + torcida na vitória,
   chiado de spray no botão de sortear. Botão de som no topo liga/desliga.
   -------------------------------------------------------------------------- */
const Som = (() => {
  let ctx = null, saida = null, ruido = null, nodoSpray = null;

  function audio() {
    if (!estado.som) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      saida = ctx.createGain();
      saida.gain.value = 0.55;
      saida.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function envelope(g, t, pico, duracao) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  }
  function fonteRuido(t, duracao) {
    const s = ctx.createBufferSource();
    s.buffer = ruido; s.start(t); s.stop(t + duracao);
    return s;
  }
  function bumbo(t, forca = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    envelope(g, t, 0.95 * forca, 0.42);
    o.connect(g).connect(saida); o.start(t); o.stop(t + 0.45);
  }

  return {
    /** "scratch" curtinho quando um confronto trava no sorteio */
    estalo() {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      const n = fonteRuido(t, 0.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.09);
      f.frequency.exponentialRampToValueAtTime(1800, t + 0.2);
      envelope(g, t, 0.9, 0.24);
      n.connect(f).connect(g).connect(saida);
      bumbo(t, 0.7);
    },
    /** airhorn + torcida */
    vitoria(grande = false) {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      const toques = grande ? [0, 0.16, 0.32, 0.5] : [0, 0.16, 0.34];
      toques.forEach((d, i) => {
        const dur = i === toques.length - 1 ? 0.55 : 0.12;
        const f = c.createBiquadFilter(), g = c.createGain();
        f.type = 'lowpass'; f.frequency.value = 2400;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.02);
        g.gain.setValueAtTime(0.16, t + d + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + dur);
        f.connect(g).connect(saida);
        [466, 470, 700].forEach((hz) => {
          const o = c.createOscillator();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(hz * 0.94, t + d); o.frequency.linearRampToValueAtTime(hz, t + d + 0.04);
          o.connect(f); o.start(t + d); o.stop(t + d + dur);
        });
      });
      const dur = grande ? 3 : 1.8;
      const n = fonteRuido(t, 1), bp = c.createBiquadFilter(), gn = c.createGain();
      n.loop = true; n.stop(t + dur);
      bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.4;
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp).connect(gn).connect(saida);
    },
    /** "cleck" da bolinha dentro da lata (mais agudo conforme enche) */
    chocalho(p = 0) {
      const c = audio(); if (!c) return;
      const t = c.currentTime;
      const n = fonteRuido(t, 0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 2400 + p * 2200; f.Q.value = 8;
      envelope(g, t, 0.5, 0.045);
      n.connect(f).connect(g).connect(saida);
      const o = ctx.createOscillator(), go = ctx.createGain();
      o.frequency.value = 1700 + p * 900; envelope(go, t, 0.08, 0.03);
      o.connect(go).connect(saida); o.start(t); o.stop(t + 0.04);
    },
    /** chiado de lata de spray (enquanto segura o botão de sortear) */
    sprayLigar() {
      const c = audio(); if (!c || nodoSpray) return;
      const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      n.buffer = ruido; n.loop = true;
      f.type = 'highpass'; f.frequency.value = 3200;
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.08);
      n.connect(f).connect(g).connect(saida); n.start();
      nodoSpray = { n, g };
    },
    sprayDesligar() {
      if (!nodoSpray || !ctx) return;
      const { n, g } = nodoSpray;
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
      n.stop(ctx.currentTime + 0.15);
      nodoSpray = null;
    }
  };
})();

/* --------------------------------------------------------------------------
   6. REGRAS DO CAMPEONATO
   -------------------------------------------------------------------------- */
function criarChaveVazia() {
  estado.rodadas = FASES.map((f) =>
    Array.from({ length: f.mcs / 2 }, () => ({ a: null, b: null, vencedor: null }))
  );
  estado.campeao = null;
  estado.historico = [];
  estado.foco = null;
  estado.abaFase = null;
}

/** -1 antes do sorteio · 0–3 fase em andamento · 4 campeão definido */
function faseAtual() {
  if (!estado.sorteado) return -1;
  for (let r = 0; r <= ULTIMA; r++) if (estado.rodadas[r].some((j) => j.vencedor === null)) return r;
  return ULTIMA + 1;
}

function numeroBatalha(r, m) {
  let n = 0;
  for (let i = 0; i < r; i++) n += estado.rodadas[i].length;
  return String(n + m + 1).padStart(2, '0');
}

const destino = (r, m) => ({ r: r + 1, m: Math.floor(m / 2), lado: m % 2 === 0 ? 'a' : 'b' });
const jogoDe = (pos) => (pos ? estado.rodadas[pos.r]?.[pos.m] : null);
const completo = (j) => j && j.a !== null && j.b !== null;

/** Próxima batalha com os dois MCs definidos e sem vencedor. */
function proximoPendente() {
  for (let r = 0; r <= ULTIMA; r++) {
    for (let m = 0; m < estado.rodadas[r].length; m++) {
      const j = estado.rodadas[r][m];
      if (completo(j) && j.vencedor === null) return { r, m };
    }
  }
  return null;
}

/** Lista linear das batalhas jogáveis (para as setas ‹ › do palco). */
function batalhasJogaveis() {
  const lista = [];
  estado.rodadas.forEach((jogos, r) => jogos.forEach((j, m) => { if (completo(j)) lista.push({ r, m }); }));
  return lista;
}

/** Guarda uma cópia do estado antes de cada mudança (para o desfazer). */
function guardar(rotulo) {
  estado.historico.push({
    rotulo,
    rodadas: JSON.parse(JSON.stringify(estado.rodadas)),
    campeao: estado.campeao,
    foco: estado.foco ? { ...estado.foco } : null
  });
  if (estado.historico.length > 120) estado.historico.shift();
}

async function sortear() {
  if (estado.sorteando || estado.tela !== 'chave') return;
  if (estado.historico.length) {
    const ok = await confirmar('Refazer o sorteio?', 'Todos os resultados já registrados serão apagados e a chave será sorteada de novo.', 'Sortear de novo');
    if (!ok) return;
  }
  fecharCampeao();

  const ordem = embaralhar(mcs.map((_, i) => i));
  estado.sorteando = true;
  renderAcoes();

  await animacaoSorteio(ordem);

  criarChaveVazia();
  estado.rodadas[0].forEach((jogo, m) => { jogo.a = ordem[m * 2]; jogo.b = ordem[m * 2 + 1]; });
  estado.sorteado = true;
  estado.sorteando = false;
  estado.foco = { r: 0, m: 0 };
  estado.animarEntrada = true;
  render();
  anunciar('Sorteio concluído. Batalha 01 no palco.');
  $('#palco').scrollIntoView({ behavior: REDUZIR_MOVIMENTO ? 'auto' : 'smooth', block: 'start' });
}

/** Toque num MC do palco: ele vence a batalha e avança. */
function definirVencedor(r, m, lado) {
  const jogo = estado.rodadas[r]?.[m];
  if (!completo(jogo) || jogo.vencedor !== null) return;   // bloqueia 2ª seleção
  guardar(`vitória de ${mcs[jogo[lado]].nome}`);
  concluir(r, m, lado);
}

/** Fecha a batalha: vencedor avança (ou vira campeão). */
function concluir(r, m, lado) {
  const jogo = estado.rodadas[r][m];
  const vencedor = jogo[lado];
  const perdedor = lado === 'a' ? jogo.b : jogo.a;
  jogo.vencedor = vencedor;

  if (r < ULTIMA) {
    const d = destino(r, m);
    estado.rodadas[d.r][d.m][d.lado] = vencedor;
  } else {
    estado.campeao = vencedor;
  }

  estado.flash = { r, m };
  render();
  efeitoVitoria(r, m);
  Som.vitoria(r === ULTIMA);
  if (typeof Musica !== 'undefined') Musica.abaixar(r === ULTIMA ? 3.5 : 2);

  const n = mcs[vencedor].nome;
  const proxima = r < ULTIMA ? `avança pra ${FASES[r + 1].titulo.toLowerCase()}` : 'é o campeão';
  toast(`${n} ${proxima}`, { rotulo: 'Desfazer', acao: desfazer });
  anunciar(`${n} venceu ${mcs[perdedor].nome} e ${proxima}.`);

  const faseFechou = estado.rodadas[r].every((j) => j.vencedor !== null);
  if (estado.campeao !== null) {
    if (typeof Compartilhar !== 'undefined') Compartilhar.gerar();
    setTimeout(mostrarCampeao, REDUZIR_MOVIMENTO ? 0 : 1300);
  } else if (faseFechou) {
    setTimeout(() => mostrarBannerFase(r + 1), 900);
  }
}

/** Limpa o resultado de uma batalha e tudo que dependia dele. */
function limparBatalha(r, m) {
  const jogo = estado.rodadas[r][m];
  if (jogo.vencedor !== null) {
    if (r < ULTIMA) {
      const d = destino(r, m);
      const prox = estado.rodadas[d.r][d.m];
      if (prox.vencedor !== null) limparBatalha(d.r, d.m);
      prox[d.lado] = null;
    } else {
      estado.campeao = null;
    }
  }
  jogo.vencedor = null;
}

/** "corrigir": zera a batalha em foco (com cascata, se preciso). */
async function corrigir(r, m) {
  const jogo = estado.rodadas[r][m];
  if (jogo.vencedor === null) return;
  if (r < ULTIMA) {
    const d = destino(r, m);
    const prox = estado.rodadas[d.r][d.m];
    if (prox.vencedor !== null) {
      const ok = await confirmar('Corrigir em cascata?',
        `${mcs[jogo.vencedor].nome} já subiu ao palco na fase seguinte. Corrigir esta batalha apaga também o que veio depois.`,
        'Corrigir tudo');
      if (!ok) return;
    }
  }
  guardar(`correção da batalha ${numeroBatalha(r, m)}`);
  limparBatalha(r, m);
  estado.foco = { r, m };
  fecharCampeao();
  render();
  toast(`Batalha ${numeroBatalha(r, m)} voltou pra disputa`, { rotulo: 'Desfazer', acao: desfazer });
}

/** Desfaz a última ação (resultado ou correção). */
function desfazer() {
  const ultimo = estado.historico.pop();
  if (!ultimo) { toast('Nada pra desfazer'); return; }
  estado.rodadas = ultimo.rodadas;
  estado.campeao = ultimo.campeao;
  estado.foco = ultimo.foco;
  fecharCampeao();
  render();
  toast(`Desfeito: ${ultimo.rotulo}`);
}

function focar(r, m, rolar = true) {
  const jogo = estado.rodadas[r]?.[m];
  if (!completo(jogo)) { toast('Essa batalha ainda espera os vencedores'); return; }
  if (estado.foco && estado.foco.r === r && estado.foco.m === m && !rolar) return;
  estado.foco = { r, m };
  render();
  if (rolar) $('#palco').scrollIntoView({ behavior: REDUZIR_MOVIMENTO ? 'auto' : 'smooth', block: 'start' });
}

function irParaProxima() {
  const p = proximoPendente();
  if (!p) { if (estado.campeao !== null) mostrarCampeao(); return; }
  focar(p.r, p.m, false);
  const f = $('.faceoff');
  if (f && !REDUZIR_MOVIMENTO) f.animate([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' });
}

function navegar(delta) {
  const lista = batalhasJogaveis();
  const atual = focoAtual();
  const i = lista.findIndex((p) => p.r === atual.r && p.m === atual.m);
  const alvo = lista[i + delta];
  if (alvo) focar(alvo.r, alvo.m, false);
}

function focoAtual() {
  if (estado.foco && completo(jogoDe(estado.foco))) return estado.foco;
  return proximoPendente() || { r: ULTIMA, m: 0 };
}

async function reiniciar() {
  if (estado.sorteado) {
    const ok = await confirmar('Reiniciar campeonato?', 'O chaveamento e todos os resultados serão apagados.', 'Reiniciar');
    if (!ok) return;
  }
  fecharCampeao();
  Som.sprayDesligar();
  estado.tela = 'inicio';
  estado.sorteado = false;
  criarChaveVazia();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function iniciar() {
  if (estado.tela !== 'inicio') return;
  estado.tela = 'chave';
  estado.sorteado = false;
  criarChaveVazia();
  estado.animarEntrada = true;
  render();
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------------------
   7. RENDERIZAÇÃO
   -------------------------------------------------------------------------- */
function render() {
  document.body.dataset.tela = estado.tela;
  $('#tela-inicio').hidden = estado.tela !== 'inicio';
  $('#tela-chave').hidden = estado.tela !== 'chave';

  renderTrilha();
  renderAcoes();
  if (estado.tela === 'chave') {
    renderPalco();
    renderEspelho();
    renderLista();
    requestAnimationFrame(renderConexoes);
  }
  estado.animarEntrada = false;
  estado.flash = null;
}

/** 16 → 8 → 4 → 2 → troféu */
function renderTrilha() {
  const fase = estado.tela === 'chave' ? Math.max(faseAtual(), 0) : -1;
  $$('.trilha__passo').forEach((b) => {
    const passo = Number(b.dataset.passo);
    b.classList.toggle('atual', passo === fase);
    b.classList.toggle('feito', fase > passo);
    b.classList.toggle('ouro', passo === 4 && fase === 4);
    b.disabled = estado.tela !== 'chave' || !estado.sorteado;
    if (passo === fase) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}

function renderAcoes() {
  const naChave = estado.tela === 'chave';
  $('#btn-iniciar').hidden = naChave;
  $('#btn-sortear').hidden = !naChave;
  $('#btn-sortear').disabled = estado.sorteando;
  $('#btn-desfazer').disabled = !estado.historico.length || estado.sorteando;
  $('#btn-reiniciar').disabled = !naChave || estado.sorteando;
  const som = $('#btn-som');
  som.setAttribute('aria-pressed', String(estado.som));
  som.title = estado.som ? 'Som ligado' : 'Som desligado';
  som.innerHTML = icone(estado.som ? 'i-som' : 'i-mudo');
}

/* ---------- PALCO ---------- */
function renderPalco() {
  const palco = $('#palco');
  if (!estado.sorteado) { palco.innerHTML = htmlPalcoSorteio(); return; }

  const pos = focoAtual();
  estado.foco = pos;
  palco.innerHTML = htmlFaceoff(pos.r, pos.m);
}

function htmlPalcoSorteio() {
  // parede com os 16 lambes: foto, número e nome, cada um levemente torto
  const fotos = mcs.map((mc, i) => {
    const r = ((semente(i + 80) - .5) * 7).toFixed(1);
    const y = ((semente(i + 40) - .5) * 10).toFixed(0);
    return `<figure class="lambe" style="--r:${r}deg; --y:${y}px; --i:${i}">
        <span class="lambe__foto"><img src="${esc(mc.imagem)}" alt="" data-nome="${esc(mc.nome)}"></span>
        <span class="lambe__num">#${mc.numero}</span>
        <figcaption class="lambe__nome">${esc(mc.nome)}</figcaption>
      </figure>`;
  }).join('');
  return `
    <div class="palco-sorteio">
      <h2 class="palco-sorteio__titulo titulo-pincel"><span class="pincel-preto">Sorteio da</span> <span class="pincel-vermelho">1ª fase</span></h2>
      <p class="palco-sorteio__sub">16 MCs na parede. Segura o botão pra chacoalhar a lata e soltar os confrontos.</p>
      <div class="amontoado" id="amontoado" role="list" aria-label="Os 16 MCs do campeonato">${fotos}</div>
      <button class="btn-tinta btn-tinta--xl segurar" id="btn-segurar" type="button" aria-describedby="dica-segurar">
        <span class="segurar__txt">Sortear confrontos</span><span class="segurar__barra" aria-hidden="true"></span>
      </button>
      <p class="segurar__dica" id="dica-segurar">segura até encher · ou aperta Enter</p>
    </div>`;
}

function htmlLutador(jogo, lado) {
  const idx = jogo[lado];
  const mc = mcs[idx];
  const decidido = jogo.vencedor !== null;
  const venceu = decidido && jogo.vencedor === idx;
  const classes = ['lutador', `lutador--${lado}`];
  if (decidido) classes.push(venceu ? 'lutador--vencedor' : 'lutador--perdedor');

  return `
    <button class="${classes.join(' ')}" type="button" data-acao="vencer" data-lado="${lado}" ${decidido ? 'disabled' : ''}
      aria-label="${esc(decidido ? (venceu ? `${mc.nome} venceu` : `${mc.nome} eliminado`) : `${mc.nome} venceu a batalha`)}">
      <span class="lutador__moldura">
        <span class="lutador__foto"><img src="${esc(mc.imagem)}" alt="" data-nome="${esc(mc.nome)}"></span>
        <span class="lutador__num">#${mc.numero}</span>
        ${venceu ? icone('i-coroa', 'lutador__coroa') : ''}
        ${decidido && !venceu ? '<span class="lutador__fita">ELIMINADO</span>' : ''}
      </span>
      <span class="lutador__nome">${esc(mc.nome)}</span>
      <span class="lutador__cidade">${esc(mc.cidade || 'Rep. SP')}</span>
      ${decidido ? '' : `<span class="lutador__venceu">${esc(mc.nome)} venceu</span>`}
    </button>`;
}

function htmlFaceoff(r, m) {
  const jogo = estado.rodadas[r][m];
  const decidido = jogo.vencedor !== null;
  const lista = batalhasJogaveis();
  const i = lista.findIndex((p) => p.r === r && p.m === m);
  const flash = estado.flash && estado.flash.r === r && estado.flash.m === m;

  let centro;
  if (!decidido) {
    centro = `
      <span class="centro__vs" aria-hidden="true">VS</span>
      <p class="centro__instrucao">toca em quem <b>venceu</b></p>`;
  } else {
    const v = mcs[jogo.vencedor];
    const final = r === ULTIMA;
    const prox = proximoPendente();
    centro = `
      <div class="centro__resultado">
        <p class="centro__avanca">${esc(v.nome)} ${final ? 'é o campeão!' : 'avança!'}</p>
        ${final
          ? '<button class="btn-tinta btn-tinta--ouro" type="button" data-acao="compartilhar"><svg class="btn-icone" aria-hidden="true"><use href="#i-compartilhar"/></svg>Compartilhar</button><button class="btn-tinta btn-tinta--papel btn-tinta--peq" type="button" data-acao="ver-campeao">Ver campeão</button>'
          : prox ? '<button class="btn-tinta btn-tinta--peq" type="button" data-acao="proxima">Próxima batalha</button>' : ''}
        <button class="btn-giz" type="button" data-acao="corrigir">↩ desfazer resultado</button>
      </div>`;
  }

  return `
    <p class="palco__info">
      <button class="palco__nav palco__nav--ant" type="button" data-acao="anterior" aria-label="Batalha anterior" ${i <= 0 ? 'disabled' : ''}>${icone('i-seta')}</button>
      <span class="palco__batalha">Batalha ${numeroBatalha(r, m)}</span>
      <span class="palco__fase${r === ULTIMA ? ' palco__fase--final' : ''}">${r === ULTIMA ? 'Grande final' : `${FASES[r].titulo} · ${FASES[r].apelido}`}</span>
      <button class="palco__nav" type="button" data-acao="seguinte" aria-label="Batalha seguinte" ${i >= lista.length - 1 ? 'disabled' : ''}>${icone('i-seta')}</button>
    </p>
    <div class="faceoff${flash ? ' flash' : ''}" data-r="${r}" data-m="${m}">
      ${htmlLutador(jogo, 'a')}
      <div class="centro">${centro}</div>
      ${htmlLutador(jogo, 'b')}
    </div>
    <p class="palco__rodape atalhos"><kbd>←</kbd> <kbd>→</kbd> escolhe o vencedor · <kbd>Enter</kbd> próxima · <kbd>Ctrl Z</kbd> desfaz</p>`;
}

/* ---------- NÓ DO CHAVEAMENTO (usado no espelho e na lista) ---------- */
function htmlChip(jogo, lado, r) {
  const idx = jogo[lado];
  if (idx === null) {
    return `<span class="chip chip--vazio"><span class="chip__foto">?</span>
      <span class="chip__tira"><span class="chip__nome">${r === 0 ? 'a sortear' : 'aguardando'}</span></span></span>`;
  }
  const mc = mcs[idx];
  let classe = '';
  if (jogo.vencedor !== null) classe = jogo.vencedor === idx ? 'chip--vencedor' : 'chip--perdedor';
  return `<span class="chip ${classe}" data-mc="${idx}">
      <img class="chip__foto" src="${esc(mc.imagem)}" alt="" data-nome="${esc(mc.nome)}" loading="lazy">
      <span class="chip__tira"><span class="chip__nome">${esc(mc.nome)}</span></span>
    </span>`;
}

function htmlNo(r, m, indice, comDestino = false) {
  const jogo = estado.rodadas[r][m];
  const ok = completo(jogo);
  const decidido = jogo.vencedor !== null;
  const foco = estado.sorteado && estado.foco && estado.foco.r === r && estado.foco.m === m;
  const rot = ((semente(r * 10 + m + 3) - .5) * 3).toFixed(2);
  const classes = ['no'];
  if (r === ULTIMA) classes.push('no--final');
  if (!ok) classes.push('no--vazio');
  if (decidido) classes.push('no--decidido');
  if (foco) classes.push('no--foco');
  if (estado.animarEntrada) classes.push('entrar');
  if (estado.flash && estado.flash.r === r && estado.flash.m === m) classes.push('flash');

  const vivo = ok && !decidido
    ? '<span class="no__vivo"><span class="ponto-live" aria-hidden="true"></span>ao vivo</span>' : '';
  let destinoTxt = '';
  if (comDestino) {
    destinoTxt = r < ULTIMA
      ? `<span class="no__destino">vencedor → batalha ${numeroBatalha(destino(r, m).r, destino(r, m).m)}</span>`
      : '<span class="no__destino">vencedor leva a coroa</span>';
  }
  const rotulo = ok
    ? `Batalha ${numeroBatalha(r, m)}: ${mcs[jogo.a].nome} contra ${mcs[jogo.b].nome}${decidido ? `, venceu ${mcs[jogo.vencedor].nome}` : ''}. Levar pro palco.`
    : `Batalha ${numeroBatalha(r, m)}: aguardando.`;

  return `
    <button class="${classes.join(' ')}" type="button" data-acao="focar" data-r="${r}" data-m="${m}"
      style="--rot:${rot}deg; --i:${indice}" aria-label="${esc(rotulo)}">
      <span class="no__num">${r === ULTIMA ? 'final' : `#${numeroBatalha(r, m)}`}</span>${vivo}
      ${htmlChip(jogo, 'a', r)}
      <span class="no__vs" aria-hidden="true">vs</span>
      ${htmlChip(jogo, 'b', r)}
      ${destinoTxt}
    </button>`;
}

function htmlTrofeu() {
  if (estado.campeao === null) {
    return `<div class="trofeu">${icone('i-trofeu', 'trofeu__icone')}<span class="trofeu__titulo">a coroa espera</span></div>`;
  }
  const mc = mcs[estado.campeao];
  return `<button class="trofeu trofeu--definido" type="button" data-acao="ver-campeao" aria-label="Ver campeão: ${esc(mc.nome)}">
      ${icone('i-trofeu', 'trofeu__icone')}
      <img class="trofeu__foto" src="${esc(mc.imagem)}" alt="" data-nome="${esc(mc.nome)}">
      <span class="trofeu__nome">${esc(mc.nome)}</span>
      <span class="trofeu__titulo">campeão</span>
    </button>`;
}

/* ---------- CHAVE ESPELHADA (desktop) ----------
   Colunas: 1ª fase (esq) · 2ª · semi · FINAL · semi · 2ª · 1ª fase (dir) */
function renderEspelho() {
  const fase = faseAtual();
  const colunas = [[0, 'esq'], [1, 'esq'], [2, 'esq'], ['final'], [2, 'dir'], [1, 'dir'], [0, 'dir']];
  let indice = 0;
  const html = colunas.map(([r, lado]) => {
    if (r === 'final') {
      const cl = ['coluna', 'coluna--centro', fase === ULTIMA ? 'coluna--atual' : '', fase > ULTIMA ? 'coluna--feita' : ''].join(' ');
      return `<section class="${cl}" aria-label="Final">
          <header class="coluna__cab">Final</header>
          <div class="coluna__jogos"><div class="slot slot--final" id="slot-final">${htmlTrofeu()}${htmlNo(ULTIMA, 0, indice++)}</div></div>
        </section>`;
    }
    const total = estado.rodadas[r].length;
    const metade = total / 2;
    const ms = Array.from({ length: metade }, (_, k) => (lado === 'esq' ? k : metade + k));
    const cl = ['coluna', fase === r ? 'coluna--atual' : '', fase > r ? 'coluna--feita' : ''].join(' ');
    return `<section class="${cl}" aria-label="${FASES[r].titulo}, lado ${lado === 'esq' ? 'esquerdo' : 'direito'}">
        <header class="coluna__cab">${FASES[r].titulo}</header>
        <div class="coluna__jogos">${ms.map((m) => `<div class="slot">${htmlNo(r, m, indice++)}</div>`).join('')}</div>
      </section>`;
  }).join('');
  $('#espelho').innerHTML = html;
}

/** Linhas de marcador ligando cada batalha à próxima. */
function renderConexoes() {
  const wrap = $('#espelho-wrap');
  const svg = $('#conexoes');
  if (estado.tela !== 'chave' || !MQ_ESPELHO.matches) return;
  const W = wrap.offsetWidth, H = wrap.offsetHeight;
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const no = (r, m) => $(`.no[data-r="${r}"][data-m="${m}"]`, wrap);
  let paths = '';
  const linha = (d, jogo, novo, comp, ouro = false) => {
    const cl = ['cx'];
    if (jogo.vencedor !== null) cl.push('cx--ativo');
    if (ouro && jogo.vencedor !== null) cl.push('cx--ouro');
    if (novo) cl.push('cx--novo');
    const mc = jogo.vencedor !== null ? ` data-mc="${jogo.vencedor}"` : '';
    paths += `<path class="${cl.join(' ')}"${mc} d="${d}" style="--len:${comp}"/>`;
  };

  estado.rodadas.forEach((jogos, r) => {
    jogos.forEach((jogo, m) => {
      const origem = no(r, m);
      if (!origem) return;
      const p1 = posicaoRelativa(origem, wrap);
      const novo = $$('.no.flash', wrap).includes(origem);
      if (r === ULTIMA) { // final → troféu (sobe)
        const t = $('.trofeu', wrap);
        if (!t) return;
        const p2 = posicaoRelativa(t, wrap);
        const x = p1.x + p1.w / 2, y1 = p1.y + 12, y2 = p2.y + p2.h + 2;
        linha(`M${x} ${y1} C ${x - 6} ${(y1 + y2) / 2}, ${x + 6} ${(y1 + y2) / 2}, ${x} ${y2}`, jogo, novo, Math.abs(y1 - y2) + 10, true);
        return;
      }
      const d = destino(r, m);
      const alvo = no(d.r, d.m);
      if (!alvo) return;
      const p2 = posicaoRelativa(alvo, wrap);
      const ladoEsq = p1.x < p2.x;
      const x1 = ladoEsq ? p1.x + p1.w + 4 : p1.x - 4;
      const x2 = ladoEsq ? p2.x - 4 : p2.x + p2.w + 4;
      const y1 = p1.y + p1.h / 2 + 6;
      // chega na altura do chip correspondente (a = de cima, b = de baixo)
      const y2 = p2.y + (d.r === ULTIMA ? p2.h / 2 + 6 : (d.lado === 'a' ? p2.h * 0.36 : p2.h * 0.78));
      const xm = (x1 + x2) / 2 + (semente(r * 20 + m) - .5) * 6;
      const tremido = (semente(r * 31 + m * 7) - .5) * 4;
      const dd = `M${x1} ${y1} C ${xm + tremido} ${y1}, ${xm - tremido} ${y1}, ${xm} ${(y1 + y2) / 2} S ${xm + tremido} ${y2}, ${x2} ${y2}`;
      linha(dd, jogo, novo, Math.abs(x2 - x1) + Math.abs(y2 - y1) + 20);
    });
  });
  svg.innerHTML = paths;
}

/* ---------- LISTA POR FASE (tablet/celular) ---------- */
function renderLista() {
  const fase = faseAtual();
  const aba = estado.abaFase ?? Math.min(Math.max(fase, 0), ULTIMA);
  $('#lista-abas').innerHTML = FASES.map((f, r) => {
    const feitos = estado.rodadas[r].filter((j) => j.vencedor !== null).length;
    const tot = estado.rodadas[r].length;
    return `<button class="aba${r === fase ? ' aba--atual' : ''}" type="button" role="tab" data-aba="${r}"
        aria-selected="${r === aba}">${f.titulo}<small>${feitos}/${tot} feitas</small></button>`;
  }).join('');
  let indice = 0;
  let html = estado.rodadas[aba].map((_, m) => htmlNo(aba, m, indice++, true)).join('');
  if (aba === ULTIMA) html += `<div class="slot">${htmlTrofeuLista()}</div>`;
  $('#lista-jogos').innerHTML = html;
}

function htmlTrofeuLista() {
  if (estado.campeao === null) return '';
  const mc = mcs[estado.campeao];
  return `<button class="btn-tinta btn-tinta--ouro" type="button" data-acao="ver-campeao">Campeão: ${esc(mc.nome)}</button>`;
}

/* --------------------------------------------------------------------------
   8. EFEITOS
   -------------------------------------------------------------------------- */
function spray(x, y, { qtd = 22, raio = 80, cores = ['#c13234', '#e0574f', '#141212'] } = {}) {
  if (REDUZIR_MOVIMENTO) return;
  const camada = $('#efeitos');
  for (let i = 0; i < qtd; i++) {
    const gota = document.createElement('span');
    const ang = Math.random() * Math.PI * 2;
    const dist = aleatorio(raio * 0.25, raio);
    gota.className = 'gota-spray';
    gota.style.cssText = `left:${x}px; top:${y}px; --s:${aleatorio(2, 8).toFixed(1)}px;
      --dx:${(Math.cos(ang) * dist).toFixed(1)}px; --dy:${(Math.sin(ang) * dist).toFixed(1)}px;
      --c:${cores[i % cores.length]}; --t:${aleatorio(.45, .9).toFixed(2)}s;`;
    camada.append(gota);
    setTimeout(() => gota.remove(), 1000);
  }
}
function sprayNoElemento(el, opcoes) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  spray(r.left + r.width / 2, r.top + r.height / 2, opcoes);
}

function efeitoVitoria(r, m) {
  const final = r === ULTIMA;
  sprayNoElemento($('.lutador--vencedor .lutador__moldura'), { qtd: final ? 50 : 32, raio: final ? 200 : 130 });
  if (r < ULTIMA) {
    const d = destino(r, m);
    $$(`.no[data-r="${d.r}"][data-m="${d.m}"]`).forEach((no) => {
      $$('.chip', no)[d.lado === 'a' ? 0 : 1]?.classList.add('chegou');
    });
  }
  $('[data-acao="proxima"], [data-acao="ver-campeao"]', $('#palco'))?.focus({ preventScroll: true });
}

function mostrarBannerFase(r) {
  const f = FASES[r];
  const banner = $('#banner-fase');
  banner.innerHTML = `
    <div class="banner-fase__fundo"></div>
    <div class="banner-fase__txt">
      <span class="banner-fase__eyebrow">fase liberada!</span>
      <strong class="banner-fase__titulo">${r === ULTIMA ? 'GRANDE FINAL' : f.titulo.toUpperCase()}</strong>
      <span class="banner-fase__info">${f.mcs} MCs · ${f.mcs / 2} ${f.mcs > 2 ? 'CONFRONTOS' : 'CONFRONTO'}</span>
    </div>`;
  banner.classList.remove('mostrar');
  void banner.offsetWidth;
  banner.classList.add('mostrar');
  setTimeout(() => banner.classList.remove('mostrar'), 2000);
}

let toastTimer;
/** aviso rápido; `opcao` pode trazer um botão (ex.: Desfazer) */
function toast(msg, opcao) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (opcao) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = opcao.rotulo;
    b.addEventListener('click', () => { el.classList.remove('mostrar'); opcao.acao(); });
    el.append(b);
  }
  el.classList.add('mostrar');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('mostrar'), opcao ? 4200 : 2600);
}

function anunciar(msg) { $('#anuncio').textContent = msg; }

let confeteAnim = null;
function soltarConfete() {
  pararConfete();
  const canvas = $('#confete');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cores = ['#c13234', '#f4efe5', '#f2b92e', '#e0574f', '#ffffff'];
  const pecas = [];
  const rajada = (ox, dir, qtd) => {
    for (let i = 0; i < qtd; i++) {
      pecas.push({
        x: ox, y: H * 0.42,
        vx: dir === 0 ? aleatorio(-9, 9) : dir * aleatorio(4, 13), vy: aleatorio(-17, -6),
        w: aleatorio(6, 13), h: aleatorio(8, 16), rot: aleatorio(0, Math.PI), vr: aleatorio(-.25, .25),
        cor: cores[Math.floor(Math.random() * cores.length)], ponto: Math.random() < .3
      });
    }
  };
  const qtd = REDUZIR_MOVIMENTO ? 40 : 140;
  rajada(W / 2, 0, qtd);
  setTimeout(() => { rajada(0, 1, qtd / 2); rajada(W, -1, qtd / 2); }, 600);
  const inicio = performance.now();
  const quadro = (t) => {
    ctx.clearRect(0, 0, W, H);
    pecas.forEach((p) => {
      p.vy += 0.3; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.cor;
      if (p.ponto) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.6, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)) + 2);
      ctx.restore();
    });
    if (t - inicio < 7000) confeteAnim = requestAnimationFrame(quadro); else ctx.clearRect(0, 0, W, H);
  };
  confeteAnim = requestAnimationFrame(quadro);
}
function pararConfete() {
  if (confeteAnim) cancelAnimationFrame(confeteAnim);
  confeteAnim = null;
  const c = $('#confete');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

/* --------------------------------------------------------------------------
   9. SORTEIO AO VIVO — os confrontos giram e travam um a um
   -------------------------------------------------------------------------- */
function animacaoSorteio(ordem) {
  return new Promise((concluirSorteio) => {
    const overlay = $('#sorteio');
    const grade = $('#sorteio-grade');
    const status = $('#sorteio-status');
    const btnPular = $('#sorteio-pular');
    const btnVer = $('#sorteio-ver');

    grade.innerHTML = Array.from({ length: 8 }, (_, m) => `
      <div class="duelo" style="--i:${m}; --rot:${((semente(m + 7) - .5) * 5).toFixed(1)}deg; --dy:${((semente(m + 19) - .5) * 14).toFixed(0)}px">
        <span class="duelo__num">batalha ${String(m + 1).padStart(2, '0')}</span>
        <div class="duelo__mc"><img alt=""><span></span></div>
        <span class="duelo__vs">vs</span>
        <div class="duelo__mc"><img alt=""><span></span></div>
      </div>`).join('');

    const duelos = $$('.duelo', grade);
    const pintar = (duelo, ia, ib) => {
      const [ma, mb] = $$('.duelo__mc', duelo);
      [[ma, ia], [mb, ib]].forEach(([el, i]) => {
        const img = $('img', el);
        img.src = mcs[i].imagem; img.dataset.nome = mcs[i].nome;
        $('span', el).textContent = mcs[i].nome;
      });
    };
    const girar = () => duelos.forEach((d) => {
      if (d.classList.contains('travado')) return;
      const [ia, ib] = embaralhar(mcs.map((_, i) => i));
      pintar(d, ia, ib);
    });

    girar();
    overlay.hidden = false;
    document.body.classList.add('travado');
    btnVer.hidden = true; btnPular.hidden = false;
    status.textContent = 'embaralhando os 16 MCs…';

    let travados = 0;
    const timers = [];
    const giro = setInterval(girar, 90);

    const finalizar = () => {
      clearInterval(giro);
      status.textContent = '8 confrontos na parede. Que comece a batalha!';
      btnPular.hidden = true; btnVer.hidden = false;
      btnVer.focus();
    };
    const travar = (m) => {
      const d = duelos[m];
      if (d.classList.contains('travado')) return;
      pintar(d, ordem[m * 2], ordem[m * 2 + 1]);
      d.classList.add('travado');
      sprayNoElemento($('.duelo__vs', d), { qtd: 14, raio: 60 });
      Som.estalo();
      travados++;
      status.textContent = `${mcs[ordem[m * 2]].nome} × ${mcs[ordem[m * 2 + 1]].nome}`;
      if (travados === 8) finalizar();
    };

    const base = REDUZIR_MOVIMENTO ? 0 : 1200;
    const passo = REDUZIR_MOVIMENTO ? 0 : 420;
    for (let m = 0; m < 8; m++) timers.push(setTimeout(() => travar(m), base + m * passo));

    btnPular.onclick = () => { timers.forEach(clearTimeout); for (let m = 0; m < 8; m++) travar(m); };
    btnVer.onclick = () => {
      overlay.hidden = true;
      document.body.classList.remove('travado');
      concluirSorteio();
    };
  });
}

/** Botão "segura pra sortear": enquanto segura, a lata chacoalha, os 16 lambes tremem cada
    vez mais e são puxados pro centro; quando enche, explodem pra fora e o sorteio começa. */
function ligarSegurar(btn) {
  const DURACAO = 1500;
  let inicio = 0, raf = null, ultimoSpray = 0, ultimoClack = 0;
  const amontoado = $('#amontoado');
  const txt = $('.segurar__txt', btn);
  const textoBase = txt ? txt.textContent : '';
  const mirar = () => {   // vetor de cada lambe até o centro da parede
    if (!amontoado) return;
    const c = amontoado.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    $$('.lambe', amontoado).forEach((l) => {
      const r = l.getBoundingClientRect();
      l.style.setProperty('--dx', (cx - (r.left + r.width / 2)).toFixed(0) + 'px');
      l.style.setProperty('--dy', (cy - (r.top + r.height / 2)).toFixed(0) + 'px');
    });
  };
  const atualizar = (t) => {
    const p = Math.min(1, (t - inicio) / DURACAO);
    btn.style.setProperty('--p', p);
    amontoado?.style.setProperty('--p', p.toFixed(3));
    if (txt) txt.textContent = p < 1 ? `chacoalhando… ${Math.round(p * 100)}%` : 'SOLTOU!';
    if (t - ultimoClack > 190 - p * 130) { Som.chocalho(p); ultimoClack = t; }
    if (t - ultimoSpray > 70) {
      const r = btn.getBoundingClientRect();
      spray(r.left + r.width * p, r.top + r.height / 2, { qtd: 3 + Math.round(p * 6), raio: 40 + p * 40 });
      ultimoSpray = t;
    }
    if (p >= 1) { soltar(true); return; }
    raf = requestAnimationFrame(atualizar);
  };
  const apertar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (btn.classList.contains('estourou')) return;
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    mirar();
    inicio = performance.now();
    amontoado?.classList.remove('voltando');
    amontoado?.classList.add('agitando');
    btn.classList.add('segurando');
    Som.sprayLigar();
    raf = requestAnimationFrame(atualizar);
  };
  const soltar = (completo = false) => {
    cancelAnimationFrame(raf); raf = null;
    Som.sprayDesligar();
    btn.classList.remove('segurando');
    if (completo === true) {
      btn.style.setProperty('--p', 1); btn.classList.add('estourou');
      amontoado?.classList.remove('agitando');
      amontoado?.classList.add('explodiu');
      if (amontoado) { const c = amontoado.getBoundingClientRect(); spray(c.left + c.width / 2, c.top + c.height / 2, { qtd: 70, raio: 260 }); }
      Som.estalo();
      setTimeout(sortear, REDUZIR_MOVIMENTO ? 0 : 520);
    } else {
      btn.style.setProperty('--p', 0);
      if (txt) txt.textContent = textoBase;
      amontoado?.classList.remove('agitando');
      amontoado?.classList.add('voltando');
      amontoado?.style.setProperty('--p', 0);
    }
  };
  btn.addEventListener('pointerdown', apertar);
  btn.addEventListener('pointerup', () => raf && soltar(false));
  btn.addEventListener('pointercancel', () => raf && soltar(false));
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortear(); } });
  btn.addEventListener('click', (e) => e.preventDefault());
}

/* --------------------------------------------------------------------------
   10. TELA DO CAMPEÃO
   -------------------------------------------------------------------------- */
function mostrarCampeao() {
  if (estado.campeao === null) return;
  const c = estado.campeao;
  const mc = mcs[c];

  const caminho = estado.rodadas.map((jogos, r) => {
    const jogo = jogos.find((j) => j.vencedor === c);
    if (!jogo) return '';
    const adv = mcs[jogo.a === c ? jogo.b : jogo.a].nome;
    return `<li><small>${FASES[r].titulo}</small> <b>${esc(adv)}</b></li>`;
  }).join('');

  const img = $('#campeao-img');
  img.src = mc.imagem; img.alt = `Foto de ${mc.nome}, campeão`; img.dataset.nome = mc.nome;
  $('#campeao-num').textContent = `#${mc.numero}`;
  $('#campeao-nome').textContent = mc.nome;
  $('#campeao-texto').textContent = `${mc.nome} venceu o Estadual SP 2026 de Batalha de MCs!`;
  $('#campeao-caminho').innerHTML = caminho;

  $('#toast').classList.remove('mostrar');   // não cobre o botão de compartilhar
  const overlay = $('#campeao');
  overlay.hidden = false;
  overlay.scrollTop = 0;
  document.body.classList.add('travado');
  soltarConfete();
  Som.vitoria(true);
  if (typeof Musica !== 'undefined') Musica.abaixar(3.5);
  if (typeof Compartilhar !== 'undefined' && !$('#compartilhar-img').src) Compartilhar.gerar();   // arte para as redes (compartilhar.js)
  setTimeout(() => sprayNoElemento($('.campeao__foto'), { qtd: 60, raio: 220, cores: ['#f2b92e', '#c13234', '#f4efe5'] }), 700);
  setTimeout(() => $('#campeao-fechar').focus({ preventScroll: true }), 400);
  anunciar(`${mc.nome} é o campeão do Estadual SP 2026!`);
}

function fecharCampeao() {
  const overlay = $('#campeao');
  if (overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove('travado');
  pararConfete();
}

/* --------------------------------------------------------------------------
   11. EVENTOS E INICIALIZAÇÃO
   -------------------------------------------------------------------------- */
function montarTelaInicial() {
  const fotos = [];
  for (let i = 0; i < 48; i++) {
    const mc = mcs[i % mcs.length];
    fotos.push(`<img src="${esc(mc.imagem)}" alt="" data-nome="${esc(mc.nome)}" style="--r:${((semente(i) - .5) * 9).toFixed(1)}deg; --y:${((semente(i + 99) - .5) * 14).toFixed(0)}px">`);
  }
  $('#parede-lambes').innerHTML = fotos.join('');
  const nomes = mcs.map((mc) => `<span>${esc(mc.nome.toUpperCase())}</span>`).join('');
  $('#faixa-trilho').innerHTML = nomes + nomes;
}

/** Parede pichada: palavras de rua soltas, em marcador, atrás de tudo. */
function montarParedeTags() {
  const palavras = ['RIMA', 'SP', 'FREESTYLE', 'CPBMC', 'ZN', 'ZL', 'ZS', 'ZO', '011', 'FLOW', 'MIC', 'BATALHA',
    'CORRE', 'VERSO', 'RUA', 'CENA', 'TÁ FORA', 'BOOM BAP', 'PUNCH', 'LADO A', 'SEM CAÔ', 'VIVÃO', 'FITA', 'QUEBRADA'];
  const cores = ['var(--tinta)', 'var(--tinta)', 'var(--vermelho)', 'var(--vermelho)', 'var(--neon-ciano)', 'var(--neon-rosa)', 'var(--neon-roxo)', 'var(--neon-verde)', 'var(--ouro)'];
  const html = [];
  for (let i = 0; i < 46; i++) {
    const p = palavras[Math.floor(semente(i + 300) * palavras.length)];
    const c = cores[Math.floor(semente(i + 500) * cores.length)];
    const estilo = semente(i + 700);
    const classe = estilo < .3 ? 'oco' : estilo < .45 ? 'sombra' : '';
    html.push(`<span class="${classe}" style="--x:${(semente(i + 100) * 96).toFixed(1)}%; --y:${(semente(i + 200) * 96).toFixed(1)}%;
      --t:${(18 + semente(i + 400) * 46).toFixed(0)}px; --r:${((semente(i + 600) - .5) * 34).toFixed(0)}deg;
      --k:${((semente(i + 800) - .5) * 24).toFixed(0)}deg; --c:${c}; --o:${(.1 + semente(i + 900) * .16).toFixed(2)}">${p}</span>`);
  }
  $('#parede-tags').innerHTML = html.join('');
}

/** destaca o caminho de um MC no chaveamento espelhado */
function destacarCaminho(idx) {
  const esp = $('#espelho'), svg = $('#conexoes');
  const ativo = idx !== null;
  esp.classList.toggle('mostrando-caminho', ativo);
  svg.classList.toggle('mostrando-caminho', ativo);
  $$('.chip.caminho', esp).forEach((c) => c.classList.remove('caminho'));
  $$('.cx.caminho', svg).forEach((c) => c.classList.remove('caminho'));
  if (!ativo) return;
  $$(`.chip[data-mc="${idx}"]`, esp).forEach((c) => c.classList.add('caminho'));
  $$(`.cx[data-mc="${idx}"]`, svg).forEach((c) => c.classList.add('caminho'));
}

function ligarEventos() {
  $('#btn-iniciar').addEventListener('click', iniciar);
  $('#cta-iniciar').addEventListener('click', iniciar);
  $('#btn-sortear').addEventListener('click', sortear);
  $('#btn-desfazer').addEventListener('click', desfazer);
  $('#btn-reiniciar').addEventListener('click', reiniciar);
  $('#btn-som').addEventListener('click', () => {
    estado.som = !estado.som;
    if (!estado.som) Som.sprayDesligar();
    salvarPrefs(); renderAcoes();
    toast(estado.som ? 'Som ligado' : 'Som desligado');
  });
  $('#campeao-fechar').addEventListener('click', () => { fecharCampeao(); $('#mural').scrollIntoView({ behavior: 'smooth' }); });
  $('#campeao-novo').addEventListener('click', async () => { fecharCampeao(); await reiniciar(); });
  $('#marca').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // trilha: pula para a fase
  $('#trilha').addEventListener('click', (e) => {
    const b = e.target.closest('.trilha__passo');
    if (!b || b.disabled) return;
    const passo = Number(b.dataset.passo);
    if (passo === 4) { if (estado.campeao !== null) mostrarCampeao(); else toast('A coroa ainda não tem dono'); return; }
    estado.abaFase = passo;
    renderLista();
    $('#mural').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // palco (delegação)
  const palco = $('#palco');
  palco.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-acao]');
    if (!alvo) return;
    const pos = focoAtual();
    switch (alvo.dataset.acao) {
      case 'vencer': definirVencedor(pos.r, pos.m, alvo.dataset.lado); break;
      case 'proxima': irParaProxima(); break;
      case 'corrigir': corrigir(pos.r, pos.m); break;
      case 'ver-campeao': mostrarCampeao(); break;
      case 'compartilhar': if (typeof Compartilhar !== 'undefined') Compartilhar.compartilhar(); break;
      case 'anterior': navegar(-1); break;
      case 'seguinte': navegar(1); break;
    }
  });
  // chave espelhada + lista (delegação)
  ['#espelho', '#lista'].forEach((sel) => {
    $(sel).addEventListener('click', (e) => {
      const aba = e.target.closest('[data-aba]');
      if (aba) { estado.abaFase = Number(aba.dataset.aba); renderLista(); return; }
      const alvo = e.target.closest('[data-acao]');
      if (!alvo) return;
      if (alvo.dataset.acao === 'focar') focar(Number(alvo.dataset.r), Number(alvo.dataset.m));
      if (alvo.dataset.acao === 'ver-campeao') mostrarCampeao();
    });
  });
  $('#espelho').addEventListener('mouseover', (e) => {
    const chip = e.target.closest('.chip[data-mc]');
    destacarCaminho(chip ? Number(chip.dataset.mc) : null);
  });
  $('#espelho').addEventListener('mouseleave', () => destacarCaminho(null));

  // atalhos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#campeao').hidden) { fecharCampeao(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && estado.tela === 'chave') { e.preventDefault(); desfazer(); return; }
    if (estado.tela !== 'chave' || !estado.sorteado || estado.sorteando) return;
    if (!$('#campeao').hidden || $('#confirmar').open) return;
    if (e.target.closest('input, textarea, select')) return;
    const pos = focoAtual();
    const jogo = jogoDe(pos);
    if (e.key === 'ArrowLeft' && jogo.vencedor === null) { e.preventDefault(); definirVencedor(pos.r, pos.m, 'a'); }
    if (e.key === 'ArrowRight' && jogo.vencedor === null) { e.preventDefault(); definirVencedor(pos.r, pos.m, 'b'); }
    if (e.key === 'Enter' && jogo.vencedor !== null && !e.target.closest('button')) { e.preventDefault(); irParaProxima(); }
  });

  // botão de segurar é recriado a cada render do palco → liga via observer simples
  new MutationObserver(() => {
    const b = $('#btn-segurar');
    if (b && !b.dataset.ligado) { b.dataset.ligado = '1'; ligarSegurar(b); }
  }).observe(palco, { childList: true });

  // fallback de imagem
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.dataset.nome && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = placeholder(img.dataset.nome);
    }
  }, true);

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderConexoes, 120); });
  MQ_ESPELHO.addEventListener?.('change', () => requestAnimationFrame(renderConexoes));
  document.fonts?.ready.then(renderConexoes);
}

function preCarregarFotos() { mcs.forEach((mc) => { const i = new Image(); i.src = mc.imagem; }); }

criarChaveVazia();
montarParedeTags();
montarTelaInicial();
ligarEventos();
preCarregarFotos();
render();
