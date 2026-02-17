import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/practice/answer - Record an answer and update stats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, correct } = body;

    if (!questionId || typeof correct !== "boolean") {
      return NextResponse.json(
        { error: "questionId and correct (boolean) are required" },
        { status: 400 }
      );
    }

    // Get current practice stat
    let stat = await prisma.practiceStat.findUnique({
      where: { questionId },
    });

    if (!stat) {
      // Create stat if doesn't exist
      stat = await prisma.practiceStat.create({
        data: { questionId },
      });
    }

    // Update the practice stat
    const updatedStat = await prisma.practiceStat.update({
      where: { questionId },
      data: {
        correctStreak: correct ? stat.correctStreak + 1 : 0,
        lastSeenAt: new Date(),
        timesSeen: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      stat: updatedStat,
    });
  } catch (error) {
    console.error("Error recording answer:", error);
    return NextResponse.json(
      { error: "Failed to record answer" },
      { status: 500 }
    );
  }
}
