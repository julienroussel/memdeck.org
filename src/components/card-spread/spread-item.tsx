import { Box } from "@mantine/core";
import type { MouseEvent, ReactNode } from "react";
import { cssVarCounterStyle } from "../../utils/style";

type SpreadItemProps = {
  kind: "card" | "number";
  index: number;
  size: number;
  label: string;
  hasCursor: boolean;
  onClick: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
  children: ReactNode;
};

// One component for both item kinds, so switching between card and number
// items keeps the same element type per position and reuses the DOM nodes.
// Without onClick the item is display-only, so it renders as a named image
// rather than an inert button that would add a tab stop.
export const SpreadItem = ({
  kind,
  index,
  size,
  label,
  hasCursor,
  onClick,
  children,
}: SpreadItemProps) => {
  const counterStyle = cssVarCounterStyle(index, size, 0);

  if (onClick === undefined && kind === "card") {
    return (
      <Box
        aria-label={label}
        className="cardSpreadCard"
        role="img"
        style={counterStyle}
      >
        {children}
      </Box>
    );
  }

  if (onClick === undefined) {
    return (
      <Box className="cardSpreadCard" style={counterStyle}>
        {children}
      </Box>
    );
  }

  return (
    <button
      aria-label={label}
      className="cardSpreadCard"
      data-card-index={kind === "card" ? index : undefined}
      data-number-index={kind === "number" ? index : undefined}
      onClick={onClick}
      style={{
        cursor: hasCursor ? "pointer" : "default",
        ...counterStyle,
      }}
      type="button"
    >
      {children}
    </button>
  );
};
