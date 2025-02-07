import { CSSProperties } from 'react';

type VarCSSProperty = CSSProperties & Record<`--${string}`, number | string>;

export const cssVarCounterStyle = (
  index: number,
  size: number,
  offset: number,
) =>
  ({
    '--i': index + 1 - size + offset,
  }) as VarCSSProperty;
