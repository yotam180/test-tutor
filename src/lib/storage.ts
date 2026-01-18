import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function ensureUploadsDir(): Promise<void> {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

export async function saveUploadedFile(
  file: File,
  courseId: string,
  pageNumber: number
): Promise<string> {
  await ensureUploadsDir();

  const ext = path.extname(file.name) || ".png";
  const filename = `${courseId}_page_${pageNumber}_${Date.now()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return filePath;
}

export function getPublicPath(filePath: string): string {
  // Return relative path from uploads dir
  return `/api/uploads/${path.basename(filePath)}`;
}
