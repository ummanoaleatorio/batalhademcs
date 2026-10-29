/* ==========================================================================
   ESTADUAL DE SP — COMPARTILHAR O CAMPEÃO
   Monta uma arte (canvas, 1080×1350 — serve pra feed, stories, status e
   qualquer rede) com o campeão e o vice da final.
   Um botão só: "Compartilhar" abre a lista de apps do aparelho com a imagem
   e a legenda. Onde o navegador não tem essa lista, baixa a imagem e copia
   a legenda pra colar na rede que quiser.
   Usa as variáveis globais do script.js: estado, mcs, FASES, ULTIMA, $, $$, toast.
   ========================================================================== */
'use strict';

const Compartilhar = (() => {
  // aparecem só na imagem (a legenda fica limpa)
  const VAQUINHA_CURTA = 'abacashi.com/vaquinha/final-estadual-sao-paulo-2026---cpbmc';

  /* posições da arte (px no tamanho final da imagem) */
  const FORMATOS = {
    feed: { w: 1080, h: 1350, rotulo: 250, fonteRotulo: 60, lado: 420, cy: 548, nomeGap: 140, nomeMax: 170, finalGap: 86, caminhoGap: 74, fonteCaminho: 32, rodape: 250 }
  };
  const COR = {
    fundo: '#d6d1c7', tinta: '#141212', papel: '#f4efe5', vermelho: '#c13234',
    ouro: '#f2b92e', ciano: '#22b8cc', rosa: '#ff4f8b', roxo: '#8a4fff', verde: '#3fbf5f', cinza: '#6b645b'
  };

  const formato = 'feed';
  let blobAtual = null;
  let pronta = null;   // promessa da geração em andamento
  let usarEmbutidas = false;
  let geracao = 0;

  /* ---------- dados do resultado ---------- */
  function resultado() {
    const c = estado.campeao;
    if (c === null) return null;
    const final = estado.rodadas[ULTIMA][0];
    const vice = final.a === c ? final.b : final.a;
    const caminho = estado.rodadas.slice(0, ULTIMA).map((jogos, r) => {
      const j = jogos.find((x) => x.vencedor === c);
      return j ? { fase: FASES[r].apelido, adv: mcs[j.a === c ? j.b : j.a].nome } : null;
    }).filter(Boolean);
    return { campeao: mcs[c], vice: mcs[vice], caminho };
  }

  function urlDaPagina() {
    return /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '';
  }

  function legenda() {
    const r = resultado();
    if (!r) return '';
    const url = urlDaPagina();
    const linhas = [
      `🏆 No meu chaveamento do Estadual SP 2026 de Batalha de MCs, ${r.campeao.nome} levou a coroa!`,
      `Venceu ${r.vice.nome} na grande final.`
    ];
    if (url) linhas.push('', `Monte o seu: ${url}`);
    return linhas.join('\n');
  }

  /* ---------- carregar imagens ---------- */
  function carregarScriptEmbutidas() {
    if (window.FOTOS_EMBUTIDAS) return Promise.resolve();
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'imagens/fotos-embutidas.js';
      s.onload = ok; s.onerror = falha;
      document.head.append(s);
    });
  }

  function carregar(src) {
    const real = usarEmbutidas && window.FOTOS_EMBUTIDAS?.[src] ? window.FOTOS_EMBUTIDAS[src] : src;
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      img.src = real;
    });
  }

  /* ---------- helpers de desenho ---------- */
  const rnd = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };

  /** contorno de papel rasgado em volta de um retângulo */
  function caminhoRasgado(ctx, x, y, w, h, dente = 7, semente = 1) {
    ctx.beginPath();
    const passo = 34;
    let i = 0;
    ctx.moveTo(x, y);
    for (let px = x; px <= x + w; px += passo) ctx.lineTo(px, y + (rnd(semente + i++) - .5) * dente);
    for (let py = y; py <= y + h; py += passo) ctx.lineTo(x + w + (rnd(semente + i++) - .5) * dente, py);
    for (let px = x + w; px >= x; px -= passo) ctx.lineTo(px, y + h + (rnd(semente + i++) - .5) * dente);
    for (let py = y + h; py >= y; py -= passo) ctx.lineTo(x + (rnd(semente + i++) - .5) * dente, py);
    ctx.closePath();
  }

  /** pincelada (faixa irregular) atrás de um texto */
  function pincelada(ctx, x, y, w, h, cor, semente = 3) {
    ctx.save();
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x, y + h * .2);
    for (let k = 0; k <= 10; k++) ctx.lineTo(x + (w * k) / 10, y + (rnd(semente + k) - .5) * h * .25);
    ctx.lineTo(x + w + 8, y + h * .5);
    for (let k = 10; k >= 0; k--) ctx.lineTo(x + (w * k) / 10, y + h + (rnd(semente + 20 + k) - .5) * h * .25);
    ctx.lineTo(x - 8, y + h * .55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** texto com camadas de contorno (estilo adesivo) */
  function textoAdesivo(ctx, txt, x, y, { fonte, preenchimento = COR.papel, contorno = COR.tinta, espessura = 10, camadas = [] }) {
    ctx.save();
    ctx.font = fonte;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    camadas.forEach(([dx, dy, cor]) => {
      ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.lineWidth = espessura;
      ctx.strokeText(txt, x + dx, y + dy); ctx.fillText(txt, x + dx, y + dy);
    });
    ctx.strokeStyle = contorno; ctx.lineWidth = espessura;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = preenchimento;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  /** maior fonte que cabe na largura */
  function ajustarFonte(ctx, txt, familia, max, min, largura) {
    let t = max;
    ctx.font = `${t}px ${familia}`;
    while (t > min && ctx.measureText(txt).width > largura) { t -= 4; ctx.font = `${t}px ${familia}`; }
    return t;
  }

  function estrela(ctx, x, y, r, cor, rot = 0) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = cor; ctx.lineWidth = r * .14; ctx.lineJoin = 'round';
    for (let v = 0; v < 2; v++) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5 + v * .06;
        const rr = (i % 2 ? r * .45 : r) * (1 - v * .08);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.globalAlpha = v ? .6 : 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function coroa(ctx, x, y, w, rot) {
    const h = w * .44;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    const pts = [[-.475, .43], [-.4, -.23], [-.175, .2], [0, -.4], [.175, .2], [.4, -.23], [.475, .43]];
    const desenhar = (dx, dy, cor) => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, px * w + dx, py * h * 1.6 + dy));
      ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = w * .07; ctx.strokeStyle = cor; ctx.stroke();
    };
    desenhar(5, 5, COR.tinta);
    desenhar(0, 0, COR.ouro);
    ctx.restore();
  }

  function fotoRedonda(ctx, img, x, y, r, { borda = COR.tinta, cinza = false, nome = '' } = {}) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = COR.papel; ctx.fill();
    ctx.clip();
    if (cinza) ctx.filter = 'grayscale(1) contrast(1.1)';
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else iniciais(ctx, nome, x, y, r);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = r * .1; ctx.strokeStyle = borda; ctx.stroke();
  }

  function iniciais(ctx, nome, x, y, r) {
    ctx.fillStyle = COR.tinta; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = COR.papel; ctx.font = `${r}px Anton, Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nome.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase(), x, y);
  }

  /* ---------- a arte ---------- */
  async function desenhar(fmt) {
    const L = FORMATOS[fmt];
    const { w: W, h: H } = L;
    const r = resultado();
    const story = fmt === 'story';
    await Promise.all([
      document.fonts?.load('100px Anton'),
      document.fonts?.load('100px "Permanent Marker"'),
      document.fonts?.load('600 40px "Barlow Condensed"')
    ].filter(Boolean)).catch(() => {});
    const [foto, fotoVice, logo, respingo] = await Promise.all([
      carregar(r.campeao.imagem), carregar(r.vice.imagem), carregar('imagens/cpbmc-logo.png'), carregar('imagens/respingo.svg')
    ]);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // parede de concreto + grade de blocos
    ctx.fillStyle = COR.fundo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(20,18,18,.06)';
    for (let i = 0; i < 2600; i++) ctx.fillRect(rnd(i) * W, rnd(i + 9000) * H, 2, 2);
    ctx.strokeStyle = 'rgba(20,18,18,.1)'; ctx.lineWidth = 2;
    for (let y = 240; y < H; y += 240) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // tags apagadas ao fundo
    const palavras = ['RIMA', '011', 'CORRE', 'ZN', 'ZL', 'FLOW', 'MIC', 'VERSO', 'CENA', 'SEM CAÔ', 'BOOM BAP', 'QUEBRADA', 'PUNCH', 'SP'];
    const coresTag = [COR.tinta, COR.vermelho, COR.ciano, COR.rosa, COR.roxo, COR.verde, COR.ouro];
    for (let i = 0; i < (story ? 34 : 26); i++) {
      ctx.save();
      ctx.translate(rnd(i + 50) * W, rnd(i + 150) * H);
      ctx.rotate((rnd(i + 250) - .5) * .6);
      ctx.globalAlpha = .1 + rnd(i + 350) * .12;
      ctx.font = `${40 + rnd(i + 450) * 70}px "Permanent Marker", cursive`;
      const cor = coresTag[Math.floor(rnd(i + 550) * coresTag.length)];
      if (rnd(i + 650) < .35) { ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.strokeText(palavras[i % palavras.length], 0, 0); }
      else { ctx.fillStyle = cor; ctx.fillText(palavras[i % palavras.length], 0, 0); }
      ctx.restore();
    }

    // faixa preta do topo
    const topoH = 170;
    ctx.fillStyle = COR.tinta;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, topoH);
    for (let k = 20; k >= 0; k--) ctx.lineTo((W * k) / 20, topoH + (rnd(k + 77) - .5) * 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = COR.vermelho; ctx.fillRect(0, topoH + 6, W, 8);
    // selo da logo
    ctx.save(); ctx.translate(110, 86); ctx.rotate(-.14);
    ctx.beginPath(); ctx.arc(4, 5, 62, 0, Math.PI * 2); ctx.fillStyle = COR.vermelho; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fillStyle = COR.papel; ctx.fill();
    if (logo) ctx.drawImage(logo, -42, -40, 84, 80);
    ctx.restore();
    ctx.fillStyle = COR.papel; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '70px Anton, Impact, sans-serif';
    ctx.fillText('ESTADUAL', 205, 102);
    const larguraEst = ctx.measureText('ESTADUAL').width;
    pincelada(ctx, 205 + larguraEst + 14, 40, 96, 72, COR.vermelho, 9);
    ctx.fillStyle = COR.papel; ctx.fillText('SP', 205 + larguraEst + 30, 102);
    // ano em marcador, ao lado do SP
    ctx.save(); ctx.translate(205 + larguraEst + 132, 96); ctx.rotate(-.12);
    ctx.font = '54px "Permanent Marker", cursive'; ctx.textAlign = 'left';
    ctx.fillStyle = COR.ciano; ctx.fillText('2026', -3, -3);
    ctx.fillStyle = COR.ouro; ctx.fillText('2026', 0, 0);
    ctx.restore();
    ctx.font = '600 30px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#b9b1a6';
    ctx.fillText('BATALHA DE MCs · CPBMC', 207, 142);

    // "meu campeão"
    ctx.save(); ctx.translate(W / 2, L.rotulo); ctx.rotate(-.05);
    ctx.font = `${L.fonteRotulo}px "Permanent Marker", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = COR.tinta; ctx.fillText('MEU CAMPEÃO', 4, 4);
    ctx.fillStyle = COR.vermelho; ctx.fillText('MEU CAMPEÃO', 0, 0);
    ctx.restore();

    // respingo + foto do campeão
    const lado = L.lado;
    const cx = W / 2, cy = L.cy;
    if (respingo) {
      ctx.save(); ctx.translate(cx, cy + 20); ctx.rotate(-.08);
      ctx.drawImage(respingo, -lado * 1.05, -lado * .62, lado * 2.1, lado * 1.18);
      ctx.restore();
    }
    estrela(ctx, cx - lado * .78, cy - lado * .38, 40, COR.tinta, -.3);
    estrela(ctx, cx + lado * .8, cy + lado * .3, 32, COR.ciano, .4);
    estrela(ctx, cx + lado * .7, cy - lado * .52, 24, COR.rosa, -.2);

    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-.045);
    const m = lado / 2;
    // camadas neon atrás da moldura
    ctx.fillStyle = COR.ciano; caminhoRasgado(ctx, -m - 12, -m - 10, lado, lado, 10, 5); ctx.fill();
    ctx.fillStyle = COR.ouro; caminhoRasgado(ctx, -m + 14, -m + 14, lado, lado, 10, 8); ctx.fill();
    ctx.fillStyle = COR.tinta; caminhoRasgado(ctx, -m + 6, -m + 6, lado, lado, 10, 11); ctx.fill();
    ctx.fillStyle = COR.papel; caminhoRasgado(ctx, -m, -m, lado, lado, 10, 2); ctx.fill();
    ctx.save();
    caminhoRasgado(ctx, -m + 18, -m + 18, lado - 36, lado - 36, 6, 4); ctx.clip();
    if (foto) ctx.drawImage(foto, -m + 18, -m + 18, lado - 36, lado - 36);
    else iniciais(ctx, r.campeao.nome, 0, 0, m - 18);
    ctx.restore();
    // número
    ctx.beginPath(); ctx.arc(m - 16 + 5, -m + 16 + 6, 52, 0, Math.PI * 2); ctx.fillStyle = COR.tinta; ctx.fill();
    ctx.beginPath(); ctx.arc(m - 16, -m + 16, 52, 0, Math.PI * 2); ctx.fillStyle = COR.vermelho; ctx.fill();
    ctx.fillStyle = COR.papel; ctx.font = '44px Anton, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`#${r.campeao.numero}`, m - 16, -m + 18);
    ctx.restore();
    coroa(ctx, cx - lado * .2, cy - lado / 2 - 30, lado * .34, -.16);

    // nome do campeão
    const yNome = cy + lado / 2 + L.nomeGap;
    const nomeTxt = r.campeao.nome.toUpperCase();
    const tNome = ajustarFonte(ctx, nomeTxt, 'Anton, Impact, sans-serif', L.nomeMax, 90, W - 140);
    textoAdesivo(ctx, nomeTxt, W / 2, yNome, {
      fonte: `${tNome}px Anton, Impact, sans-serif`, espessura: 14,
      camadas: [[-8, -6, COR.ciano], [10, 10, COR.tinta], [17, 17, COR.ouro]]
    });

    // final: campeão × vice
    const yFinal = yNome + L.finalGap;
    ctx.save();
    ctx.translate(W / 2, yFinal); ctx.rotate(-.02);
    ctx.font = '600 40px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txtFinal = `venceu ${r.vice.nome.toUpperCase()} na grande final`;
    ctx.font = `600 ${story ? 44 : 38}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    const largFinal = ctx.measureText(txtFinal).width + 150;
    pincelada(ctx, -largFinal / 2, -38, largFinal, 76, COR.tinta, 31);
    fotoRedonda(ctx, fotoVice, -largFinal / 2 + 6, 0, 46, { borda: COR.vermelho, cinza: true, nome: r.vice.nome });
    ctx.fillStyle = COR.papel;
    ctx.fillText(txtFinal, 40, 2);
    ctx.restore();

    // caminho até a coroa
    if (r.caminho.length) {
      const yCam = yFinal + L.caminhoGap;
      const txtCam = r.caminho.map((c) => `${c.fase}: ${c.adv}`).join('  ·  ');
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ajustarFonte(ctx, txtCam, '"Permanent Marker", cursive', L.fonteCaminho, 20, W - 100);
      ctx.fillStyle = COR.tinta;
      ctx.fillText(txtCam, W / 2, yCam);
    }

    // rodapé preto
    const rodapeH = L.rodape;
    const yR = H - rodapeH;
    ctx.fillStyle = COR.tinta;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, yR);
    for (let k = 20; k >= 0; k--) ctx.lineTo((W * k) / 20, yR + (rnd(k + 33) - .5) * 18);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(W / 2, yR + 88); ctx.rotate(-.04);
    ctx.font = '70px "Permanent Marker", cursive'; ctx.textAlign = 'center';
    // marcador limpo: texto creme, "..." vermelho e um traço vermelho embaixo
    const base = 'O corre continua', pts = '...';
    const lb = ctx.measureText(base).width, lp = ctx.measureText(pts).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = COR.papel; ctx.fillText(base, -(lb + lp) / 2, 0);
    ctx.fillStyle = '#e0574f'; ctx.fillText(pts, -(lb + lp) / 2 + lb, 0);
    ctx.strokeStyle = COR.vermelho; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath();
    const x0 = -(lb + lp) / 2, x1 = (lb + lp) / 2;
    ctx.moveTo(x0, 22);
    ctx.bezierCurveTo(x0 + (x1 - x0) * .3, 12, x0 + (x1 - x0) * .6, 32, x1, 16);
    ctx.stroke();
    ctx.restore();
    // apoio + créditos (só na imagem)
    ctx.textAlign = 'center';
    const txtApoio = `APOIE O CPBMC → ${VAQUINHA_CURTA}`;
    ajustarFonte(ctx, txtApoio, '"Barlow Condensed", "Arial Narrow", sans-serif', 32, 16, W - 90);
    ctx.font = ctx.font.replace(/^(\d+px)/, '600 $1');
    ctx.fillStyle = COR.ouro;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';   // separa os hífens do link
    ctx.fillText(txtApoio, W / 2, yR + 150);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#b9b1a6';
    ctx.font = '600 30px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillText('organização @cpbmc  ✕  artes @osuporteline', W / 2, yR + 200);
    return cv;
  }

  function paraBlob(cv) {
    return new Promise((ok, falha) => {
      try { cv.toBlob((b) => (b ? ok(b) : falha(new Error('vazio'))), 'image/png'); }
      catch (e) { falha(e); }
    });
  }

  /** gera a arte; se o navegador bloquear a exportação (site aberto do disco), usa a cópia embutida */
  function gerar() {
    pronta = gerarAgora();
    return pronta;
  }

  async function gerarAgora() {
    if (estado.campeao === null) return;
    const minha = ++geracao;
    const status = $('#compartilhar-status');
    const prev = $('#compartilhar-img');
    status.textContent = 'montando a arte…';
    prev.classList.add('carregando');
    blobAtual = null;
    try {
      let cv = await desenhar(formato);
      let blob;
      try { blob = await paraBlob(cv); }
      catch (e) {
        usarEmbutidas = true;
        await carregarScriptEmbutidas();
        cv = await desenhar(formato);
        blob = await paraBlob(cv);
      }
      if (minha !== geracao) return;
      blobAtual = blob;
      if (prev.dataset.url) URL.revokeObjectURL(prev.dataset.url);
      prev.dataset.url = URL.createObjectURL(blob);
      prev.src = prev.dataset.url;
      const r = resultado();
      prev.alt = `Arte: ${r.campeao.nome} campeão do Estadual SP 2026, venceu ${r.vice.nome} na final`;
      status.textContent = 'arte pronta · serve pra qualquer rede';
    } catch (e) {
      if (minha !== geracao) return;
      status.textContent = 'não deu pra montar a arte neste navegador';
    } finally {
      if (minha === geracao) prev.classList.remove('carregando');
      atualizarBotoes();
    }
  }

  function nomeArquivo() {
    const r = resultado();
    const slug = r.campeao.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `estadual-sp-2026-campeao-${slug}.png`;
  }

  function arquivo() {
    return blobAtual ? new File([blobAtual], nomeArquivo(), { type: 'image/png' }) : null;
  }

  function podeCompartilharArquivo() {
    const f = arquivo();
    return !!(f && navigator.canShare && navigator.canShare({ files: [f] }));
  }

  function atualizarBotoes() {
    $('#btn-share').disabled = false;
    $('#btn-baixar').disabled = !blobAtual;
  }

  /** um toque: lista de apps do aparelho; sem ela, baixa a imagem + copia a legenda */
  async function compartilhar() {
    if (estado.campeao === null) return;
    if (!blobAtual) { toast('Montando a arte…'); await (pronta || gerar()); }
    const r = resultado();
    const dados = { title: `${r.campeao.nome} campeão do Estadual SP 2026`, text: legenda() };
    if (podeCompartilharArquivo()) {
      try { await navigator.share({ ...dados, files: [arquivo()] }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    // computador / navegador sem a lista de apps
    baixar(false);
    await copiar(false);
    toast('Imagem baixada e legenda copiada — é só postar onde quiser');
  }

  function baixar(avisar = true) {
    if (!blobAtual) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blobAtual);
    a.download = nomeArquivo();
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (avisar) toast('Imagem baixada');
  }

  async function copiar(avisar = true) {
    const txt = legenda();
    try { await navigator.clipboard.writeText(txt); }
    catch (e) {
      const t = document.createElement('textarea');
      t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch (e2) { /* sem cópia */ }
      t.remove();
    }
    if (avisar) toast('Legenda copiada');
  }

  function ligar() {
    $('#btn-share').addEventListener('click', compartilhar);
    $('#btn-baixar').addEventListener('click', () => baixar());
  }

  return { gerar, ligar, legenda, compartilhar };
})();

Compartilhar.ligar();
