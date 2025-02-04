import { CSSProperties } from 'react';

export type VarCSSProperty = CSSProperties &
  Record<`--${string}`, number | string>;
