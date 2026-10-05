/**
 * Utility to calculate dynamic theme and status bar colors for iOS Safari and WebKit.
 * Dynamically samples DOM styles and calculates blended opaque solid colors
 * so iOS status bar Live Element Sampler and theme-color work reliably without alpha glitches.
 */

export function parseCssColor(colorStr: string): [number, number, number, number] {
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [num >> 16, (num >> 8) & 255, num & 255, 1];
  }
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] !== undefined ? parseFloat(match[4]) : 1
    ];
  }
  return [0, 0, 0, 1];
}

/**
 * Calculates exact composited solid hex color when an overlay (with alpha)
 * is blended over a solid base color using native canvas or mathematical fallback.
 */
export function blendColors(overlayColor: string, baseColor: string): string {
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
    } catch {
      // fallback to math
    }
  }

  const fg = parseCssColor(overlayColor);
  const bg = parseCssColor(baseColor);
  const alpha = fg[3];
  const r = Math.round(fg[0] * alpha + bg[0] * (1 - alpha));
  const g = Math.round(fg[1] * alpha + bg[1] * (1 - alpha));
  const b = Math.round(fg[2] * alpha + bg[2] * (1 - alpha));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Dynamically queries computed background colors from the DOM.
 */
export function getComputedSurfaceColor(isDark: boolean): string {
  if (typeof document === 'undefined') {
    return isDark ? '#020617' : '#ffffff';
  }
  try {
    const temp = document.createElement('div');
    temp.className = isDark ? 'dark bg-slate-950' : 'bg-white';
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const comp = window.getComputedStyle(temp).backgroundColor;
    document.body.removeChild(temp);
    if (comp && comp !== 'rgba(0, 0, 0, 0)' && comp !== 'transparent') {
      return comp;
    }
  } catch {
    // fallback
  }
  return isDark ? '#020617' : '#ffffff';
}

/**
 * Dynamically queries the simulation amber overlay color from Tailwind classes.
 */
export function getComputedAmberOverlay(): string {
  if (typeof document === 'undefined') {
    return 'rgba(245, 158, 11, 0.20)';
  }
  try {
    const temp = document.createElement('div');
    temp.className = 'bg-amber-500/20';
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const comp = window.getComputedStyle(temp).backgroundColor;
    document.body.removeChild(temp);
    if (comp && comp !== 'rgba(0, 0, 0, 0)' && comp !== 'transparent') {
      return comp;
    }
  } catch {
    // fallback
  }
  return 'rgba(245, 158, 11, 0.20)';
}

/**
 * Calculates the exact solid color for header and status bar in current mode.
 */
export function computeThemeColor(isDark: boolean, isSimulationMode: boolean): {
  color: string;
  isDarkText: boolean;
} {
  const baseColor = getComputedSurfaceColor(isDark);

  let solidHex: string;
  if (isSimulationMode) {
    const overlayColor = getComputedAmberOverlay();
    solidHex = blendColors(overlayColor, baseColor);
  } else {
    // In normal mode, baseColor is the solid surface color
    const [r, g, b] = parseCssColor(baseColor);
    solidHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // Calculate relative luminance to determine whether status bar text should be light or dark
  const [r, g, b] = parseCssColor(solidHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isDarkText = luminance > 0.5;

  return { color: solidHex, isDarkText };
}
