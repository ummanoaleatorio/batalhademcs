/* ==========================================================================
   ESTADUAL DE SP — BEAT DE FUNDO (boom bap clássico)
   Gerado pelo próprio navegador (Web Audio), sem arquivo de música:
   • bateria na frente: bumbo gordo + caixa estalada com ambiência de sala,
     chimbal metálico, swing de MPC — o "boom… bap" clássico;
   • piano escuro em ré menor picotado, baixo acústico, chiado de vinil.
   O loop de 8 compassos é renderizado UMA vez (OfflineAudioContext) com
   saturação e compressão na bateria, e depois toca em loop sem falhas.

   • Começa no primeiro clique/toque no site (o navegador exige).
   • Botão "Beat" no topo liga/desliga (a escolha fica salva).
   • Abaixa sozinho na buzina da vitória; pausa com a aba em segundo plano.
   ========================================================================== */
'use strict';

const Musica = (() => {
  const VOLUME = 0.42;        // volume do beat no site (0 a 1) — aumente para deixar mais alto
  const COMPASSOS = 8;
  const TAXA = 44100;
  const CHAVE = 'estadual-sp-musica';

  const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const colcheias = (forte, fraco) => ({ 0: forte, 2: fraco, 4: forte, 6: fraco, 8: forte, 10: fraco, 12: forte, 14: fraco });

  /* Estilos de beat (todos boom bap / rap, originais). Cada round do simulador usa um. */
  const ESTILOS = {
    classico: {
      nome: 'Clássico', bpm: 90, swing: .2, sat: 2.4, bits: 10, disco: 3200,
      acordes: [
        { piano: [50, 53, 57, 60, 64], baixo: 38 }, { piano: [50, 53, 55, 58, 62], baixo: 43 },
        { piano: [50, 53, 57, 58, 62], baixo: 46 }, { piano: [49, 52, 55, 58, 61], baixo: 45 }
      ],
      bumboA: { 0: 1, 7: .75, 10: .95 }, bumboB: { 0: 1, 3: .5, 7: .75, 8: .9, 10: .6 },
      caixa: { 4: 1, 12: 1 }, chimbal: colcheias(.9, .55), abertos: {},
      piano: { 0: [1, 5.5], 6: [.7, 2], 11: [.6, 3] }, baixo: { 0: [0, 4], 7: [0, 2], 10: [7, 2], 14: [12, 2] }
    },
    jazz: {
      nome: 'Jazz da Praça', bpm: 86, swing: .26, sat: 1.8, bits: 12, disco: 4300,
      acordes: [
        { piano: [53, 57, 60, 64, 67], baixo: 41 }, { piano: [52, 55, 59, 62, 64], baixo: 40 },
        { piano: [50, 53, 57, 60, 64], baixo: 38 }, { piano: [53, 55, 59, 62, 65], baixo: 43 }
      ],
      bumboA: { 0: 1, 10: .85 }, bumboB: { 0: 1, 6: .45, 10: .85, 13: .4 },
      caixa: { 4: 1, 12: 1 }, chimbal: colcheias(.75, .5), abertos: { 14: true },
      piano: { 0: [1, 3], 3: [.6, 2], 8: [.9, 3], 14: [.5, 2] }, baixo: { 0: [0, 3], 3: [7, 1], 8: [0, 3], 12: [5, 2] }
    },
    sujo: {
      nome: 'Porão Sujo', bpm: 94, swing: .12, sat: 3.4, bits: 8, disco: 2600,
      acordes: [
        { piano: [45, 48, 52, 57], baixo: 33 }, { piano: [45, 48, 52, 57], baixo: 33 },
        { piano: [41, 45, 48, 53], baixo: 29 }, { piano: [40, 44, 47, 52], baixo: 28 }
      ],
      bumboA: { 0: 1, 3: .7, 8: .9, 10: .8, 11: .5 }, bumboB: { 0: 1, 2: .6, 7: .8, 10: 1 },
      caixa: { 4: 1, 12: 1, 14: .3 },
      chimbal: { 0: .9, 1: .3, 2: .6, 3: .3, 4: .9, 5: .3, 6: .6, 7: .3, 8: .9, 9: .3, 10: .6, 11: .3, 12: .9, 13: .3, 14: .6, 15: .35 }, abertos: {},
      piano: { 0: [1, 1], 3: [.7, 1], 6: [.8, 1], 10: [.9, 2] }, baixo: { 0: [0, 3], 3: [0, 1], 8: [0, 2], 10: [0, 2], 11: [12, 1] }
    },
    pesado: {
      nome: 'Pesadão', bpm: 76, swing: .18, sat: 2.8, bits: 9, disco: 2400,
      acordes: [
        { piano: [53, 56, 60, 63], baixo: 41 }, { piano: [49, 53, 56, 61], baixo: 37 },
        { piano: [46, 49, 53, 58], baixo: 34 }, { piano: [48, 52, 55, 60], baixo: 36 }
      ],
      bumboA: { 0: 1, 10: .8, 14: .55 }, bumboB: { 0: 1, 5: .5, 11: .9 },
      caixa: { 8: 1 }, chimbal: colcheias(.8, .45), abertos: { 6: true },
      piano: { 0: [1, 7] }, baixo: { 0: [0, 6], 10: [0, 3], 14: [12, 2] }
    }
  };
  /* variações de andamento (mesmos instrumentos, outro tempo) para os beats do simulador */
  ESTILOS.rapido = { ...ESTILOS.classico, nome: 'Clássico acelerado', bpm: 98, swing: .14, sat: 2.9 };
  ESTILOS.turbo = { ...ESTILOS.sujo, nome: 'Porão turbo', bpm: 102, swing: .08 };
  ESTILOS.lento = { ...ESTILOS.jazz, nome: 'Jazz lento', bpm: 72, swing: .3 };
  ESTILOS.arrastado = { ...ESTILOS.pesado, nome: 'Pesadão arrastado', bpm: 68 };

  let ctx = null, ganho = null, fonte = null;
  let tocando = false, ligado = true;
  try { const v = localStorage.getItem(CHAVE); if (v !== null) ligado = v === '1'; } catch (e) { /* ok */ }

  /* ======================================================================
     RENDERIZAÇÃO DO LOOP
     ====================================================================== */
  function curva(k) {
    const n = 4096, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }
  function curvaBits(bits) {
    const n = 4096, c = new Float32Array(n), q = Math.pow(2, bits - 1);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = Math.round(x * q) / q; }
    return c;
  }

  /** grava um som curto uma vez (como um sample na MPC) para reaproveitar no loop */
  function amostra(dur, desenhar) {
    const oc = new OfflineAudioContext(1, Math.ceil(dur * TAXA), TAXA);
    const ruido = oc.createBuffer(1, Math.ceil(dur * TAXA) + TAXA, TAXA);
    { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const kit = {
      oc,
      ruido: (t, d, destino) => { const s = oc.createBufferSource(); s.buffer = ruido; s.connect(destino); s.start(t, Math.random() * .5); s.stop(t + d); },
      env: (g, t, pico, ataque, fim) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pico, t + ataque);
        g.gain.exponentialRampToValueAtTime(0.0001, t + fim);
      }
    };
    desenhar(kit, oc.destination);
    return oc.startRendering();
  }

  /* ---------- os "samples" ---------- */
  const somBumbo = () => amostra(.5, ({ oc, ruido, env }, out) => {
    // corpo: queda rápida de 150 → 58 Hz e cauda gorda
    const o = oc.createOscillator(), g = oc.createGain();
    o.frequency.setValueAtTime(150, 0);
    o.frequency.exponentialRampToValueAtTime(58, .045);
    o.frequency.exponentialRampToValueAtTime(48, .35);
    env(g, 0, 1.25, .003, .42);
    o.connect(g).connect(out); o.start(0); o.stop(.45);
    // "knock" de pele
    const k = oc.createOscillator(), gk = oc.createGain();
    k.type = 'triangle'; k.frequency.setValueAtTime(240, 0); k.frequency.exponentialRampToValueAtTime(110, .03);
    env(gk, 0, .55, .001, .06);
    k.connect(gk).connect(out); k.start(0); k.stop(.07);
    // batedor
    const f = oc.createBiquadFilter(), gn = oc.createGain();
    f.type = 'highpass'; f.frequency.value = 3500; env(gn, 0, .35, .0005, .012);
    ruido(0, .02, f); f.connect(gn).connect(out);
  });

  const somCaixa = () => amostra(.6, ({ oc, ruido, env }, out) => {
    // sala curta (ambiência de estúdio) gravada junto com a caixa
    const sala = oc.createConvolver();
    { const n = Math.floor(TAXA * .4), ir = oc.createBuffer(1, n, TAXA), d = ir.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * (i < 220 ? i / 220 : 1);
      sala.buffer = ir; }
    const sf = oc.createBiquadFilter(), sg = oc.createGain();
    sf.type = 'bandpass'; sf.frequency.value = 1500; sf.Q.value = .5; sg.gain.value = .55;
    sala.connect(sf).connect(sg).connect(out);
    // esteira
    const f = oc.createBiquadFilter(), f2 = oc.createBiquadFilter(), g = oc.createGain();
    f.type = 'highpass'; f.frequency.value = 900; f2.type = 'peaking'; f2.frequency.value = 2400; f2.gain.value = 6;
    env(g, 0, .95, .001, .24);
    ruido(0, .3, f); f.connect(f2).connect(g); g.connect(out); g.connect(sala);
    // corpo (pele)
    [[185, .7], [330, .35]].forEach(([hz, vol]) => {
      const o = oc.createOscillator(), go = oc.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(hz * 1.25, 0); o.frequency.exponentialRampToValueAtTime(hz, .025);
      env(go, 0, vol, .001, .13);
      o.connect(go); go.connect(out); go.connect(sala); o.start(0); o.stop(.15);
    });
    // estalo
    const fc = oc.createBiquadFilter(), gc = oc.createGain();
    fc.type = 'highpass'; fc.frequency.value = 5000; env(gc, 0, .6, .0005, .02);
    ruido(0, .03, fc); fc.connect(gc).connect(out);
  });

  // chimbal metálico: 6 osciladores quadrados inarmônicos (técnica das baterias eletrônicas clássicas)
  const somChimbal = (aberto) => amostra(aberto ? .34 : .08, ({ oc, ruido, env }, out) => {
    const bp = oc.createBiquadFilter(), hp = oc.createBiquadFilter(), g = oc.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = .8;
    hp.type = 'highpass'; hp.frequency.value = 7000;
    env(g, 0, aberto ? .3 : .4, .001, aberto ? .3 : .045);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach((r) => { const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = 40 * r; o.connect(bp); o.start(0); o.stop(aberto ? .32 : .06); });
    const gn = oc.createGain(); gn.gain.value = .35; ruido(0, aberto ? .32 : .06, gn); gn.connect(hp);
    bp.connect(hp).connect(g).connect(out);
  });

  // acorde de piano (harmônicos com leve inarmonicidade de corda, agudos somem antes)
  const somAcorde = (notas) => amostra(1.2, ({ oc, ruido, env }, out) => {
    notas.forEach((nota, idx) => {
      const t = idx * .008, f0 = MIDI(nota), dur = 1.15;
      const g = oc.createGain(); g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(.2, t + .005);
      g.gain.exponentialRampToValueAtTime(.07, t + .25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (let h = 1; h <= 9; h++) {
        const o = oc.createOscillator(), go = oc.createGain();
        o.frequency.value = f0 * h * Math.sqrt(1 + .0004 * h * h);
        const amp = 1 / Math.pow(h, 1.25) * (h === 1 ? .8 : 1);
        go.gain.setValueAtTime(amp, t);
        go.gain.exponentialRampToValueAtTime(amp * .02 + 1e-4, t + Math.max(.12, dur / (1 + h * .7)));
        o.connect(go).connect(g); o.start(t); o.stop(t + dur);
      }
      const fm = oc.createBiquadFilter(), gm = oc.createGain();
      fm.type = 'bandpass'; fm.frequency.value = Math.min(f0 * 6, 6000); fm.Q.value = 1.5;
      env(gm, t, .08, .0005, .03); ruido(t, .04, fm); fm.connect(gm).connect(out);
    });
  });

  async function renderizar(id = 'classico') {
    const E = ESTILOS[id] || ESTILOS.classico;
    const semi = 60 / E.bpm / 4;
    const duracao = semi * 16 * COMPASSOS;

    // 1) grava os samples (em paralelo)
    const [kick, snare, hat, hatAberto, ...acordes] = await Promise.all([
      somBumbo(), somCaixa(), somChimbal(false), somChimbal(true), ...E.acordes.map((a) => somAcorde(a.piano))
    ]);

    // 2) sequencia o loop usando os samples
    const oc = new OfflineAudioContext(2, Math.ceil(duracao * TAXA), TAXA);
    const ruido = oc.createBuffer(1, TAXA * 2, TAXA);
    { const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const fonteRuido = (t, dur, destino) => { const s = oc.createBufferSource(); s.buffer = ruido; s.connect(destino); s.start(t, Math.random()); s.stop(t + dur); };

    // barramentos
    const master = oc.createGain();
    const masterComp = oc.createDynamicsCompressor();
    masterComp.threshold.value = -10; masterComp.ratio.value = 4; masterComp.attack.value = .01; masterComp.release.value = .2;
    master.connect(masterComp).connect(oc.destination);

    // bateria: saturação forte + compressão que deixa o ataque passar (o "soco")
    const bateria = oc.createGain();
    const satBat = oc.createWaveShaper(); satBat.curve = curva(E.sat); satBat.oversample = '2x';
    const compBat = oc.createDynamicsCompressor();
    compBat.threshold.value = -16; compBat.knee.value = 2; compBat.ratio.value = 6; compBat.attack.value = .012; compBat.release.value = .09;
    const ganhoBat = oc.createGain(); ganhoBat.gain.value = 1.15;
    bateria.connect(satBat).connect(compBat).connect(ganhoBat).connect(master);

    // piano "sampleado": 10 bits, sem brilho, sem grave (o grave é do baixo)
    const sample = oc.createGain(); sample.gain.value = .9;
    const bits = oc.createWaveShaper(); bits.curve = curvaBits(E.bits);
    const disco = oc.createBiquadFilter(); disco.type = 'lowpass'; disco.frequency.value = E.disco; disco.Q.value = .7;
    const graveCorte = oc.createBiquadFilter(); graveCorte.type = 'highpass'; graveCorte.frequency.value = 140;
    sample.connect(bits).connect(disco).connect(graveCorte).connect(master);

    const disparar = (buf, t, vol, destino, dur) => {
      const s = oc.createBufferSource(), g = oc.createGain();
      s.buffer = buf; g.gain.value = vol;
      if (dur) { g.gain.setValueAtTime(vol, t + dur - .015); g.gain.linearRampToValueAtTime(0, t + dur); }   // corte seco de sampler
      s.connect(g).connect(destino); s.start(t); if (dur) s.stop(t + dur + .01);
    };
    function baixo(t, nota, v, dur) {
      const lp = oc.createBiquadFilter(), g = oc.createGain();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + .15);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(.5 * v, t + .006);
      g.gain.exponentialRampToValueAtTime(.2 * v, t + .2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      lp.connect(g).connect(master);
      [['triangle', 0, 1], ['sine', -1200, .7]].forEach(([tipo, det, vol]) => {
        const o = oc.createOscillator(), go = oc.createGain();
        o.type = tipo; o.frequency.value = MIDI(nota); o.detune.value = det; go.gain.value = vol;
        o.connect(go).connect(lp); o.start(t); o.stop(t + dur + .02);
      });
    }
    // chiado e estalos de vinil
    { const f = oc.createBiquadFilter(), g = oc.createGain();
      f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = .5; g.gain.value = .02;
      { const s = oc.createBufferSource(); s.buffer = ruido; s.loop = true; s.connect(f); s.start(0); s.stop(duracao); }
      f.connect(g).connect(master);
      for (let t = 0; t < duracao; t += .05 + Math.random() * .25) {
        const gp = oc.createGain();
        gp.gain.setValueAtTime(0.0001, t); gp.gain.exponentialRampToValueAtTime(.04 + Math.random() * .1, t + .0003); gp.gain.exponentialRampToValueAtTime(0.0001, t + .006);
        fonteRuido(t, .008, gp); gp.connect(master);
      } }

    // arranjo (padrões do estilo)
    for (let c = 0; c < COMPASSOS; c++) {
      const ac = E.acordes[c % E.acordes.length], somAc = acordes[c % E.acordes.length];
      const ultimo = c === COMPASSOS - 1;
      const bumboPadrao = c % 2 ? E.bumboB : E.bumboA;
      for (let p = 0; p < 16; p++) {
        const swing = p % 2 ? semi * E.swing : 0;
        const t = (c * 16 + p) * semi + swing;
        if (bumboPadrao[p] && !(ultimo && p > 10)) disparar(kick, t, bumboPadrao[p], bateria);
        if (E.caixa[p]) disparar(snare, t, E.caixa[p], bateria);
        if (E.chimbal[p]) disparar(E.abertos[p] || (ultimo && p === 14) ? hatAberto : hat, t, E.chimbal[p] * (.85 + Math.random() * .3), bateria);
        if (c % 4 === 3 && p === 15) disparar(snare, t, .35, bateria);       // caixa fantasma
        if (E.piano[p]) disparar(somAc, t, E.piano[p][0] * .22, sample, semi * E.piano[p][1]);
        if (E.baixo[p] && !(ultimo && p >= 12)) baixo(t, ac.baixo + E.baixo[p][0], 1, semi * E.baixo[p][1]);
      }
      if (ultimo) {   // virada de caixa
        disparar(snare, (c * 16 + 13) * semi, .55, bateria);
        disparar(snare, (c * 16 + 14) * semi + semi * .2, .7, bateria);
        disparar(snare, (c * 16 + 15) * semi, .9, bateria);
      }
    }

    const buf = await oc.startRendering();
    // normaliza o pico em 0.95
    let pico = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) pico = Math.max(pico, Math.abs(d[i])); }
    const k = .95 / (pico || 1);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
    return buf;
  }

  /* ======================================================================
     TOCAR / PARAR
     ====================================================================== */
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !window.OfflineAudioContext) return null;
      ctx = new AC();
      ganho = ctx.createGain(); ganho.gain.value = VOLUME;
      ganho.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  let estiloAtual = 'classico', inicioLoop = 0;
  const buffers = {}, renders = {};
  /* Os loops já vêm gravados em beats/<estilo>.mp3 (feitos com o próprio renderizar() abaixo).
     Carregar o arquivo é muito mais leve que montar o som na hora — principalmente no celular.
     Se o arquivo não carregar (ex.: página aberta direto do disco), cai no renderizar() ao vivo. */
  /** amostra (a 44,1 kHz) do 1º som forte de cada loop gravado — medido ao exportar os MP3 */
  const ATAQUE = { arrastado: 678, classico: 812, jazz: 1153, lento: 1154, pesado: 683, rapido: 817, sujo: 677, turbo: 679 };
  const decodificar = (dados) => new Promise((ok, erro) => {
    const r = ctx.decodeAudioData(dados, ok, erro);
    if (r && r.then) r.then(ok, erro);
  });
  async function carregarArquivo(id) {
    const resp = await fetch(`${document.documentElement.dataset.raiz || ''}beats/${id}.mp3`);
    if (!resp.ok) throw new Error('sem arquivo');
    const buf = await decodificar(await resp.arrayBuffer());
    const E = ESTILOS[id], sr = buf.sampleRate;
    const tam = Math.round(60 / E.bpm / 4 * 16 * COMPASSOS * sr);   // tamanho exato do loop
    // o MP3 pode trazer um silêncio no começo (atraso do codificador, varia por navegador):
    // acha o 1º golpe forte do bumbo e volta até onde ele estava no loop original (ATAQUE, em amostras a 44,1 kHz)
    const d0 = buf.getChannelData(0), d1 = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
    let k = 0; const lim = Math.min(d0.length, Math.round(sr * .25));
    while (k < lim && Math.abs(d0[k]) < .2 && Math.abs(d1[k]) < .2) k++;
    let ini = k - Math.round((ATAQUE[id] || 0) * sr / 44100);
    if (k >= lim || ini < 0 || ini + tam > buf.length) ini = 0;
    return { buf, ini: ini / sr, fim: Math.min(buf.length, ini + tam) / sr };
  }
  /** carrega (uma vez) e guarda o loop de um estilo */
  function preparar(id) {
    if (!audio()) return Promise.resolve(null);
    if (!renders[id]) {
      renders[id] = carregarArquivo(id)
        .catch(() => renderizar(id).then((buf) => ({ buf, ini: 0, fim: buf.duration })))
        .then((l) => (buffers[id] = l));
    }
    return renders[id];
  }

  function apagar(f, seg = .4) {
    if (!f) return;
    const t = ctx.currentTime;
    f.g.gain.cancelScheduledValues(t);
    f.g.gain.setValueAtTime(f.g.gain.value, t);
    f.g.gain.linearRampToValueAtTime(0.0001, t + seg);
    f.src.stop(t + seg + .05);
  }

  /** começa o loop do estilo atual; devolve o instante (performance.now) da 1ª batida */
  async function iniciarFonte() {
    const id = estiloAtual;
    try { await preparar(id); } catch (e) { return null; }
    if (!tocando || id !== estiloAtual || !buffers[id]) return null;
    apagar(fonte);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    const L = buffers[id];
    src.buffer = L.buf; src.loop = true; src.loopStart = L.ini; src.loopEnd = L.fim;
    src.connect(g).connect(ganho);
    const t = ctx.currentTime + .06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + .35);
    src.start(t, L.ini);
    fonte = { src, g };
    inicioLoop = t;
    const lat = ctx.outputLatency || ctx.baseLatency || 0;
    return performance.now() + (t - ctx.currentTime + lat) * 1000;
  }

  async function tocar() {
    const c = audio(); if (!c || tocando) return null;
    tocando = true; pintarBotao();
    const r = await iniciarFonte();
    if (r === null && !fonte) { tocando = false; pintarBotao(); }
    return r;
  }

  function parar() {
    if (!tocando) return;
    tocando = false; pintarBotao();
    apagar(fonte); fonte = null;
  }

  /** troca o beat (reinicia do começo). Se a pessoa desligou o beat, só guarda a escolha. */
  async function trocarEstilo(id) {
    if (!ESTILOS[id]) return null;
    estiloAtual = id;
    if (!tocando) return null;
    return iniciarFonte();
  }

  /** abaixa o beat por alguns segundos (buzina da vitória) */
  function abaixar(segundos = 2.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    ganho.gain.cancelScheduledValues(t);
    ganho.gain.setValueAtTime(ganho.gain.value, t);
    ganho.gain.linearRampToValueAtTime(VOLUME * .25, t + .15);
    ganho.gain.setValueAtTime(VOLUME * .25, t + segundos);
    ganho.gain.linearRampToValueAtTime(VOLUME, t + segundos + 1);
  }

  function alternar() {
    ligado = !tocando;
    try { localStorage.setItem(CHAVE, ligado ? '1' : '0'); } catch (e) { /* ok */ }
    ligado ? tocar() : parar();
  }

  function pintarBotao() {
    const b = document.getElementById('btn-musica');
    if (!b) return;
    b.setAttribute('aria-pressed', String(tocando));
    b.title = tocando ? 'Pausar o beat' : 'Tocar o beat';
    b.classList.toggle('tocando', tocando);
  }

  function iniciar() {
    pintarBotao();
    document.getElementById('btn-musica')?.addEventListener('click', (e) => { e.stopPropagation(); alternar(); });
    const primeiro = (e) => {
      if (e.target.closest?.('#btn-musica')) return;
      if (ligado && !tocando) tocar();
      ['pointerdown', 'keydown'].forEach((ev) => document.removeEventListener(ev, primeiro, true));
    };
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, primeiro, true));
    let pausadoPorAba = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && tocando) { parar(); pausadoPorAba = true; }
      else if (!document.hidden && pausadoPorAba && ligado) { pausadoPorAba = false; tocar(); }
    });
  }

  return {
    iniciar, tocar, parar, alternar, abaixar, renderizar, preparar, trocarEstilo, ESTILOS,
    get tocando() { return tocando; }, get ligado() { return ligado; }, get estilo() { return estiloAtual; }
  };
})();

Musica.iniciar();
