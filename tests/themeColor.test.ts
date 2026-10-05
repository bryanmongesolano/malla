import { describe, it, expect } from 'vitest';
import { parseCssColor, blendColors, computeThemeColor } from '../src/themeColor.js';

describe('themeColor utilities', () => {
  it('parses hex colors correctly', () => {
    expect(parseCssColor('#ffffff')).toEqual([255, 255, 255, 1]);
    expect(parseCssColor('#000')).toEqual([0, 0, 0, 1]);
    expect(parseCssColor('#020617')).toEqual([2, 6, 23, 1]);
  });

  it('parses rgb and rgba strings correctly', () => {
    expect(parseCssColor('rgb(248, 250, 252)')).toEqual([248, 250, 252, 1]);
    expect(parseCssColor('rgba(245, 158, 11, 0.20)')).toEqual([245, 158, 11, 0.2]);
  });

  it('blends overlay with base color correctly', () => {
    // 20% amber-500 over white
    const lightBlend = blendColors('rgba(245, 158, 11, 0.20)', '#ffffff');
    expect(lightBlend.toLowerCase()).toBe('#fdecce');

    // 20% amber-500 over slate-950
    const darkBlend = blendColors('rgba(245, 158, 11, 0.20)', '#020617');
    expect(darkBlend.toLowerCase()).toBe('#332415');
  });

  it('computes correct normal theme colors', () => {
    const light = computeThemeColor(false, false);
    expect(light.color.toLowerCase()).toBe('#ffffff');
    expect(light.isDarkText).toBe(true);

    const dark = computeThemeColor(true, false);
    expect(dark.color.toLowerCase()).toBe('#020617');
    expect(dark.isDarkText).toBe(false);
  });

  it('computes correct simulation theme colors with dark text for light and white text for dark', () => {
    const simLight = computeThemeColor(false, true);
    expect(simLight.isDarkText).toBe(true); // Status bar clock must be dark in light simulation

    const simDark = computeThemeColor(true, true);
    expect(simDark.isDarkText).toBe(false); // Status bar clock must be light/white in dark simulation
  });
});
