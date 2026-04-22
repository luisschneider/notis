import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const readingListSchema = z.object({
  widget_instance_id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  author: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  description: z
    .string()
    .trim()
    .max(280)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  item_type: z.enum(["article", "book", "podcast", "video", "other"]),
});

type ReadingListInput = z.infer<typeof readingListSchema>;

const legacyReadingListSchema = z.object({
  widget_id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  author: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  description: z
    .string()
    .trim()
    .max(280)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  item_type: z.enum(["article", "book", "podcast", "video", "other"]),
});

type LegacyReadingListInput = z.infer<typeof legacyReadingListSchema>;

interface ReadingListItemRecord {
  id: string;
  user_id: string;
  widget_instance_id: string;
  title: string;
  url: string | null;
  author: string | null;
  description: string | null;
  item_type: "article" | "book" | "podcast" | "video" | "other";
  added_at: string;
}

interface GetResponse {
  items?: ReadingListItemRecord[];
  error?: string;
}

interface MutationResponse {
  item?: ReadingListItemRecord;
  success?: boolean;
  error?: string;
}

export async function GET(request: Request): Promise<NextResponse<GetResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const widgetInstanceId = url.searchParams.get("widget_instance_id");
  if (!widgetInstanceId) {
    return NextResponse.json(
      { error: "widget_instance_id is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reading_list_items")
    .select(
      "id, user_id, widget_instance_id, title, url, author, description, item_type, added_at",
    )
    .eq("user_id", user.id)
    .eq("widget_instance_id", widgetInstanceId)
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { items: (data ?? []) as ReadingListItemRecord[] },
    { status: 200 },
  );
}

export async function POST(request: Request): Promise<NextResponse<MutationResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: ReadingListInput | LegacyReadingListInput;
  try {
    const json = (await request.json()) as unknown;
    const parsed = readingListSchema.safeParse(json);
    payload = parsed.success ? parsed.data : legacyReadingListSchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reading_list_items")
    .insert({
      user_id: user.id,
      widget_instance_id:
        "widget_instance_id" in payload ? payload.widget_instance_id : payload.widget_id,
      title: payload.title,
      url: payload.url,
      author: payload.author,
      description: payload.description,
      item_type: payload.item_type,
    })
    .select(
      "id, user_id, widget_instance_id, title, url, author, description, item_type, added_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to create reading list item." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { item: data as ReadingListItemRecord },
    { status: 201 },
  );
}

export async function DELETE(request: Request): Promise<NextResponse<MutationResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("reading_list_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
