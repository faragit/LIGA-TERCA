"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  leftIcon?: React.ReactNode;
};

export function Button({ className, variant="primary", leftIcon, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-neonCyan/30 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-gradient-to-r from-neonViolet to-blue-500 text-white shadow-neon hover:shadow-neonStrong",
    ghost:
      "bg-transparent border border-neonCyan/25 text-slate-100 hover:bg-white/5",
    danger:
      "bg-red-500/15 border border-red-400/25 text-red-200 hover:bg-red-500/20",
  } as const;

  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {leftIcon}
      {props.children}
    </button>
  );
}
