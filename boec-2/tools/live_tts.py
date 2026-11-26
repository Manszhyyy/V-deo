"""live_tts.py DIR VOICE [MODEL] : speak each line of DIR/vo/lines.json with a Gemini native-audio (Live API) model → DIR/vo/<id>.wav (24 kHz).
Key from GEMINI_API_KEY. The model is told to read the text exactly, as a voice actor."""
import asyncio, base64, json, os, sys, numpy as np, soundfile as sf, websockets
D, VOICE = sys.argv[1], sys.argv[2]; MODEL = sys.argv[3] if len(sys.argv) > 3 else 'gemini-2.5-flash-native-audio-latest'
SYS = os.environ.get('SYS', 'Ты профессиональный актёр озвучки. Тебе присылают текст на русском. Прочитай его вслух ДОСЛОВНО, ни слова не добавляй и не меняй, ничего не отвечай от себя. Читай живо, насыщенно, с эмоцией, как рассказчик драматичного короткого фильма о бойце: уверенно, с ударениями на главных словах, естественные паузы.')
URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
async def main():
    L = json.load(open(f'{D}/vo/lines.json')); only = os.environ.get('ONLY', '').split(',') if os.environ.get('ONLY') else None
    async with websockets.connect(URL, additional_headers={'x-goog-api-key': os.environ['GEMINI_API_KEY']}, max_size=None) as ws:
        await ws.send(json.dumps({'setup': {'model': f'models/{MODEL}', 'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE}}}},
                                            'systemInstruction': {'parts': [{'text': SYS}]}}}))
        print(json.loads(await ws.recv()).keys())
        for l in L:
            if only and l['id'] not in only: continue
            txt = l.get('speak', l.get('say', l['text']))
            await ws.send(json.dumps({'clientContent': {'turns': [{'role': 'user', 'parts': [{'text': txt}]}], 'turnComplete': True}}))
            pcm = bytearray()
            while True:
                m = json.loads(await ws.recv()); sc = m.get('serverContent', {})
                for p in sc.get('modelTurn', {}).get('parts', []):
                    if 'inlineData' in p: pcm += base64.b64decode(p['inlineData']['data'])
                if sc.get('turnComplete'): break
            x = np.frombuffer(bytes(pcm), '<i2').astype(np.float32) / 32768; sf.write(f"{D}/vo/{l['id']}.wav", x, 24000); print(l['id'], round(len(x) / 24000, 2))
asyncio.run(main())
