type Color =
  | {
      variable: string;
      opacity?: number;
    }
  | string;

export const getStripedBackground = (
  color1: Color,
  color2: Color,
  size = 4,
  angle = -55
) => {
  return `repeating-linear-gradient(
        ${angle}deg,
        ${
          typeof color1 === "string"
            ? color1
            : `color-mix(in oklab, var(${color1.variable}) ${
                color1.opacity ?? 100
              }%, transparent)`
        },
        ${
          typeof color1 === "string"
            ? color1
            : `color-mix(in oklab, var(${color1.variable}) ${
                color1.opacity ?? 100
              }%, transparent)`
        } ${size}px,
        ${
          typeof color2 === "string"
            ? color2
            : `color-mix(in oklab, var(${color2.variable}) ${
                color2.opacity ?? 100
              }%, transparent)`
        } ${size}px,
        ${
          typeof color2 === "string"
            ? color2
            : `color-mix(in oklab, var(${color2.variable}) ${
                color2.opacity ?? 100
              }%, transparent)`
        } ${size * 2}px
      )`;
};
