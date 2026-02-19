"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, title, onClose, children, className }: Props) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />
      <div className={cn("relative w-full max-w-2xl glass rounded-3xl p-5", className)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            {title ? (
              <div className="text-neonCyan neon-cyan text-lg font-bold tracking-wide">{title}</div>
            ) : null}
          </div>
          <button className="text-neonCyan/90 hover:text-neonCyan" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
