import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RichStudent - 미래의 금융 리더를 키우는 특별한 경험",
  description: "실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며 경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼입니다. 학생들의 금융 이해력과 경제적 사고력을 키워주세요.",
  keywords: ["경제교육", "금융교육", "투자교육", "학생교육", "시뮬레이션", "가상거래", "경제원리", "금융리터러시"],
  authors: [{ name: "RichStudent Team" }],
  creator: "RichStudent",
  publisher: "RichStudent",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://richstudent.vercel.app",
    siteName: "RichStudent",
    title: "RichStudent - 미래의 금융 리더를 키우는 특별한 경험",
    description: "실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며 경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼",
    images: [
      {
        url: "/og-image-simple.svg",
        width: 1200,
        height: 630,
        alt: "RichStudent - 금융 교육 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RichStudent - 미래의 금융 리더를 키우는 특별한 경험",
    description: "실제 금융 시장과 똑같은 환경에서 투자, 거래, 대출을 체험하며 경제 원리를 자연스럽게 학습하는 혁신적인 교육 플랫폼",
    images: ["/og-image-simple.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
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
