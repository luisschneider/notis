import {
  deleteWidgetInstance,
  listWidgetInstancesByUserId,
} from "@/lib/server/widgets";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  { params }: Params,
): Promise<NextResponse<{ error?: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const widgets = await listWidgetInstancesByUserId(user.id);
  const existing = widgets.find((widget) => widget.id === id);

  if (!existing) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  await deleteWidgetInstance(id, user.id);
  return NextResponse.json({}, { status: 204 });
}
