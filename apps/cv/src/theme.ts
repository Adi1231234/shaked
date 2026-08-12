export type FontOption = { name: string; stack: string };

export const LATIN_FONTS: FontOption[] = [
  { name: 'Inter',              stack: "'Inter'" },
  { name: 'Playfair Display',   stack: "'Playfair Display'" },
  { name: 'Cormorant Garamond', stack: "'Cormorant Garamond'" },
  { name: 'Lora',               stack: "'Lora'" },
  { name: 'Montserrat',         stack: "'Montserrat'" },
  { name: 'Libre Baskerville',  stack: "'Libre Baskerville'" },
  { name: 'Source Sans 3',      stack: "'Source Sans 3'" },
  { name: 'Manrope',            stack: "'Manrope'" },
  { name: 'EB Garamond',        stack: "'EB Garamond'" },
  { name: 'Poppins',            stack: "'Poppins'" },
];

export const HEBREW_FONTS: FontOption[] = [
  { name: 'Heebo',             stack: "'Heebo'" },
  { name: 'Rubik',             stack: "'Rubik'" },
  { name: 'Assistant',         stack: "'Assistant'" },
  { name: 'Noto Sans Hebrew',  stack: "'Noto Sans Hebrew'" },
  { name: 'Alef',              stack: "'Alef'" },
  { name: 'Secular One',       stack: "'Secular One'" },
  { name: 'Frank Ruhl Libre',  stack: "'Frank Ruhl Libre'" },
  { name: 'David Libre',       stack: "'David Libre'" },
  { name: 'Miriam Libre',      stack: "'Miriam Libre'" },
  { name: 'Suez One',          stack: "'Suez One'" },
];

export type ColorSlot = {
  key: string;
  label: string;
  labelHe: string;
  default: string;
};

export type DesignSlots = ColorSlot[];

export const DESIGN_COLOR_SLOTS: Record<string, DesignSlots> = {
  'classic-navy': [
    { key: 'sidebarBg', label: 'Sidebar', labelHe: 'סרגל',  default: '#1f2d47' },
    { key: 'accent',    label: 'Accent',  labelHe: 'מבטא',  default: '#b89968' },
    { key: 'pageBg',    label: 'Page BG', labelHe: 'רקע',    default: '#ffffff' },
    { key: 'ink',       label: 'Text',    labelHe: 'טקסט',  default: '#1a2332' },
  ],
  'classic-emerald': [
    { key: 'primary', label: 'Primary', labelHe: 'ראשי',  default: '#173c31' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#8a6f2e' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#fbfcf8' },
    { key: 'text',    label: 'Text',    labelHe: 'טקסט',  default: '#1d3029' },
  ],
  'classic-burgundy': [
    { key: 'primary', label: 'Primary', labelHe: 'ראשי',  default: '#682b36' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#9a6c44' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#fffaf7' },
    { key: 'text',    label: 'Text',    labelHe: 'טקסט',  default: '#433230' },
  ],
  'classic-slate': [
    { key: 'primary', label: 'Primary', labelHe: 'ראשי',  default: '#202a33' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#7d8896' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#f8fafb' },
    { key: 'text',    label: 'Text',    labelHe: 'טקסט',  default: '#3d4954' },
  ],
  'minimalist': [
    { key: 'heading', label: 'Heading', labelHe: 'כותרת', default: '#111111' },
    { key: 'body',    label: 'Body',    labelHe: 'גוף',   default: '#333333' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#999999' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#ffffff' },
  ],
  'elegant': [
    { key: 'primary', label: 'Primary', labelHe: 'ראשי',  default: '#8b6b3f' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#c4a574' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#faf6ee' },
    { key: 'text',    label: 'Text',    labelHe: 'טקסט',  default: '#3d2817' },
  ],
  'modern': [
    { key: 'primary', label: 'Primary', labelHe: 'ראשי',  default: '#3d6b5d' },
    { key: 'accent',  label: 'Accent',  labelHe: 'מבטא',  default: '#5a8577' },
    { key: 'pageBg',  label: 'Page BG', labelHe: 'רקע',   default: '#f5f8f7' },
    { key: 'text',    label: 'Text',    labelHe: 'טקסט',  default: '#2d3b36' },
  ],
  'executive': [
    { key: 'navy',   label: 'Navy',    labelHe: 'כחול', default: '#1f2d47' },
    { key: 'gold',   label: 'Gold',    labelHe: 'זהב',  default: '#c49a6c' },
    { key: 'red',    label: 'Red',     labelHe: 'אדום', default: '#8b2635' },
    { key: 'pageBg', label: 'Page BG', labelHe: 'רקע',  default: '#ffffff' },
  ],
  'editorial': [
    { key: 'ink',    label: 'Ink',     labelHe: 'דיו',   default: '#1a1a1a' },
    { key: 'accent', label: 'Accent',  labelHe: 'מבטא',  default: '#a64b5f' },
    { key: 'pageBg', label: 'Page BG', labelHe: 'רקע',   default: '#fcfaf7' },
    { key: 'text',   label: 'Text',    labelHe: 'טקסט',  default: '#2a2a2a' },
  ],
};

export type ColorMap = Record<string, string>;

export function getDefaults(designKey: string): ColorMap {
  const slots = DESIGN_COLOR_SLOTS[designKey] ?? [];
  return Object.fromEntries(slots.map(s => [s.key, s.default]));
}

function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amount > 0 ? (255 - v) * amount : v * amount))));
  const toHex = (v: number) => adj(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Build CSS override targeting every color slot for the active design.
 */
export function buildColorOverride(designKey: string, c: ColorMap): string {
  switch (designKey) {
    case 'classic-navy': {
      const sidebarText = shade(c.sidebarBg, 0.85);
      const accentSoft = shade(c.accent, 0.4);
      const inkSoft = shade(c.ink, 0.32);
      return `
        .d1-page {
          --sidebar-bg: ${c.sidebarBg} !important;
          --sidebar-text: ${sidebarText} !important;
          --accent: ${c.accent} !important;
          --accent-soft: ${accentSoft} !important;
          --main-bg: ${c.pageBg} !important;
          --ink: ${c.ink} !important;
          --ink-soft: ${inkSoft} !important;
          background: ${c.pageBg} !important;
          color: ${c.ink} !important;
        }
        .d1-sidebar { background: ${c.sidebarBg} !important; color: ${sidebarText} !important; }
        .d1-name { color: ${sidebarText} !important; }
      `;
    }

    case 'classic-emerald': {
      const primarySub = shade(c.primary, 0.22);
      const profileBg = shade(c.primary, 0.92);
      return `
        .d1e-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d1e-header { border-bottom-color: ${primarySub} !important; }
        .d1e-seal { border-color: ${primarySub} !important; color: ${primarySub} !important; }
        .d1e-title h1 { color: ${c.primary} !important; }
        .d1e-title div { color: ${c.accent} !important; }
        .d1e-contact { color: ${shade(c.text, 0.15)} !important; }
        .d1e-contact svg { color: ${primarySub} !important; }
        .d1e-page h2 { color: ${c.primary} !important; border-bottom-color: ${shade(c.primary, 0.72)} !important; }
        .d1e-profile { background: ${profileBg} !important; border-left-color: ${primarySub} !important; }
        .d1e-profile p, .d1e-rail li, .d1e-item li { color: ${shade(c.text, 0.15)} !important; }
        .d1e-date { color: ${c.accent} !important; }
        .d1e-edu strong, .d1e-item h3 { color: ${c.primary} !important; }
        .d1e-page li::before { background: ${c.accent} !important; }
        .d1e-rail { border-left-color: ${shade(c.primary, 0.72)} !important; }
      `;
    }

    case 'classic-burgundy': {
      const sidebarBg = shade(c.accent, 0.82);
      return `
        .d1b-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d1b-header { border-bottom-color: ${c.primary} !important; }
        .d1b-kicker { color: ${c.accent} !important; }
        .d1b-header h1 { color: ${c.primary} !important; }
        .d1b-role, .d1b-contact { color: ${c.text} !important; }
        .d1b-profile p, .d1b-page li { color: ${c.text} !important; }
        .d1b-page h2, .d1b-entry h3 { color: ${c.primary} !important; }
        .d1b-date { color: ${shade(c.primary, 0.15)} !important; }
        .d1b-page li::before { background: ${c.accent} !important; }
        .d1b-aside { background: ${sidebarBg} !important; }
      `;
    }

    case 'classic-slate': {
      const accentBg = shade(c.accent, 0.82);
      return `
        .d1s-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d1s-header { border-bottom-color: ${c.primary} !important; }
        .d1s-name, .d1s-row h3 { color: ${c.primary} !important; }
        .d1s-role, .d1s-date { color: ${c.accent} !important; }
        .d1s-contact { color: ${shade(c.accent, 0.15)} !important; }
        .d1s-page h2 { color: ${c.primary} !important; }
        .d1s-profile { background: ${accentBg} !important; }
        .d1s-profile p, .d1s-page li { color: ${c.text} !important; }
        .d1s-page li::before { background: ${c.accent} !important; }
      `;
    }

    case 'minimalist': {
      const muted = shade(c.body, 0.4);
      return `
        .d2-page { background: ${c.pageBg} !important; color: ${c.body} !important; }
        .d2-header { border-bottom-color: ${c.heading} !important; }
        .d2-header h1, .d2-section h2, .d2-row-title { color: ${c.heading} !important; }
        .d2-section h2::after { background: ${c.heading} !important; }
        .d2-section p, .d2-plain li { color: ${c.body} !important; }
        .d2-row-body ul li { color: ${c.body} !important; }
        .d2-row-body ul li::before, .d2-plain li::before { color: ${c.accent} !important; }
        .d2-row-date, .d2-role { color: ${muted} !important; }
      `;
    }

    case 'elegant':
      return `
        .d3-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d3-section h2, .d3-item-date { color: ${c.primary} !important; }
        .d3-section h2::before, .d3-section h2::after { color: ${c.accent} !important; }
        .d3-header { border-bottom-color: ${c.accent} !important; }
        .d3-header h1, .d3-ornament, .d3-rule em { color: ${c.text} !important; }
        .d3-rule span { background: ${c.accent} !important; }
        .d3-item-head { border-bottom-color: ${c.accent} !important; background: transparent !important; }
        .d3-list li { color: ${c.text} !important; }
        .d3-list li::before { background: ${c.accent} !important; }
        .d3-section p { color: ${c.text} !important; }
      `;

    case 'modern': {
      const chipBg = shade(c.accent, 0.68);
      return `
        .d4-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d4-hero { border-left-color: ${c.primary} !important; }
        .d4-hero h1, .d4-card h2, .d4-tl-body strong { color: ${c.primary} !important; }
        .d4-role, .d4-tl-date { color: ${c.accent} !important; }
        .d4-card h2::before, .d4-tl-dot { background: ${c.accent} !important; }
        .d4-chips li { background: ${chipBg} !important; color: ${c.primary} !important; }
        .d4-card p, .d4-plain li, .d4-tl-body, .d4-tl-body ul li { color: ${c.text} !important; }
        .d4-plain li::before, .d4-tl-body ul li::before { color: ${c.accent} !important; }
        .d4-tl-item { border-left-color: ${shade(c.accent, 0.55)} !important; }
      `;
    }

    case 'executive': {
      const bottomBg = shade(c.gold, 0.86);
      return `
        .d5-page { background: ${c.pageBg} !important; }
        .d5-topbar { background: linear-gradient(to right, ${c.red} 0%, ${c.red} 33%, ${c.gold} 33%, ${c.gold} 66%, ${c.navy} 66%, ${c.navy} 100%) !important; }
        .d5-header h1, .d5-section h2, .d5-entry-title, .d5-bottom-section h2 { color: ${c.navy} !important; }
        .d5-role, .d5-entry-date, .d5-label { color: ${c.red} !important; }
        .d5-divider, .d5-section h2::before, .d5-entry-body ul li::before, .d5-plain li::before { background: ${c.gold} !important; }
        .d5-bottom-grid { background: ${bottomBg} !important; }
      `;
    }

    case 'editorial': {
      const divider = shade(c.accent, 0.75);
      return `
        .d6-page { background: ${c.pageBg} !important; color: ${c.text} !important; }
        .d6-eyebrow, .d6-section-num, .d6-entry-date { color: ${c.accent} !important; }
        .d6-header { border-bottom-color: ${c.ink} !important; }
        .d6-header h1, .d6-section-title, .d6-entry-title { color: ${c.ink} !important; }
        .d6-contact-item > span:first-child { background: ${c.accent} !important; }
        .d6-profile-section, .d6-col-left .d6-section > .d6-section-title, .d6-col-right .d6-section > .d6-section-title { border-bottom-color: ${divider} !important; }
        .d6-entry ul li::before, .d6-plain li::before { color: ${c.accent} !important; }
        .d6-entry ul li, .d6-plain li, .d6-profile-body p, .d6-header-right { color: ${c.text} !important; }
      `;
    }

    default:
      return '';
  }
}
