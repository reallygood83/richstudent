import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RichStudent - 경제 교육 시뮬레이션",
  description: "학생들의 경제 교육을 위한 가상 경제 시뮬레이션 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen flex flex-col`}
      >
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
