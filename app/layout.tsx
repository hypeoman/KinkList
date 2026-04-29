import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KinkList Builder",
  description: "Static KinkList app for GitHub Pages"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
