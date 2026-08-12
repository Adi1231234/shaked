import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Design1Classic from './designs/Design1Classic';
import DesignClassicEmerald from './designs/DesignClassicEmerald';
import DesignClassicBurgundy from './designs/DesignClassicBurgundy';
import DesignClassicSlate from './designs/DesignClassicSlate';
import Design2Minimalist from './designs/Design2Minimalist';
import Design3Elegant from './designs/Design3Elegant';
import Design4Modern from './designs/Design4Modern';
import Design5Executive from './designs/Design5Executive';
import Design6Editorial from './designs/Design6Editorial';
import { CvContext, type Lang, type TextOverrides } from './CvContext';
import { cvData, type CVData } from './cvData';
import { cvDataHe } from './cvDataHe';
import {
  LATIN_FONTS,
  HEBREW_FONTS,
  DESIGN_COLOR_SLOTS,
  getDefaults,
  buildColorOverride,
  type ColorMap,
} from './theme';
import './App.css';

type DesignOption = {
  key: string;
  name: string;
  sub: string;
  family: string;
  accent: string;
  palette: string[];
  render: () => React.ReactElement;
};

const designs: DesignOption[] = [
  {
    key: 'classic-navy',
    name: 'Classic Navy',
    sub: 'Deep Blue',
    family: 'Classic',
    accent: '#243b5a',
    palette: ['#243b5a', '#d7b777', '#f7f4ec'],
    render: () => <Design1Classic theme="navy" />,
  },
  {
    key: 'classic-emerald',
    name: 'Classic Emerald',
    sub: 'Forest Green',
    family: 'Classic',
    accent: '#38675b',
    palette: ['#38675b', '#c7a66d', '#f4f7f1'],
    render: () => <DesignClassicEmerald />,
  },
  {
    key: 'classic-burgundy',
    name: 'Classic Burgundy',
    sub: 'Warm Red',
    family: 'Classic',
    accent: '#874350',
    palette: ['#874350', '#d7a95f', '#fbf3ef'],
    render: () => <DesignClassicBurgundy />,
  },
  {
    key: 'classic-slate',
    name: 'Classic Slate',
    sub: 'Muted Gray',
    family: 'Classic',
    accent: '#56616d',
    palette: ['#56616d', '#b08b62', '#f5f5f2'],
    render: () => <DesignClassicSlate />,
  },
  {
    key: 'minimalist',
    name: 'Minimalist',
    sub: 'Clean & Airy',
    family: 'Minimal',
    accent: '#31716f',
    palette: ['#31716f', '#d8e4df', '#ffffff'],
    render: () => <Design2Minimalist />,
  },
  {
    key: 'elegant',
    name: 'Elegant',
    sub: 'Cream Serif',
    family: 'Serif',
    accent: '#8f654b',
    palette: ['#8f654b', '#e4cba7', '#fbf6ee'],
    render: () => <Design3Elegant />,
  },
  {
    key: 'modern',
    name: 'Modern',
    sub: 'Soft Cards',
    family: 'Modern',
    accent: '#365c7c',
    palette: ['#365c7c', '#96b7c0', '#eef6f6'],
    render: () => <Design4Modern />,
  },
  {
    key: 'executive',
    name: 'Executive',
    sub: 'Subtle Bands',
    family: 'Executive',
    accent: '#8b2635',
    palette: ['#8b2635', '#c49a6c', '#1f2d47'],
    render: () => <Design5Executive />,
  },
  {
    key: 'editorial',
    name: 'Editorial',
    sub: 'Magazine',
    family: 'Editorial',
    accent: '#a6553b',
    palette: ['#a6553b', '#242424', '#f0e4d3'],
    render: () => <Design6Editorial />,
  },
];

const getInitialScale = () => {
  if (typeof window === 'undefined') return 1;
  const chromeWidth = window.innerWidth > 920 ? 360 : 48;
  return Math.min(1, Math.max(0.34, (window.innerWidth - chromeWidth) / 794));
};

const LS_KEYS = {
  textHe: 'cv-text-overrides-he',
  textEn: 'cv-text-overrides-en',
  theme: 'cv-theme',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function cloneData(data: CVData): CVData {
  return JSON.parse(JSON.stringify(data)) as CVData;
}

function setByPath(obj: Record<string, unknown>, path: string, value: string) {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    if (next == null || typeof next !== 'object') return;
    cur = next as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function applyOverrides(data: CVData, overrides: TextOverrides): CVData {
  if (!overrides || Object.keys(overrides).length === 0) return data;
  const result = cloneData(data);
  for (const [path, value] of Object.entries(overrides)) {
    setByPath(result as unknown as Record<string, unknown>, path, value);
  }
  return result;
}

type ThemeStore = {
  latinFontIdx: number;
  hebrewFontIdx: number;
  colorOverrides: Record<string, ColorMap>;
};

function App() {
  const [active, setActive] = useState<string>('classic-navy');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scale, setScale] = useState(getInitialScale);
  const [lang, setLang] = useState<Lang>('en');

  const initialTheme = typeof window === 'undefined'
    ? { latinFontIdx: 0, hebrewFontIdx: 0, colorOverrides: {} }
    : loadJson<ThemeStore>(LS_KEYS.theme, { latinFontIdx: 0, hebrewFontIdx: 0, colorOverrides: {} });
  const initialHeOverrides = typeof window === 'undefined' ? {} : loadJson<TextOverrides>(LS_KEYS.textHe, {});
  const initialEnOverrides = typeof window === 'undefined' ? {} : loadJson<TextOverrides>(LS_KEYS.textEn, {});

  const [latinFontIdx, setLatinFontIdx] = useState(initialTheme.latinFontIdx);
  const [hebrewFontIdx, setHebrewFontIdx] = useState(initialTheme.hebrewFontIdx);
  const [colorOverrides, setColorOverrides] = useState<Record<string, ColorMap>>(initialTheme.colorOverrides);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [textOverrides, setTextOverrides] = useState<Record<Lang, TextOverrides>>({
    he: initialHeOverrides,
    en: initialEnOverrides,
  });
  const stageRef = useRef<HTMLDivElement>(null);

  const setOverride = (path: string, value: string) => {
    setTextOverrides(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [path]: value },
    }));
  };

  const handleSave = () => {
    localStorage.setItem(LS_KEYS.textHe, JSON.stringify(textOverrides.he));
    localStorage.setItem(LS_KEYS.textEn, JSON.stringify(textOverrides.en));
    localStorage.setItem(LS_KEYS.theme, JSON.stringify({ latinFontIdx, hebrewFontIdx, colorOverrides }));
    setEditing(false);
  };

  const handleReset = () => {
    localStorage.removeItem(LS_KEYS.textHe);
    localStorage.removeItem(LS_KEYS.textEn);
    localStorage.removeItem(LS_KEYS.theme);
    setTextOverrides({ he: {}, en: {} });
    setLatinFontIdx(0);
    setHebrewFontIdx(0);
    setColorOverrides({});
    setEditing(false);
  };

  const baseData = lang === 'he' ? cvDataHe : cvData;
  const mergedData = useMemo(
    () => applyOverrides(baseData, textOverrides[lang]),
    [baseData, textOverrides, lang],
  );

  const cvValue = { data: mergedData, lang, editing, setOverride };

  const current = designs.find(d => d.key === active) ?? designs[0];
  const currentIndex = designs.findIndex(d => d.key === current.key);
  const currentSlots = DESIGN_COLOR_SLOTS[current.key] ?? [];
  const currentColors: ColorMap = useMemo(
    () => ({ ...getDefaults(current.key), ...(colorOverrides[current.key] ?? {}) }),
    [current.key, colorOverrides],
  );

  const updateColor = (slotKey: string, value: string) => {
    setColorOverrides(prev => ({
      ...prev,
      [current.key]: {
        ...(prev[current.key] ?? {}),
        [slotKey]: value,
      },
    }));
  };

  const resetColors = () => {
    setColorOverrides(prev => {
      const next = { ...prev };
      delete next[current.key];
      return next;
    });
  };

  const latinFont = LATIN_FONTS[latinFontIdx];
  const hebrewFont = HEBREW_FONTS[hebrewFontIdx];
  const fontStack = `${latinFont.stack}, ${hebrewFont.stack}, sans-serif`;

  const themeStyle = `
.cv-frame, .cv-frame * {
  font-family: ${fontStack} !important;
}
${buildColorOverride(current.key, currentColors)}
`;

  const selectDesign = (key: string) => {
    setActive(key);
    setMenuOpen(false);
  };

  const selectByOffset = (offset: number) => {
    const next = (currentIndex + offset + designs.length) % designs.length;
    selectDesign(designs[next].key);
  };

  const printPdf = () => {
    const fileName = lang === 'he'
      ? `${mergedData.firstName} ${mergedData.lastName} - קורות חיים`
      : `${mergedData.firstName} ${mergedData.lastName} - CV`;
    const previous = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => { document.title = previous; }, 500);
  };

  useLayoutEffect(() => {
    const recalc = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const available = Math.max(0, stage.clientWidth - 48);
      const cvWidth = 794; // 21cm (A4 width) at 96dpi
      setScale(Math.min(1, available / cvWidth));
    };

    recalc();
    const frame = window.requestAnimationFrame(recalc);
    const observer = new ResizeObserver(recalc);
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener('resize', recalc);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [active, menuOpen]);

  useEffect(() => {
    document.documentElement.dataset.printDevice = /Android/i.test(navigator.userAgent)
      ? 'android'
      : 'default';
  }, []);

  useEffect(() => {
    const pageBg = currentColors.pageBg ?? '#ffffff';
    const leftEdgeBg = current.key === 'classic-navy'
      ? currentColors.sidebarBg ?? pageBg
      : pageBg;

    document.documentElement.style.setProperty('--android-print-page-bg', pageBg);
    document.documentElement.style.setProperty('--android-print-left-edge-bg', leftEdgeBg);
  }, [current.key, currentColors]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div
      className="studio-shell"
      style={{ '--active-accent': current.accent } as CSSProperties}
    >
      <a className="skip-link" href="#cv-preview">Skip to CV preview</a>

      <header className="studio-topbar">
        <div className="studio-brand" aria-label="Shaked Ashur CV studio">
          <div className="studio-brand-mark" aria-hidden="true">SA</div>
          <div className="studio-brand-copy">
            <span className="studio-brand-title">Shaked Ashur</span>
            <span className="studio-brand-subtitle">CV Design Studio</span>
          </div>
        </div>

        <div className="studio-topbar-actions">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
            <button
              type="button"
              className={lang === 'he' ? 'active' : ''}
              onClick={() => setLang('he')}
              aria-pressed={lang === 'he'}
            >
              עברית
            </button>
          </div>
          <span className="studio-progress" aria-live="polite">
            {String(currentIndex + 1).padStart(2, '0')} / {String(designs.length).padStart(2, '0')}
          </span>
          <div className="edit-actions" role="group" aria-label="Edit controls">
            {!editing && (
              <button className="studio-edit" type="button" onClick={() => setEditing(true)}>
                {lang === 'he' ? 'עריכה' : 'Edit'}
              </button>
            )}
            {editing && (
              <button className="studio-save" type="button" onClick={handleSave}>
                {lang === 'he' ? 'שמירה' : 'Save'}
              </button>
            )}
            <button className="studio-reset" type="button" onClick={handleReset}>
              {lang === 'he' ? 'איפוס' : 'Reset'}
            </button>
          </div>
          <button className="studio-print" type="button" onClick={printPdf}>
            {lang === 'he' ? 'הדפסה / PDF' : 'Print PDF'}
          </button>
          <button
            className="studio-menu-button"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-controls="design-switcher"
            aria-expanded={menuOpen}
          >
            <span aria-hidden="true"></span>
            <span className="studio-menu-text">Designs</span>
          </button>
        </div>
      </header>

      <div className="studio-layout">
        <aside
          id="design-switcher"
          className={`design-drawer ${menuOpen ? 'open' : ''}`}
          aria-label="CV design options"
        >
          <div className="design-drawer-head">
            <div>
              <p className="section-kicker">Gallery</p>
              <h2>Designs</h2>
            </div>
            <button
              className="drawer-close"
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close design menu"
            >
              x
            </button>
          </div>

          <div className="design-list">
            {designs.map((design, index) => (
              <button
                key={design.key}
                type="button"
                className={`design-card sw-btn ${active === design.key ? 'active' : ''}`}
                style={{ '--card-accent': design.accent } as CSSProperties}
                onClick={() => selectDesign(design.key)}
                aria-pressed={active === design.key}
              >
                <span className="design-card-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="design-card-copy">
                  <span className="design-card-name">{design.name}</span>
                  <span className="design-card-meta">
                    <span>{design.family}</span>
                    <span>{design.sub}</span>
                  </span>
                </span>
                <span className="design-card-palette" aria-hidden="true">
                  {design.palette.map(color => (
                    <span
                      key={`${design.key}-${color}`}
                      className="palette-dot"
                      style={{ backgroundColor: color }}
                    ></span>
                  ))}
                </span>
              </button>
            ))}
          </div>

        </aside>

        {menuOpen && (
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Close design menu"
            onClick={() => setMenuOpen(false)}
          ></button>
        )}

        <main className="workbench" id="cv-preview" tabIndex={-1}>
          <section className="preview-commandbar" aria-live="polite">
            <div className="preview-controls" aria-label="Design navigation">
              <button type="button" className="control-button" onClick={() => selectByOffset(-1)} aria-label="Previous design">
                <span aria-hidden="true">&lt;</span>
              </button>
              <span className="control-index">{String(currentIndex + 1).padStart(2, '0')}</span>
              <button type="button" className="control-button" onClick={() => selectByOffset(1)} aria-label="Next design">
                <span aria-hidden="true">&gt;</span>
              </button>
              <button className="mobile-designs-quick" type="button" onClick={() => setMenuOpen(true)}>
                {lang === 'he' ? 'עיצובים' : 'Designs'}
              </button>
              <div className="control-edit-actions">
                {!editing && (
                  <button className="control-edit" type="button" onClick={() => setEditing(true)}>
                    {lang === 'he' ? 'עריכה' : 'Edit'}
                  </button>
                )}
                {editing && (
                  <button className="control-save" type="button" onClick={handleSave}>
                    {lang === 'he' ? 'שמירה' : 'Save'}
                  </button>
                )}
                <button className="control-reset" type="button" onClick={handleReset}>
                  {lang === 'he' ? 'איפוס' : 'Reset'}
                </button>
              </div>
              <button className="control-print" type="button" onClick={printPdf}>
                {lang === 'he' ? 'הדפסה' : 'Print PDF'}
              </button>
            </div>
          </section>

          <section
            className={`theme-customizer ${customizerOpen ? 'open' : ''} ${lang === 'he' ? 'rtl' : 'ltr'}`}
            dir={lang === 'he' ? 'rtl' : 'ltr'}
            aria-label={lang === 'he' ? 'התאמה אישית' : 'Theme customizer'}
          >
            <button
              type="button"
              className="theme-customizer-toggle"
              onClick={() => setCustomizerOpen(o => !o)}
              aria-expanded={customizerOpen}
            >
              <span className="theme-icon" aria-hidden="true">✦</span>
              <span>{lang === 'he' ? 'התאמה אישית' : 'Customize'}</span>
              <span className="theme-chevron" aria-hidden="true">{customizerOpen ? '▾' : '▸'}</span>
            </button>

            <div className="theme-panel">
              <div className="theme-field">
                <label htmlFor="font-latin">
                  {lang === 'he' ? 'פונט אנגלית' : 'English font'}
                </label>
                <select
                  id="font-latin"
                  className="theme-select"
                  value={latinFontIdx}
                  onChange={e => setLatinFontIdx(Number(e.target.value))}
                  style={{ fontFamily: latinFont.stack }}
                >
                  {LATIN_FONTS.map((f, i) => (
                    <option key={f.name} value={i} style={{ fontFamily: f.stack }}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {lang === 'he' && (
                <div className="theme-field">
                  <label htmlFor="font-hebrew">פונט עברית</label>
                  <select
                    id="font-hebrew"
                    className="theme-select"
                    value={hebrewFontIdx}
                    onChange={e => setHebrewFontIdx(Number(e.target.value))}
                    style={{ fontFamily: hebrewFont.stack }}
                  >
                    {HEBREW_FONTS.map((f, i) => (
                      <option key={f.name} value={i} style={{ fontFamily: f.stack }}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentSlots.map(slot => {
                const label = lang === 'he' ? slot.labelHe : slot.label;
                return (
                  <div className="theme-field theme-color-field" key={slot.key}>
                    <label htmlFor={`color-${slot.key}`}>{label}</label>
                    <div className="theme-color-row">
                      <input
                        id={`color-${slot.key}`}
                        type="color"
                        className="theme-color"
                        value={currentColors[slot.key]}
                        onChange={e => updateColor(slot.key, e.target.value)}
                      />
                      <input
                        type="text"
                        className="theme-color-hex"
                        value={currentColors[slot.key]}
                        onChange={e => updateColor(slot.key, e.target.value)}
                        spellCheck={false}
                        aria-label={`${label} hex`}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="theme-reset"
                onClick={resetColors}
              >
                {lang === 'he' ? 'איפוס' : 'Reset'}
              </button>
            </div>
          </section>

          <style>{themeStyle}</style>

          <section className="canvas-area" aria-label="CV preview canvas">
            <div className="canvas-topline">
              <span>{current.name}</span>
              <span>A4 (21cm x 29.7cm)</span>
            </div>
            <div className="cv-stage" ref={stageRef}>
              <div
                className="cv-frame-shell"
                style={{
                  width: 794 * scale,
                  height: 1123 * scale,
                  '--preview-scale': scale,
                } as CSSProperties}
              >
                <div className="cv-frame">
                  <CvContext.Provider value={cvValue}>
                    {current.render()}
                  </CvContext.Provider>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
