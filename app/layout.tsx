import type { Metadata } from "next";
import { Bungee, Red_Hat_Display } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  weight: "400",
  variable: "--font-bungee",
  subsets: ["latin"],
});

const redHatDisplay = Red_Hat_Display({
  weight: "400",
  variable: "--font-red-hat-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vintage Photobooth",
  description: "Capture and share your vintage-style photos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bungee.variable} ${redHatDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
