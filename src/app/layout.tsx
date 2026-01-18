import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Test Tutor - AI-Powered Flashcards",
  description: "Study smarter with AI-generated questions from your study materials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📚</span>
              Test Tutor
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/courses" className="text-sm hover:text-[var(--primary)] transition-colors">
                Courses
              </Link>
              <Link href="/practice" className="btn btn-primary">
                Practice
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
