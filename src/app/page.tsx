"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  totalCourses: number;
  totalQuestions: number;
  questionsToReview: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [coursesRes, practiceRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/practice?limit=1000"),
        ]);
        
        const courses = await coursesRes.json();
        const practice = await practiceRes.json();
        
        const now = new Date();
        const questionsToReview = practice.questions?.filter(
          (q: { nextDueAt: string | null; timesSeen: number }) => 
            q.timesSeen === 0 || (q.nextDueAt && new Date(q.nextDueAt) <= now)
        ).length || 0;

        setStats({
          totalCourses: courses.length || 0,
          totalQuestions: practice.totalAvailable || 0,
          questionsToReview,
        });
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">
          Study Smarter with AI
        </h1>
        <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto mb-8">
          Upload your study materials and let AI generate practice questions.
          Master any subject with spaced repetition learning.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/courses" className="btn btn-primary text-base px-6 py-3">
            Get Started
          </Link>
          <Link href="/practice" className="btn btn-outline text-base px-6 py-3">
            Start Practicing
          </Link>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-[var(--primary)]">
              {stats.totalCourses}
            </div>
            <div className="text-[var(--muted)]">Courses</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-[var(--success)]">
              {stats.totalQuestions}
            </div>
            <div className="text-[var(--muted)]">Questions</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-[var(--warning)]">
              {stats.questionsToReview}
            </div>
            <div className="text-[var(--muted)]">Due for Review</div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="text-2xl mb-3">📄</div>
          <h3 className="font-semibold mb-2">Upload Study Materials</h3>
          <p className="text-sm text-[var(--muted)]">
            Upload PDF pages or images from your textbooks, notes, or slides.
          </p>
        </div>
        <div className="card">
          <div className="text-2xl mb-3">🤖</div>
          <h3 className="font-semibold mb-2">AI Question Generation</h3>
          <p className="text-sm text-[var(--muted)]">
            Our AI analyzes your materials and creates diverse practice questions.
          </p>
        </div>
        <div className="card">
          <div className="text-2xl mb-3">🧠</div>
          <h3 className="font-semibold mb-2">Spaced Repetition</h3>
          <p className="text-sm text-[var(--muted)]">
            Questions you struggle with appear more often. Master topics efficiently.
          </p>
        </div>
      </section>
    </div>
  );
}
