import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse-new");
import mammoth from "mammoth";

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  try {
    text = await extractText(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to extract text" },
      { status: 400 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "No text could be extracted from the file" },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const filePath = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("requirement-files")
    .upload(filePath, buffer, {
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError.message);
  }

  return NextResponse.json({
    text: text.trim(),
    file_path: uploadError ? null : filePath,
    filename: file.name,
  });
}
