import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeneratedQuestion {
  question: string;
  answer: string;
  type: "short" | "explanation" | "extra";
  difficulty: "easy" | "medium" | "hard";
}

export async function generateQuestionsFromImage(
  imagePath: string
): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Read the image file
  const imageBuffer = await readFile(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const mimeType = getMimeType(imagePath);

  const prompt = `You are an expert tutor creating study questions from educational material.

Analyze this image of a study page and generate 8-15 questions to help a student learn the material.

Create a mix of question types:
1. SHORT (3-5 questions): Simple recall questions with 1-3 word answers. Test memorization of key terms, definitions, or facts.
2. EXPLANATION (3-5 questions): Questions requiring a paragraph explanation. Test understanding of concepts, processes, or relationships.
3. EXTRA (2-4 questions): Integration questions that go beyond what's explicitly written. These assume the student has broader knowledge and should connect concepts, apply to real-world scenarios, or explore implications.

For each question, also assign a difficulty:
- EASY: Basic recall or straightforward understanding
- MEDIUM: Requires connecting ideas or moderate analysis
- HARD: Complex reasoning, synthesis, or application

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no code blocks, just the raw JSON.

The JSON array should have objects with these exact fields:
- "question": the question text
- "answer": the correct answer
- "type": one of "short", "explanation", or "extra"
- "difficulty": one of "easy", "medium", or "hard"

Example format:
[{"question":"What is X?","answer":"Y","type":"short","difficulty":"easy"}]`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const questions = parseQuestionsResponse(text);
    return questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions from image");
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  return mimeTypes[ext] || "image/png";
}

function parseQuestionsResponse(text: string): GeneratedQuestion[] {
  // Clean up the response - remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    return parsed.map((q: Record<string, unknown>) => ({
      question: String(q.question || ""),
      answer: String(q.answer || ""),
      type: validateType(String(q.type || "short")),
      difficulty: validateDifficulty(String(q.difficulty || "medium")),
    }));
  } catch (error) {
    console.error("Failed to parse questions JSON:", error, "Raw text:", text);
    throw new Error("Failed to parse questions from AI response");
  }
}

function validateType(type: string): "short" | "explanation" | "extra" {
  if (["short", "explanation", "extra"].includes(type)) {
    return type as "short" | "explanation" | "extra";
  }
  return "short";
}

function validateDifficulty(diff: string): "easy" | "medium" | "hard" {
  if (["easy", "medium", "hard"].includes(diff)) {
    return diff as "easy" | "medium" | "hard";
  }
  return "medium";
}

export async function generateQuestionsFromText(
  text: string
): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an expert tutor creating study questions from educational material.

Analyze the following study notes/text and generate 8-15 questions to help a student learn the material.

TEXT TO ANALYZE:
"""
${text}
"""

Create a mix of question types:
1. SHORT (3-5 questions): Simple recall questions with 1-3 word answers. Test memorization of key terms, definitions, or facts.
2. EXPLANATION (3-5 questions): Questions requiring a paragraph explanation. Test understanding of concepts, processes, or relationships.
3. EXTRA (2-4 questions): Integration questions that go beyond what's explicitly written. These assume the student has broader knowledge and should connect concepts, apply to real-world scenarios, or explore implications.

For each question, also assign a difficulty:
- EASY: Basic recall or straightforward understanding
- MEDIUM: Requires connecting ideas or moderate analysis
- HARD: Complex reasoning, synthesis, or application

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no code blocks, just the raw JSON.

The JSON array should have objects with these exact fields:
- "question": the question text
- "answer": the correct answer
- "type": one of "short", "explanation", or "extra"
- "difficulty": one of "easy", "medium", or "hard"

Example format:
[{"question":"What is X?","answer":"Y","type":"short","difficulty":"easy"}]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse the JSON response
    const questions = parseQuestionsResponse(responseText);
    return questions;
  } catch (error) {
    console.error("Error generating questions from text:", error);
    throw new Error("Failed to generate questions from text");
  }
}
