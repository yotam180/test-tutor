import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQuestionsFromText } from "@/lib/gemini";

// POST /api/upload/text - Process text and generate questions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, text, pageNumber } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text content is required" }, { status: 400 });
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Create page record with text content (no file path)
    const page = await prisma.page.create({
      data: {
        courseId,
        filePath: "", // Empty for text-based pages
        pageNumber: pageNumber || 1,
        textExtract: text.trim(),
      },
    });

    // Generate questions in background
    generateQuestionsAndSave(page.id, courseId, text.trim()).catch((err) => {
      console.error("Error generating questions from text:", err);
    });

    return NextResponse.json({
      page,
      message: "Text processed. Questions are being generated...",
    });
  } catch (error) {
    console.error("Error processing text:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}

async function generateQuestionsAndSave(
  pageId: string,
  courseId: string,
  text: string
) {
  try {
    const questions = await generateQuestionsFromText(text);

    // Save all questions to database
    await prisma.question.createMany({
      data: questions.map((q) => ({
        courseId,
        pageId,
        question: q.question,
        answer: q.answer,
        type: q.type,
        difficulty: q.difficulty,
      })),
    });

    // Create practice stats for each question
    const savedQuestions = await prisma.question.findMany({
      where: { pageId },
    });

    await prisma.practiceStat.createMany({
      data: savedQuestions.map((q) => ({
        questionId: q.id,
      })),
    });

    console.log(`Generated ${questions.length} questions from text for page ${pageId}`);
  } catch (error) {
    console.error("Error in generateQuestionsAndSave:", error);
    throw error;
  }
}
