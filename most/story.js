// «Мост» — timeline (96 bpm: beat 0.625 s, bar 2.5 s). Every plank lands on the grid and carries a note.
export const DUR = 45.0;
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
export const T = {
  flash: 0, day: 2.4, boy: 10.0, girl: 13.5, lapse: 16.0, storm: 20.0, tear: 21.6, dawn: 26.0, doors: 27.6, rebuild: 30.0, rebuilt: 33.75,
  title: 34.0, dusk: 38.4, lamps: 39.0, meet: 41.0, end: 45.0,
};
export const VO = [
  { id: 'v1', t: 2.6, text: 'Два острова. Сто лет никто не плавал друг к другу.' },
  { id: 'v2', t: 10.2, text: 'Пока двое детей не начали строить мост.' },
  { id: 'v3', t: 13.6, text: 'Каждый — со своей стороны.' },
  { id: 'v4', t: 21.0, text: 'Шторм сломал всё за одну ночь.' },
  { id: 'v5', t: 28.0, text: 'А утром на берег вышли все.' },
];
// plank schedules per side, k = steps from its own shore: [built at, torn away at (or null), rebuilt at]
// the kids: first planks in their close-ups, then six each in the time-lapse (alternating, on eighths); the storm takes them;
// in the morning both villages rebuild on eighths, the last pair meets in the middle on the downbeat
const E8 = BEAT / 2;
export const LPL = [], RPL = [];
const kidL = [11.25, 16.25, 16.25 + 4 * E8, 16.25 + 8 * E8, 16.25 + 12 * E8, 16.25 + 16 * E8 - .01];
const kidR = [14.375, 16.25 + 2 * E8, 16.25 + 6 * E8, 16.25 + 10 * E8, 16.25 + 14 * E8, 16.25 + 18 * E8 - .01];
const tearOrder = [5, 4, 3, 2, 1, 0];
for (let k = 0; k < 8; k++) {
  const tear = k < 6 ? T.tear + tearOrder.indexOf(k) * .55 + (k % 2) * .27 : null;
  const reb = k < 7 ? T.rebuild + k * E8 : T.rebuilt;
  LPL.push([k < 6 ? kidL[k] : null, tear, reb]);
  RPL.push([k < 6 ? kidR[k] : null, tear != null ? tear + .14 : null, k < 7 ? reb + .001 : T.rebuilt + .001]);
}
// sky keyframes: [t, zenith, horizon, deep, shallow, sun colour, sun I, hemi sky, hemi ground, hemi I, sun elev°, sun az°, night]
export const SKY = [
  [0.0, '#2a3048', '#5a6078', '#2a3a52', '#3a5068', '#a9b0d8', .5, '#6a7090', '#3a3440', .6, 30, 300, .85],
  [2.39, '#2a3048', '#5a6078', '#2a3a52', '#3a5068', '#a9b0d8', .5, '#6a7090', '#3a3440', .6, 30, 300, .85],
  [2.4, '#88c8e8', '#eaf5f2', '#38a5bc', '#86e2d4', '#fff6e8', 2.7, '#eef6fb', '#c6b89c', 1.15, 48, 160, 0],
  [16.0, '#88c8e8', '#eaf5f2', '#38a5bc', '#86e2d4', '#fff6e8', 2.7, '#eef6fb', '#c6b89c', 1.15, 48, 160, 0],
  [17.2, '#9ab8d8', '#ffd9b0', '#4f8fb0', '#9ed6c8', '#ffc98e', 2.0, '#f3e2d4', '#c89a80', 1.0, 20, 110, .1],
  [18.0, '#88c8e8', '#eaf5f2', '#38a5bc', '#86e2d4', '#fff6e8', 2.7, '#eef6fb', '#c6b89c', 1.15, 50, 200, 0],
  [19.2, '#9ab8d8', '#ffd9b0', '#4f8fb0', '#9ed6c8', '#ffb880', 1.8, '#f3e2d4', '#c89a80', .95, 15, 100, .15],
  [20.0, '#2a3048', '#5a6078', '#2a3a52', '#3a5068', '#a9b0d8', .5, '#6a7090', '#3a3440', .6, 30, 300, .85],
  [26.0, '#2a3048', '#5a6078', '#2a3a52', '#3a5068', '#a9b0d8', .5, '#6a7090', '#3a3440', .6, 30, 300, .85],
  [27.5, '#a9b6d8', '#ffc8b0', '#4f8aa8', '#9ad0c8', '#ffcfa8', 1.6, '#e8dce8', '#b8988a', .95, 10, 90, .05],
  [31.0, '#8fcbe6', '#eef3ea', '#3aa3b8', '#86e0d2', '#fff4e2', 2.5, '#eef6fb', '#c2b59a', 1.15, 40, 140, 0],
  [37.0, '#9ab8d8', '#ffd9b0', '#4f8fb0', '#9ed6c8', '#ffc98e', 2.2, '#f3e2d4', '#c89a80', 1.0, 18, 115, .05],
  [39.5, '#6f6fa8', '#ffa888', '#5a6a9e', '#b08aa6', '#ff9a68', 1.4, '#d8b8c8', '#a07a80', .8, 6, 105, .35],
  [41.5, '#22285a', '#6a5a8e', '#2a2f5c', '#40457a', '#ffa880', .4, '#6a70a8', '#3a3450', .6, 2, 100, .8],
  [45.0, '#1a1e48', '#5a5080', '#262a54', '#3a3f72', '#a9b0e8', .6, '#5c5ea8', '#2a2640', .55, 30, 300, .95],
];
export const SHOTS = [
  [0, 2.4, 'flash'], [2.4, 10.0, 'wide'], [10.0, 13.5, 'boy'], [13.5, 16.0, 'girl'], [16.0, 20.0, 'lapse'],
  [20.0, 26.0, 'storm'], [26.0, 27.6, 'dawn'], [27.6, 30.0, 'doors'], [30.0, 34.0, 'rebuild'], [34.0, 38.4, 'title'], [38.4, 45.0, 'dusk'],
];
export const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
