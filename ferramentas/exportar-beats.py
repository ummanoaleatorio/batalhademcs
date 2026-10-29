"""Regrava os loops de beat em beats/<estilo>.mp3 a partir do musica.js (função renderizar).

Use quando mudar algum estilo em ESTILOS no musica.js. Precisa de Python com Playwright
(pip install playwright && playwright install chromium) e do ffmpeg no PATH.

    python ferramentas/exportar-beats.py

No fim ele imprime o dicionário ATAQUE: copie os números para a constante ATAQUE no musica.js
(serve pra alinhar o loop do MP3 com o beat em qualquer navegador).
"""
import asyncio, base64, os, struct, subprocess, sys, tempfile, threading, http.server, functools
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTA = 8799
JS = """async (id) => {
  const b = await Musica.renderizar(id);
  const n = b.length, sr = b.sampleRate, ch = [b.getChannelData(0), b.getChannelData(1)];
  const extra = Math.round(sr * .5), tot = n + extra;   // loop + 0,5 s do começo (folga pro decodificador)
  const pcm = new Int16Array(tot * 2);
  for (let i = 0; i < tot; i++) { const k = i % n; for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.max(-32768, Math.min(32767, Math.round(ch[c][k] * 32767))); }
  let ataque = 0; while (ataque < n && Math.abs(ch[0][ataque]) < .2 && Math.abs(ch[1][ataque]) < .2) ataque++;
  const u8 = new Uint8Array(pcm.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { sr, ataque, b64: btoa(s) };
}"""

def servidor():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=RAIZ)
    h.log_message = lambda *a: None
    http.server.ThreadingHTTPServer(('127.0.0.1', PORTA), h).serve_forever()

async def main():
    threading.Thread(target=servidor, daemon=True).start()
    os.makedirs(os.path.join(RAIZ, 'beats'), exist_ok=True)
    ataques = {}
    async with async_playwright() as p:
        nav = await p.chromium.launch()
        pg = await nav.new_page()
        await pg.goto(f'http://127.0.0.1:{PORTA}/batalha.html')
        ids = await pg.evaluate('Object.keys(Musica.ESTILOS)')
        for id in ids:
            r = await pg.evaluate(JS, id)
            raw = base64.b64decode(r['b64']); sr = r['sr']; ataques[id] = r['ataque']
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                f.write(b'RIFF' + struct.pack('<I', 36 + len(raw)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 2, sr, sr * 4, 4, 16) + b'data' + struct.pack('<I', len(raw)) + raw)
                wav = f.name
            saida = os.path.join(RAIZ, 'beats', id + '.mp3')
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', saida], check=True)
            os.remove(wav)
            print(f'{id}: {os.path.getsize(saida) // 1024} KB')
        await nav.close()
    print('\nATAQUE =', ataques)

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
