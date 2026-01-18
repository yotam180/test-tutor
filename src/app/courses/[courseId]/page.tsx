"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Page {
  id: string;
  filePath: string;
  pageNumber: number;
  textExtract: string | null;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
  pages: Page[];
  _count: {
    questions: number;
  };
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "paste" | "text">("upload");
  const [textContent, setTextContent] = useState("");
  const [submittingText, setSubmittingText] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      }
    } catch (e) {
      console.error("Failed to load course:", e);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Handle clipboard paste
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      if (activeTab !== "paste") return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleFileUpload([file] as unknown as FileList);
          }
          return;
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab, courseId, course]);

  async function handleFileUpload(files: FileList | File[] | null) {
    if (!files || files.length === 0 || uploading) return;

    const fileArray = Array.from(files);
    setUploading(true);
    setUploadProgress(`Uploading ${fileArray.length} file(s)...`);

    const currentPageCount = course?.pages.length || 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Uploading ${i + 1}/${fileArray.length}: ${file.name || "pasted image"}`);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", courseId);
      formData.append("pageNumber", String(currentPageCount + i + 1));

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          alert(`Failed to upload ${file.name || "image"}: ${error.error}`);
        }
      } catch (e) {
        console.error("Upload error:", e);
        alert(`Failed to upload ${file.name || "image"}`);
      }
    }

    setUploadProgress("Processing complete! Questions are being generated in the background.");
    setTimeout(() => {
      setUploadProgress("");
      loadCourse();
    }, 2000);
    setUploading(false);
  }

  async function handleTextSubmit() {
    if (!textContent.trim() || submittingText) return;

    setSubmittingText(true);
    setUploadProgress("Processing text and generating questions...");

    try {
      const res = await fetch("/api/upload/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          text: textContent.trim(),
          pageNumber: (course?.pages.length || 0) + 1,
        }),
      });

      if (res.ok) {
        setTextContent("");
        setUploadProgress("Questions are being generated in the background.");
        setTimeout(() => {
          setUploadProgress("");
          loadCourse();
        }, 2000);
      } else {
        const error = await res.json();
        alert(`Failed to process text: ${error.error}`);
        setUploadProgress("");
      }
    } catch (e) {
      console.error("Text submit error:", e);
      alert("Failed to process text");
      setUploadProgress("");
    } finally {
      setSubmittingText(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }

  function getImageUrl(page: Page): string {
    if (!page.filePath) return "";
    const filename = page.filePath.split("/").pop();
    return `/api/uploads/${filename}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="font-semibold mb-2">Course not found</h3>
        <Link href="/courses" className="btn btn-primary mt-4">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/courses" className="text-sm text-[var(--muted)] hover:text-[var(--primary)] mb-2 block">
            ← Back to Courses
          </Link>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-[var(--muted)]">
            {course.pages.length} pages • {course._count.questions} questions
          </p>
        </div>
        <Link href={`/practice?courseId=${courseId}`} className="btn btn-primary">
          Practice This Course
        </Link>
      </div>

      {/* Input Section with Tabs */}
      <div className="card">
        {/* Tab Headers */}
        <div className="flex border-b border-[var(--border)] mb-6">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upload"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "paste"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Paste Image
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "text"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Enter Text
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-4">📤</div>
            <h3 className="font-semibold mb-2">Upload Study Materials</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Drag and drop images or PDFs, or click to select files
            </p>
            
            <input
              type="file"
              id="fileInput"
              className="hidden"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
            <label
              htmlFor="fileInput"
              className={`btn btn-primary ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {uploading ? "Uploading..." : "Select Files"}
            </label>
          </div>
        )}

        {/* Paste Tab */}
        {activeTab === "paste" && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold mb-2">Paste Image from Clipboard</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Copy an image from a PDF or screenshot and press <kbd className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--border)]">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--border)]">Cmd+V</kbd>
            </p>
            <p className="text-xs text-[var(--muted)]">
              You can also drag and drop images here
            </p>
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Enter Study Notes</h3>
              <p className="text-sm text-[var(--muted)] mb-4">
                Paste or type your study notes, and AI will generate practice questions from the text
              </p>
            </div>
            <textarea
              className="input min-h-[200px] resize-y"
              placeholder="Paste your study notes here...

Example:
The mitochondria is the powerhouse of the cell. It produces ATP through oxidative phosphorylation..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={submittingText}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--muted)]">
                {textContent.length} characters
              </span>
              <button
                onClick={handleTextSubmit}
                disabled={!textContent.trim() || submittingText}
                className={`btn btn-primary ${(!textContent.trim() || submittingText) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {submittingText ? "Processing..." : "Generate Questions"}
              </button>
            </div>
          </div>
        )}

        {/* Progress Message */}
        {uploadProgress && (
          <div className="mt-4 text-sm text-[var(--primary)] animate-pulse text-center">
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Pages Grid */}
      {course.pages.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="font-semibold mb-2">No pages yet</h3>
          <p className="text-[var(--muted)]">
            Upload some study materials to get started.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Uploaded Pages</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {course.pages.map((page) => (
              <div key={page.id} className="card p-2">
                {page.filePath ? (
                  <div className="aspect-[3/4] bg-[var(--border)] rounded-lg overflow-hidden mb-2">
                    <img
                      src={getImageUrl(page)}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-[var(--border)] rounded-lg overflow-hidden mb-2 p-3 flex items-start">
                    <p className="text-xs text-[var(--muted)] line-clamp-[12] overflow-hidden">
                      {page.textExtract || "Text content"}
                    </p>
                  </div>
                )}
                <div className="text-center text-sm text-[var(--muted)]">
                  Page {page.pageNumber}
                  {!page.filePath && " (text)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
