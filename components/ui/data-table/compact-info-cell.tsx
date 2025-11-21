"use client";

import { ReactNode } from "react";

interface InfoLine {
  label?: string;
  value: ReactNode;
  className?: string;
  prefix?: string;
}

interface CompactInfoCellProps {
  primary?: InfoLine;
  secondary?: InfoLine;
  tertiary?: InfoLine;
  className?: string;
}

export function CompactInfoCell({
  primary,
  secondary,
  tertiary,
  className = "",
}: CompactInfoCellProps) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      {primary && (
        <div className={primary.className || "text-sm text-slate-700"}>
          {primary.prefix && <span className="text-slate-500">{primary.prefix} </span>}
          {primary.label && <span className="text-slate-500">{primary.label}: </span>}
          {primary.value}
        </div>
      )}
      {secondary && (
        <div className={secondary.className || "text-xs text-slate-500"}>
          {secondary.prefix && <span>{secondary.prefix} </span>}
          {secondary.label && <span>{secondary.label}: </span>}
          {secondary.value}
        </div>
      )}
      {tertiary && (
        <div className={tertiary.className || "text-xs text-slate-400"}>
          {tertiary.prefix && <span>{tertiary.prefix} </span>}
          {tertiary.label && <span>{tertiary.label}: </span>}
          {tertiary.value}
        </div>
      )}
    </div>
  );
}