// Cores: conversões (HEX, RGB, CMYK, HSL) e contraste WCAG.
// CMYK é a conversão matemática direta; a separação real depende do perfil da gráfica.

export function hexNorm(v) {
  let h = String(v || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map(c => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toUpperCase() : null;
}

export function hexToRgb(hex) {
  const h = hexNorm(hex) || '#000000';
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToCmyk([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const k = 1 - Math.max(R, G, B);
  if (k >= 1) return [0, 0, 0, 100];
  const f = x => Math.round(((1 - x - k) / (1 - k)) * 100);
  return [f(R), f(G), f(B), Math.round(k * 100)];
}

export function rgbToHsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function codes(hex) {
  const rgb = hexToRgb(hex);
  const [c, m, y, k] = rgbToCmyk(rgb);
  const [h, s, l] = rgbToHsl(rgb);
  return [
    ['HEX', hexNorm(hex) || hex],
    ['RGB', rgb.join(' ')],
    ['CMYK', `${c} ${m} ${y} ${k}`],
    ['HSL', `${h}° ${s}% ${l}%`],
  ];
}

export function luminance(hex) {
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const [r, g, b] = hexToRgb(hex).map(lin);
  return .2126 * r + .7152 * g + .0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + .05) / (y + .05);
}

// Selo WCAG para texto: AAA ≥ 7, AA ≥ 4.5, AA grande ≥ 3
export function grade(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA+';
  return '';
}

// Tinta legível sobre um fundo
export const inkOn = hex => (contrast(hex, '#FFFFFF') >= contrast(hex, '#0D0D0D') ? '#FFFFFF' : '#0D0D0D');
