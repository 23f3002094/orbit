import type { Metadata } from "next";
import { Geist_Mono, Sora } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthGate, AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orbit — Plan with intention",
  description: "A calm calendar and focus space for intentional work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthProvider><AuthGate>{children}</AuthGate></AuthProvider><ThemeToggle /></body>
    </html>
  );
}
