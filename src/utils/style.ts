import type { CSSProperties } from "react";

type VarCSSProperty = CSSProperties & Record<`--${string}`, number | string>;

export const cssVarCounterStyle = (
  index: number,
  size: number,
  offset: number
): CSSProperties & { "--i": number } =>
  ({
    "--i": index + 1 - size + offset,
  }) satisfies VarCSSProperty;
