# «ночь.log» — treatment

Style: **CRT ASCII Terminal** (`ascii-crt`). P3 amber phosphor; one soft second colour (a pale green) used once, at the end.
Format: 1920×1080, 24 fps, ≈ 48 s. Russian first-person voice-over: RHVoice voice «Pavel», raised 2.5 semitones to sound younger
(the planned Microsoft neural voice needs a WebSocket connection this environment's proxy doesn't carry). Subtitles are terminal output in the LOG strip, `subtitles_ru.srt`.
Font: IBM Plex Mono (OFL) — VT323, the style's font, has no Cyrillic.

Same story as «Первая страница» (a 14-year-old C-student trying to earn on his own with AI), told a different way.

## Three candidate structures

1. **A chat log through one night.** Timestamps as scene headers: 23:58 the day's log (school, a «3», everyone else «5»), 01:12 he asks the AI how to earn, three attempts fail with ERROR, balance 0 ₽; 03:40 he keeps learning (days scroll by), 05:59 he types «я не сдаюсь»; the screen clears to 06:00 and an empty prompt; the cursor, in pale green, keeps blinking.
2. **An error first.** Opens on a crash dump «BALANCE: 0», rewinds to what caused it. Strong hook, but it makes the boy's life a bug report.
3. **Boot-to-shutdown day.** One machine's scheduled jobs from morning to night. Loses the human typing, the best thing this style has for him.

**Chosen: 1.** The chat log puts his uneven human typing against the machine's even output — which is exactly his story: an ordinary kid working with AI. The ending holds a state (cursor blinking) instead of a triumph.

## Logline and arc

At night, alone at his computer, a 14-year-old C-student keeps trying to earn his first money with AI — nothing works yet, and he types that he won't quit.

- Setup (0–13 s): the screen is already lit; `23:58  НОЧЬ.LOG` typed; the day's log: school OK, test «3», the others «5 5 5 5 5». Push in on the «3».
- Struggle (13–26 s): he types «как заработать в 14?»; three attempts → ОШИБКА; `баланс: 0 ₽`, an error beep, near-silence, cursor blinking.
- Turn (26–38 s): «но у меня есть голова, руки и ИИ» — an ASCII picture of him at the desk forms out of those words; a scroll of nights: «НОЧЬ 02 … учусь … НОЧЬ 37».
- Ending (37–47 s): he types slowly «я не сдаюсь» + Enter; clear screen; 06:00, an empty prompt, and the cursor in pale green (the only second colour) blinking to the end.

## Benchmark

- Monochrome terminal sessions and teletype logs; text-mode ASCII art. **Learn**: patience, the cursor as suspense, typing rhythm as acting. **Don't take**: any interface text, fonts, logos or art.

## Shot list

| # | Screen | Grid / move | Time | Why |
|---|---|---|---|---|
| 1 | a lit screen, cursor; `23:58  НОЧЬ.LOG` typed at once | static 52 col | 0–4 | mid-night, no ceremony |
| 2 | the day's log, machine-fast lines with dot leaders | static | 4–11 | the day as data |
| 3 | push in on the «3» until it fills a third of the screen | grid grows | 11–13.5 | that's me |
| 4 | clear; `01:12`; his question typed by hand, uneven | 56 col, slight push | 13.5–17 | a human asks |
| 5 | AI answers fast; attempts → ОШИБКА ×3; `баланс: 0 ₽` + BEL | static | 17–23 | trying, failing |
| 6 | near-silence: only the cursor | hold | 23–26 | the low point |
| 7 | `03:40`; «голова руки ИИ» typed, letters fall into an ASCII picture of him at the desk | grid shrinks (text becomes image) | 26–32 | words turn into world |
| 8 | scroll of nights: `НОЧЬ 02 … учусь` racing up, slowing, stops at `НОЧЬ 37` | scroll | 32–37.5 | time passing |
| 9 | `05:59`; he types «я не сдаюсь» slowly, Enter | push in | 38–42.5 | the decision |
| 10 | clear; `06:00`, an empty prompt, the cursor in pale green, the only second colour, blinking | static | 41–47 | a beginning, held |

## Voice-over (Russian, his voice)

1. Ночь. Все уже спят, а я опять за компом.
2. Днём — школа. Тройки. А у всех вокруг пятёрки, у всех всё получается.
3. Я просто хочу заработать. Сам.
4. Пробовал одно, другое… ноль.
5. Но у меня есть голова, руки — и ИИ.
6. Каждую ночь я учусь чему-то новому.
7. Я пока не отличник. Но я не сдаюсь.
8. Это только начало.

## Cue map

Analog-synth score, 72 bpm. A (0–13) a sub drone and a slow filtered pulse, minor; B (13–23) a square sequencer arpeggio that stalls on each ОШИБКА; 23–26 digital near-zero (room tone, cursor); C (26–38) the arpeggio grows as the picture forms, detuned lead enters on the scroll; D (38–48) everything thins, the only major chord opens on the green cursor and rings out.

## Sound design

| Section | Bed | Foley | Music |
|---|---|---|---|
| A | fan + faint hum, power-on thump | relay click, teletype ticks | drone + pulse |
| B | room | buckling-spring keys (his), ticks (AI), BEL on 0 ₽ | sequencer, stalls |
| near-silence | room only | cursor — nothing | out |
| C | room | particle ticks, scroll ticks | arpeggio grows |
| D | room | slow keys, heavy Enter, clear-screen click | major chord on green |

## Subtitles

LOG strip at the bottom: dim separator, inverse tag `ГОЛОС`, prompt, the line in uppercase ≈ 42 px, typed word by word with the voice (edge-tts word boundaries), held ≥ max(1.8 s, speech + 0.6 s).
