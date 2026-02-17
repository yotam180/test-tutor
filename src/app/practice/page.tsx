"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  question: string;
  answer: string;
  type: string;
  difficulty: string;
  courseName: string;
  courseId: string;
  pageNumber: number;
  timesSeen: number;
  correctStreak: number;
}

interface Course {
  id: string;
  name: string;
}

function PracticeContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || "");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  // Load courses for filter
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();
        setCourses(data);
      } catch (e) {
        console.error("Failed to load courses:", e);
      }
    }
    loadCourses();
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedCourseId
        ? `/api/practice?courseId=${selectedCourseId}&limit=10`
        : "/api/practice?limit=10";
      
      const res = await fetch(url);
      const data = await res.json();
      
      setQuestions(data.questions || []);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSessionStats({ correct: 0, incorrect: 0 });
    } catch (e) {
      console.error("Failed to load questions:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];

  const recordAnswer = useCallback(async (correct: boolean) => {
    if (answering || !currentQuestion) return;

    setAnswering(true);
    try {
      await fetch("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          correct,
        }),
      });

      setSessionStats((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
      }));

      setFeedbackMessage(correct ? "✓ Correct!" : "✗ Incorrect");

      // Move to next question after short delay
      setTimeout(() => {
        setFeedbackMessage("");
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((i) => i + 1);
          setShowAnswer(false);
        } else {
          // Session complete - reload questions
          loadQuestions();
        }
      }, 1500);
    } catch (e) {
      console.error("Failed to record answer:", e);
    } finally {
      setAnswering(false);
    }
  }, [answering, currentQuestion, currentIndex, questions.length, loadQuestions]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.code === "Space" && !showAnswer && currentQuestion) {
        e.preventDefault();
        setShowAnswer(true);
      } else if ((e.key === "1" || e.key === "n") && showAnswer && !feedbackMessage) {
        e.preventDefault();
        recordAnswer(false);
      } else if ((e.key === "2" || e.key === "y") && showAnswer && !feedbackMessage) {
        e.preventDefault();
        recordAnswer(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, currentQuestion, feedbackMessage, recordAnswer]);

  function getTypeBadge(type: string) {
    switch (type) {
      case "short":
        return <span className="badge badge-blue">Quick Recall</span>;
      case "explanation":
        return <span className="badge badge-green">Explanation</span>;
      case "extra":
        return <span className="badge badge-purple">Integration</span>;
      default:
        return null;
    }
  }

  function getDifficultyBadge(difficulty: string) {
    switch (difficulty) {
      case "easy":
        return <span className="badge badge-green">Easy</span>;
      case "medium":
        return <span className="badge badge-orange">Medium</span>;
      case "hard":
        return <span className="badge badge-purple">Hard</span>;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Practice</h1>
        <div className="flex items-center gap-4">
          <select
            className="input w-48"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Session Stats */}
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--success)] font-medium">{sessionStats.correct}</span>
          <span className="text-[var(--muted)]">correct</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--danger)] font-medium">{sessionStats.incorrect}</span>
          <span className="text-[var(--muted)]">incorrect</span>
        </div>
        <div className="text-[var(--muted)]">
          {currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Question Card */}
      {questions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="font-semibold mb-2">No questions available</h3>
          <p className="text-[var(--muted)] mb-4">
            {selectedCourseId
              ? "This course doesn't have any questions yet."
              : "Upload some study materials to generate questions."}
          </p>
          <Link href="/courses" className="btn btn-primary">
            Go to Courses
          </Link>
        </div>
      ) : currentQuestion ? (
        <div className="card">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getTypeBadge(currentQuestion.type)}
              {getDifficultyBadge(currentQuestion.difficulty)}
            </div>
            <div className="text-xs text-[var(--muted)]">
              {currentQuestion.courseName} • Page {currentQuestion.pageNumber}
            </div>
          </div>

          {/* Question */}
          <div className="text-lg font-medium mb-6 leading-relaxed">
            {currentQuestion.question}
          </div>

          {/* Stats */}
          <div className="text-xs text-[var(--muted)] mb-4">
            Seen {currentQuestion.timesSeen} times • 
            Streak: {currentQuestion.correctStreak}
          </div>

          {/* Answer Section */}
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="btn btn-outline w-full"
            >
              Show Answer
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                <div className="text-xs text-[var(--muted)] mb-2">Answer</div>
                <div className="leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.answer}
                </div>
              </div>

              {feedbackMessage ? (
                <div className={`text-center py-3 rounded-lg ${
                  feedbackMessage.startsWith("✓")
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--danger)]/10 text-[var(--danger)]"
                }`}>
                  {feedbackMessage}
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => recordAnswer(false)}
                    className="btn btn-danger flex-1"
                    disabled={answering}
                  >
                    I Didn&apos;t Know
                  </button>
                  <button
                    onClick={() => recordAnswer(true)}
                    className="btn btn-success flex-1"
                    disabled={answering}
                  >
                    I Knew It
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Keyboard Shortcuts */}
      <div className="text-center text-xs text-[var(--muted)]">
        Press <kbd className="px-1.5 py-0.5 bg-[var(--card)] rounded border border-[var(--border)]">Space</kbd> to show answer,{" "}
        <kbd className="px-1.5 py-0.5 bg-[var(--card)] rounded border border-[var(--border)]">1</kbd> for incorrect,{" "}
        <kbd className="px-1.5 py-0.5 bg-[var(--card)] rounded border border-[var(--border)]">2</kbd> for correct
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}
