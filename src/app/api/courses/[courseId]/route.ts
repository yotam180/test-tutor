import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ courseId: string }> };

// GET /api/courses/[courseId] - Get a single course with its pages
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { courseId } = await context.params;
    
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[courseId] - Delete a course
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { courseId } = await context.params;
    
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
