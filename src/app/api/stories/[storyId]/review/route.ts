import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { review_status, review_comment } = await request.json();

  const { error } = await supabase
    .from("generated_stories")
    .update({
      review_status,
      review_comment: review_comment || null,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", storyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
