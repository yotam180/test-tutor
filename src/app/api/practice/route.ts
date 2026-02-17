import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Shuffle array in place (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/practice - Get random questions for practice session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build where clause
    const where = courseId ? { courseId } : {};

    // Get all questions with their practice stats
    const questions = await prisma.question.findMany({
      where,
      include: {
        practiceStat: true,
        course: {
          select: { name: true },
        },
        page: {
          select: { pageNumber: true },
        },
      },
    });

    // Transform to include stat fields directly
    const questionsWithStats = questions.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      type: q.type,
      difficulty: q.difficulty,
      courseName: q.course.name,
      courseId: q.courseId,
      pageNumber: q.page.pageNumber,
      timesSeen: q.practiceStat?.timesSeen || 0,
      correctStreak: q.practiceStat?.correctStreak || 0,
    }));

    // Randomly shuffle and select questions
    const shuffled = shuffleArray(questionsWithStats);
    const selected = shuffled.slice(0, limit);

    return NextResponse.json({
      questions: selected,
      totalAvailable: questions.length,
    });
  } catch (error) {
    console.error("Error fetching practice questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
