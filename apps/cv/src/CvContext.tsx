import { createContext, useContext } from 'react';
import { cvData, type CVData } from './cvData';

export type Lang = 'en' | 'he';

export type TextOverrides = Record<string, string>;

export type CvContextValue = {
  data: CVData;
  lang: Lang;
  editing: boolean;
  setOverride: (path: string, value: string) => void;
};

export const CvContext = createContext<CvContextValue>({
  data: cvData,
  lang: 'en',
  editing: false,
  setOverride: () => {},
});

export function useCv() {
  return useContext(CvContext).data;
}

export function useLang(): Lang {
  return useContext(CvContext).lang;
}

export function useEdit() {
  return useContext(CvContext);
}
