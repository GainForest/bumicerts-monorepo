"use client";
import React from "react";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";

const CircularProgressBar = ({
  value,
  size = 40,
  text,
  strokeWidth = 9,
  textSize = 0.3,
  strokeColor = "var(--primary)",
  backgroundColor,
}: {
  value: number;
  size?: number;
  text?: React.ReactNode;
  textSize?: number;
  strokeWidth?: number;
  strokeColor?: string;
  backgroundColor?: string;
}) => {
  return (
    <div
      className="flex items-center justify-center relative"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <CircularProgressbar
        value={value}
        strokeWidth={strokeWidth}
        background
        styles={buildStyles({
          pathColor: strokeColor,
          strokeLinecap: "round",
          backgroundColor: backgroundColor ? backgroundColor : "transparent",
          trailColor: "color-mix(in oklab, var(--primary) 30%, transparent)",
        })}
      />
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs scale-75"
        style={{
          fontSize: `${size * textSize}px`,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export default CircularProgressBar;
