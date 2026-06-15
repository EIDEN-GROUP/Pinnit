import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function attachProfiles(comments: any[], supabase: any) {
  if (!comments || comments.length === 0) return comments;

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.id, { username: p.username, avatar_url: p.avatar_url }])
  );

  return comments.map((c) => ({
    ...c,
    profiles: profileMap[c.user_id] ?? { username: null, avatar_url: null },
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site_id = searchParams.get("site_id");
  const page_url = searchParams.get("page_url");

  if (!site_id || !page_url) {
    return NextResponse.json({ error: "site_id and page_url required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("site_id", site_id)
    .eq("page_url", page_url)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await attachProfiles(data, supabase);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { site_id, page_url, x_pos, y_pos, scroll_x, scroll_y, text, image_url } = body;

  if (!site_id || !page_url || x_pos === undefined || y_pos === undefined || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      site_id,
      page_url,
      x_pos,
      y_pos,
      scroll_x: scroll_x ?? 0,
      scroll_y: scroll_y ?? 0,
      text,
      image_url: image_url ?? null,
      user_id: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await attachProfiles([data], supabase);
  return NextResponse.json(result[0], { status: 201 });
}
