import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liga da Terça",
  description: "CS2 Performance Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
