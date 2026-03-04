import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { TranslationProvider } from "./context/TranslationContext";
import { AutoTranslate } from "./components/AutoTranslate";
import { authOptions } from "./api/auth/[...nextauth]/route";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timese - Bill Management for SMBs",
  description: "Manage bills for SMBs",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch session server-side to pass to AuthProvider
  // This prevents the CLIENT_FETCH_ERROR during development when 
  // Turbopack hasn't compiled the /api/auth route yet
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider session={session}>
          <LanguageProvider>
            <TranslationProvider>
              <AutoTranslate />
              {children}
            </TranslationProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
