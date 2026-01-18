import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ filename: string }> };

// GET /api/uploads/[filename] - Serve uploaded files
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { filename } = await context.params;
    
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(filename);
    const filePath = path.join(process.cwd(), "uploads", sanitized);

    const buffer = await readFile(filePath);

    // Determine content type
    const ext = path.extname(sanitized).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
