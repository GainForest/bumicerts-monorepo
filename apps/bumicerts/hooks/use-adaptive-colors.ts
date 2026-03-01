"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { queryKeys } from "@/lib/query-keys";

type ExtractedColors = {
  background: string;
  foreground: string;
};
type AdaptiveColors = ExtractedColors & {
  backgroundMuted: string;
  foregroundMuted: string;
};

export function useAdaptiveColors(imageSrc: string | null): AdaptiveColors {
  const theme = useTheme();
  const resolvedTheme = theme.resolvedTheme ?? "light";
  const baseTheme =
    resolvedTheme === "light"
      ? { background: "#FFFFFF", foreground: "#000000" }
      : { background: "#000000", foreground: "#FFFFFF" };

  const { data } = useQuery({
    queryKey: queryKeys.adaptiveColors(imageSrc),
    queryFn: async (): Promise<ExtractedColors | null> => {
      if (!imageSrc) return null;
      const { extractColors } = await import("extract-colors");
      const colors = await extractColors(imageSrc);
      if (colors.length >= 2) {
        const [bg] = colors.sort((a, b) => b.area - a.area);
        const lightness = bg.lightness;
        if (colors.every((c) => Math.abs(c.lightness - 0.5) < 0.3)) {
          return {
            background: bg.hex,
            foreground: lightness > 0.5 ? "#000000" : "#FFFFFF",
          };
        } else {
          const bestFgColor = colors.find(
            (c) => getContrast(bg.hex, c.hex) > 4.5
          );
          return {
            background: bg.hex,
            foreground:
              bestFgColor?.hex ?? (lightness > 0.5 ? "#000000" : "#FFFFFF"),
          };
        }
      }
      return null;
    },
    enabled: !!imageSrc,
  });

  const finalExtractedColors = data ?? baseTheme;
  return {
    background: finalExtractedColors.background,
    foreground: finalExtractedColors.foreground,
    backgroundMuted:
      getLightness(finalExtractedColors.background) < 0.5
        ? adjustLightness(finalExtractedColors.background, 0.075)
        : adjustLightness(finalExtractedColors.background, -0.075),
    foregroundMuted:
      getLightness(finalExtractedColors.foreground) < 0.5
        ? adjustLightness(finalExtractedColors.foreground, 0.1)
        : adjustLightness(finalExtractedColors.foreground, -0.1),
  };
}

type RGB = [number, number, number];
type HexColor = string;

const hexToRgb = (hex: HexColor): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

const rgbToRelativeLuminance = (rgb: RGB): number => {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const getContrast = (hex1: HexColor, hex2: HexColor): number => {
  const lum1 = rgbToRelativeLuminance(hexToRgb(hex1));
  const lum2 = rgbToRelativeLuminance(hexToRgb(hex2));
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
};

const getLightness = (hex: HexColor): number =>
  rgbToRelativeLuminance(hexToRgb(hex));

const adjustLightness = (hex: HexColor, delta: number): HexColor => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  hsl[2] = Math.max(0, Math.min(1, hsl[2] + delta));
  return hslToHex(hsl);
};

const rgbToHsl = (rgb: RGB): [number, number, number] => {
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hslToHex = (hsl: [number, number, number]): HexColor => {
  const [h, s, l] = hsl;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    return t < 1/6 ? p + (q - p) * 6 * t
      : t < 1/2 ? q
      : t < 2/3 ? p + (q - p) * (2/3 - t) * 6
      : p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const bv = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
};
