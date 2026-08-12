import type { CSSProperties } from 'react';
import { useEdit } from './CvContext';

function resolveByPath(obj: unknown, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type Props = {
  path: string;
  as?: keyof HTMLElementTagNameMap;
  className?: string;
  style?: CSSProperties;
};

export function Editable({ path, as = 'span', className, style }: Props) {
  const { data, editing, setOverride } = useEdit();
  const value = resolveByPath(data, path);
  const Tag = as as 'span';

  if (!editing) {
    if (!value) return null;
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  const display = value || '\u00a0';
  return (
    <Tag
      key={value}
      className={`${className ?? ''} cv-editable`.trim()}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const next = (e.currentTarget as HTMLElement).innerText.replace(/\u00a0/g, ' ').trim();
        if (next !== value) setOverride(path, next);
      }}
      dangerouslySetInnerHTML={{ __html: escapeHtml(display) }}
    />
  );
}
