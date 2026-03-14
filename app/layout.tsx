import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
var k='timese-theme',s=localStorage.getItem(k),d=window.matchMedia('(prefers-color-scheme: dark)').matches;
var t=s||(d?'dark':'light');
if(t==='dark')document.documentElement.setAttribute('data-theme','dark');
else document.documentElement.removeAttribute('data-theme');
})();
`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider session={session}>
          <ThemeProvider>
            <LanguageProvider>
              <TranslationProvider>
                <AutoTranslate />
                {children}
              </TranslationProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
