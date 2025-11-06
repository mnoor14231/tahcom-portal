import ColorThief from 'colorthief';

function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map(n => Math.max(0, Math.min(255, n))).map(n => n.toString(16).padStart(2, '0')).join('');
}

export async function deriveBrandColorsFromLogo(logoUrl: string): Promise<{ c1: string; c2: string; c3: string } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const url = new URL(logoUrl, window.location.origin).toString();
    img.src = url;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('logo load error')); });
    const thief = new ColorThief();
    // getPalette returns array of RGB triplets; pick top 3
    const palette: number[][] = (thief as any).getPalette(img, 5) as number[][];
    if (!palette || palette.length === 0) return null;
    const [p1, p2 = p1, p3 = p2] = palette;
    return { c1: rgbToHex(p1), c2: rgbToHex(p2), c3: rgbToHex(p3) };
  } catch {
    return null;
  }
}

export function applyBrandColors(vars: { c1: string; c2: string; c3: string }) {
  const root = document.documentElement;
  root.style.setProperty('--color-brand-1', vars.c1);
  root.style.setProperty('--color-brand-2', vars.c2);
  root.style.setProperty('--color-brand-3', vars.c3);
}


