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
 * Returns the base surface solid color (slate-950 for dark, white for light).
 */
export function getComputedSurfaceColor(isDark: boolean): string {
  return isDark ? '#020617' : '#ffffff';
}

/**
 * Returns the simulation amber overlay color corresponding to Tailwind amber-500/20.
 */
export function getComputedAmberOverlay(): string {
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

/**
 * Returns the base canvas background color (slate-950 for dark, slate-100 for light).
 */
export function getCanvasBgColor(isDark: boolean): string {
  return isDark ? '#020617' : '#f1f5f9';
}

/**
 * Checks if the current client is a mobile/touch device (iOS, Android, iPad).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
  );
}

/**
 * Synchronously updates document styles, CSS variables, sampling elements,
 * and theme-color / color-scheme meta tags across both mobile and desktop Safari.
 */
export function updateDocumentTheme(
  isDark: boolean,
  topbarColor: string,
  baseSurfaceColor: string,
  canvasBgColor: string,
  isMobile: boolean
): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;

  // 1. Toggle dark class and colorScheme
  if (isDark) {
    html.classList.add('dark');
    html.style.colorScheme = 'dark';
    if (body) body.style.colorScheme = 'dark';
    try { localStorage.setItem('malla_theme', 'dark'); } catch {}
  } else {
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
    if (body) body.style.colorScheme = 'light';
    try { localStorage.setItem('malla_theme', 'light'); } catch {}
  }

  // 2. CSS variables
  html.style.setProperty('--topbar-bg', topbarColor);
  html.style.setProperty('--canvas-bg', canvasBgColor);

  // 3. Status bar and bottom bar fixed sampling elements
  const statusBarTint = document.getElementById('ios-status-bar-tint');
  if (statusBarTint) {
    statusBarTint.style.backgroundColor = topbarColor;
  }
  const bottomBarTint = document.getElementById('ios-bottom-bar-tint');
  if (bottomBarTint) {
    bottomBarTint.style.backgroundColor = canvasBgColor;
  }

  // 4. Background colors
  html.style.backgroundColor = topbarColor;
  if (body) {
    body.style.backgroundColor = isMobile ? canvasBgColor : topbarColor;
  }

  // 5. Meta color-scheme
  const metaScheme = document.getElementById('meta-color-scheme') || document.querySelector('meta[name="color-scheme"]');
  if (metaScheme) {
    metaScheme.setAttribute('content', isDark ? 'dark' : 'light');
  }

  // 6. Meta theme-color tags:
  // On mobile: keep theme-color as baseSurfaceColor so iOS bottom address bar does NOT tint with amber/accent.
  // On desktop PC: update theme-color to topbarColor, replacing nodes so macOS Safari reliably re-evaluates the window chrome.
  const metaColor = isMobile ? baseSurfaceColor : topbarColor;

  if (isMobile) {
    const metaDefault = document.getElementById('theme-color-meta');
    if (metaDefault) metaDefault.setAttribute('content', metaColor);
    const metaLight = document.getElementById('theme-color-light');
    if (metaLight) metaLight.setAttribute('content', metaColor);
    const metaDark = document.getElementById('theme-color-dark');
    if (metaDark) metaDark.setAttribute('content', metaColor);
  } else {
    // Desktop: Replace meta tags to trigger macOS Safari window title bar live update
    const updateOrCreateMeta = (id: string, color: string, media?: string) => {
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
      }
      const newMeta = document.createElement('meta');
      newMeta.id = id;
      newMeta.name = 'theme-color';
      newMeta.content = color;
      if (media) newMeta.media = media;
      document.head.appendChild(newMeta);
    };

    updateOrCreateMeta('theme-color-meta', metaColor);
    updateOrCreateMeta('theme-color-light', metaColor, '(prefers-color-scheme: light)');
    updateOrCreateMeta('theme-color-dark', metaColor, '(prefers-color-scheme: dark)');
  }

  // Force layout flush so WebKit computes styles immediately before composite
  if (body) {
    void body.offsetHeight;
  }
}
