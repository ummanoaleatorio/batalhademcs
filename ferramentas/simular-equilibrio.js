// Simulador de equilíbrio do Modo Carreira (Monte Carlo, sem tempo real).
// Uso:  node ferramentas/simular-equilibrio.js            (valores atuais do jogo)
//       node ferramentas/simular-equilibrio.js '{"qA":0.7,"N":3000,"lv":[2,5]}'
// qA/qN = força da IA (forca*qA + nivel*qN em planejarEntradaAdv) · sJ/sP = sorte dos jurados/plateia
// fA/mV = "forma do dia" do adversário / sua · N = batalhas por célula · lv = níveis do SEU MC a testar
// Perfis de jogador: perfeito/bom/medio/fraco (h = chance de acertar a nota, s = chance de ser perfeito).
const P = JSON.parse(process.argv[2] || '{}');
const qA = P.qA ?? .66, qN = P.qN ?? .08, qR = P.qR ?? .12, fA = P.fA ?? .25, mV = P.mV ?? .22, sJ = P.sJ ?? .26, sP = P.sP ?? .38, fat = P.fat ?? .25;
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'batalha.js'), 'utf8');
const MCS = eval(js.match(/const MCS = (\[[\s\S]*?\]);/)[1]);   // lê os níveis direto do jogo
const sem = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
MCS.forEach((mc, i) => { const base = [0, 52, 58, 64, 70, 75][mc.nivel]; const j = (k) => Math.round(lim(base + (sem(i * 7 + k) - .5) * 26, 25, 98)); mc.attr = { punch: j(1), flow: j(2), rima: j(3), presenca: j(4) }; });
const PES = [{ flow: .35, rima: .35, punch: .2, presenca: .1 }, { flow: .5, rima: .3, punch: .1, presenca: .1 }, { punch: .45, presenca: .3, flow: .15, rima: .1 }, { punch: .4, rima: .3, presenca: .2, flow: .1 }];
const forca = (mc, b) => Object.entries(PES[b]).reduce((s, [k, p]) => s + mc.attr[k] * p, 0) / 100;
const R = () => Math.random(), S = (a, b) => a + R() * (b - a);
const novo = () => ({ tec: 0, imp: 0, pla: 0 });

function entradaVoce(mc, b, perfil, st, c, mv) {
  const f = forca(mc, b); let combo = 0, perf = 0, bons = 0, punchFeita = false;
  const mult = () => (st.hype ? 1.2 : 1) * mv, add = (k, v) => { c[k] += Math.max(v > 0 ? 1 : 0, Math.round(v)); };
  for (let k = 0; k < 16; k++) {
    if (R() < perfil.h) { combo++; if (R() < perfil.s) { perf++; c.pla += fat; } else bons++;
      if (combo % 4 === 0) add('tec', (2.5 + 3 * f) * (combo >= 8 ? 1.25 : 1) * mult()); }
    else combo = 0;
    if (!punchFeita && combo >= perfil.punchCombo) { punchFeita = true;
      const at = mc.attr.punch / 100, ch = lim(.18 + at * .35 + Math.min(combo, 8) / 8 * .35 + (st.hype ? .06 : 0), .08, .92);
      if (R() < ch) add('imp', (7 + 8 * at) * mult()); else c.imp += 1; }
    if (k === 1 && !st.plateia) { st.plateia = true; st.hype = true; add('pla', (2 + mc.attr.presenca / 100 * 3) * mv); }
  }
  if (!punchFeita && perfil.punchSempre) { const at = mc.attr.punch / 100; if (R() < lim(.18 + at * .35, .08, .92)) add('imp', (7 + 8 * at) * mv); else c.imp += 1; }
  add('tec', ((perf + bons * .6) / 16) * (4 + 6 * f) * mult());
}
function entradaAdv(mc, b, st, c) {
  const f = forca(mc, b), q = lim(f * qA + mc.nivel * qN + st.forma + S(-qR, qR), .2, .97);
  const mult = () => (st.hype ? 1.2 : 1);
  const punchSlot = R() < .3 + mc.nivel * .06 ? Math.floor(S(1, 5)) : -1;
  const platSlot = !st.hype && R() < .35 ? Math.floor(S(0, 3)) : -1;
  for (let k = 0; k < 5; k++) {
    if (k === punchSlot) { c.imp += R() < q * .85 ? Math.round((7 + 8 * mc.attr.punch / 100) * mult()) : 1; continue; }
    if (k === platSlot) { st.hype = true; c.pla += Math.round(2 + 3 * mc.attr.presenca / 100); continue; }
    const r = R(); if (r < q) { c.tec += Math.round((2.5 + 3 * f) * mult()); if (q > .75) c.pla += fat * 3; } else if (r < q + (1 - q) * .45) c.tec += 1;
  }
  c.tec += Math.round(q * (4 + 6 * f) * mult());
}
const VOTO = [{ tec: 1, imp: .5, pla: .2, s: sJ }, { tec: .5, imp: 1.1, pla: .3, s: sJ }, { tec: .4, imp: .8, pla: 1.2, s: sP }];
function round(v, a, b, perfil, voceComeca, rn) {
  const sv = { hype: false }, sa = { hype: false, forma: S(-fA, fA) }, cv = novo(), ca = novo(), mv = 1 + S(-mV, mV);
  const ordem = rn < 2 ? (voceComeca ? ['v','v','v','v','a','a','a','a'] : ['a','a','a','a','v','v','v','v']) : (voceComeca ? ['v', 'a', 'v', 'a'] : ['a', 'v', 'a', 'v']);
  const ult = ordem.length - 1;
  ordem.forEach((x, e) => { const c = x === 'v' ? cv : ca; if (x === 'v') entradaVoce(MCS[v], b, perfil, sv, cv, mv); else entradaAdv(MCS[a], b, sa, ca); if (e === 0) c.imp += 6; if (e === ult) c.imp += 2; /* BONUS do jogo: iniciativa 6, última palavra 2 */ });
  let votos = 0;
  const nv = MCS[v].nivel, na = MCS[a].nivel, dono = na === 5 && (nv === 2 || nv === 3) ? 'a' : nv === 5 && (na === 2 || na === 3) ? 'v' : null;
  const tot = (c) => c.tec + c.imp + c.pla;
  const donoVale = dono && !(dono === 'a' ? tot(cv) - tot(ca) > 35 : tot(ca) - tot(cv) > 35);   // fraco abriu mais de 35: plateia livre
  for (const w of VOTO) { if (w === VOTO[2] && donoVale) { if (dono === 'v') votos++; continue; } const nota = (c) => (c.tec * w.tec + c.imp * w.imp + c.pla * w.pla) * (1 + S(-w.s, w.s)); if (nota(cv) > nota(ca)) votos++; }
  return votos >= 2;
}
function batalha(v, a, perfil) {
  const beats = [0, 1, 2, 3].sort(() => R() - .5); let pv = 0, pa = 0, r = 0; const comeca = () => R() < .5 || R() < .3; let ini = comeca();   // ganhou o ímpar/par: você começa; perdeu: o adversário começa 70% das vezes
  while (pv < 2 && pa < 2) { const com = r === 1 ? !ini : (r === 0 ? ini : comeca()); if (round(v, a, beats[r], perfil, com, r)) pv++; else pa++; r++; }
  return pv === 2;
}
const perfis = { perfeito: { h: .98, s: .95, punchCombo: 6 }, bom: { h: .88, s: .6, punchCombo: 5 }, medio: { h: .72, s: .4, punchCombo: 4, punchSempre: true }, fraco: { h: .5, s: .3, punchCombo: 3, punchSempre: true } };
const N = P.N ?? 2500;
const lvls = P.lv ?? [2, 3, 4, 5];
for (const L of lvls) {
  const meus = MCS.map((m, i) => i).filter((i) => MCS[i].nivel === L);
  console.log(`-- você nível ${L}            nv2  nv3  nv4  nv5  campeão`);
  for (const [nome, pf] of Object.entries(perfis)) {
    const l = ['   ' + nome.padEnd(22)];
    for (let nv = 2; nv <= 5; nv++) { let w = 0, n = 0; for (let k = 0; k < N; k++) { const v = meus[k % meus.length]; const advs = MCS.map((m, i) => i).filter((i) => MCS[i].nivel === nv && i !== v); if (!advs.length) continue; n++; if (batalha(v, advs[k % advs.length], pf)) w++; } l.push(String(Math.round(100 * w / n)).padStart(4)); }
    let camp = 0; for (let k = 0; k < N; k++) { const v = meus[k % meus.length]; const o = MCS.map((m, i) => i).filter((i) => i !== v).sort(() => R() - .5); if (o.slice(0, 4).every((a) => batalha(v, a, pf))) camp++; }
    l.push(String(Math.round(1000 * camp / N) / 10).padStart(7) + '%'); console.log(l.join(' '));
  }
}
