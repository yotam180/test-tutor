import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { generateQuestionsFromImage } from "@/lib/gemini";

// POST /api/upload - Upload a page image and generate questions
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("courseId") as string | null;
    const pageNumber = parseInt(formData.get("pageNumber") as string) || 1;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Save the file
    const filePath = await saveUploadedFile(file, courseId, pageNumber);

    // Create page record
    const page = await prisma.page.create({
      data: {
        courseId,
        filePath,
        pageNumber,
      },
    });

    // Generate questions in background (don't await to return faster)
    // In a production app, you'd use a job queue
    generateQuestionsAndSave(page.id, courseId, filePath).catch((err) => {
      console.error("Error generating questions:", err);
    });

    return NextResponse.json({
      page,
      message: "Page uploaded. Questions are being generated...",
    });
  } catch (error) {
    console.error("Error uploading page:", error);
    return NextResponse.json(
      { error: "Failed to upload page" },
      { status: 500 }
    );
  }
}

async function generateQuestionsAndSave(
  pageId: string,
  courseId: string,
  filePath: string
) {
  try {
    const questions = await generateQuestionsFromImage(filePath);

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

    console.log(`Generated ${questions.length} questions for page ${pageId}`);
  } catch (error) {
    console.error("Error in generateQuestionsAndSave:", error);
    throw error;
  }
}
