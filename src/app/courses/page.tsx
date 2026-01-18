"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Course {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    pages: number;
    questions: number;
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data);
    } catch (e) {
      console.error("Failed to load courses:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!newCourseName.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCourseName.trim() }),
      });
      
      if (res.ok) {
        setNewCourseName("");
        loadCourses();
      }
    } catch (e) {
      console.error("Failed to create course:", e);
    } finally {
      setCreating(false);
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm("Are you sure you want to delete this course? All pages and questions will be lost.")) {
      return;
    }

    try {
      await fetch(`/api/courses/${id}`, { method: "DELETE" });
      loadCourses();
    } catch (e) {
      console.error("Failed to delete course:", e);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Courses</h1>
      </div>

      {/* Create Course Form */}
      <form onSubmit={createCourse} className="card flex gap-4">
        <input
          type="text"
          placeholder="Enter course name (e.g., Biology 101, Organic Chemistry)"
          className="input flex-1"
          value={newCourseName}
          onChange={(e) => setNewCourseName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create Course"}
        </button>
      </form>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="font-semibold mb-2">No courses yet</h3>
          <p className="text-[var(--muted)]">
            Create your first course to start uploading study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="card group">
              <div className="flex items-start justify-between mb-4">
                <Link href={`/courses/${course.id}`} className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:text-[var(--primary)] transition-colors">
                    {course.name}
                  </h3>
                </Link>
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors p-1"
                  title="Delete course"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                <span>{course._count.pages} pages</span>
                <span>{course._count.questions} questions</span>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex gap-2">
                <Link
                  href={`/courses/${course.id}`}
                  className="btn btn-outline text-xs flex-1"
                >
                  Manage
                </Link>
                <Link
                  href={`/practice?courseId=${course.id}`}
                  className="btn btn-primary text-xs flex-1"
                >
                  Practice
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
