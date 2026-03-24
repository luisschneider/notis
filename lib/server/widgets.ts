import { createClient } from "@/lib/supabase/server";
import type { WidgetInstanceRow } from "@/lib/supabase/types";
import type { WidgetType } from "@/lib/widgets/types";
import { createDefaultWidgetData, isWidgetType } from "@/lib/widgets/types";

function toWidgetType(value: string): WidgetType {
  if (!isWidgetType(value)) {
    throw new Error(`Unsupported widget type: ${value}`);
  }
  return value;
}

interface CreateWidgetInput {
  userId: string;
  widgetType: WidgetType;
}

export async function listWidgetInstancesByUserId(userId: string): Promise<WidgetInstanceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("widget_instances")
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to list widgets: ${error.message}`);
  }

  return (data ?? []).map((widget) => ({
    ...widget,
    widget_type: toWidgetType(widget.widget_type),
  })) as WidgetInstanceRow[];
}

async function getNextPosition(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("widget_instances")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read widget positions: ${error.message}`);
  }

  if (!data) {
    return 0;
  }

  return data.position + 1;
}

export async function createWidgetInstance(input: CreateWidgetInput): Promise<WidgetInstanceRow> {
  const supabase = await createClient();
  const nextPosition = await getNextPosition(input.userId);
  const defaults = createDefaultWidgetData(input.widgetType);

  const { data, error } = await supabase
    .from("widget_instances")
    .insert({
      user_id: input.userId,
      widget_type: input.widgetType,
      position: nextPosition,
      config: defaults.config,
      data: defaults.data,
      is_visible: true,
    })
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to create widget: ${error?.message ?? "Unknown error"}`);
  }

  return {
    ...(data as WidgetInstanceRow),
    widget_type: toWidgetType(data.widget_type),
  };
}

export async function deleteWidgetInstance(widgetId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("widget_instances")
    .delete()
    .eq("id", widgetId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete widget: ${error.message}`);
  }
}

export async function toggleWidgetInstanceVisibility(
  widgetId: string,
  userId: string,
  isVisible: boolean,
): Promise<WidgetInstanceRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("widget_instances")
    .update({ is_visible: isVisible })
    .eq("id", widgetId)
    .eq("user_id", userId)
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to update widget visibility: ${error?.message ?? "Unknown error"}`);
  }

  return {
    ...(data as WidgetInstanceRow),
    widget_type: toWidgetType(data.widget_type),
  };
}

export async function reorderWidgetInstances(
  userId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = await createClient();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const widgetId = orderedIds[index];
    const { error } = await supabase
      .from("widget_instances")
      .update({ position: index })
      .eq("id", widgetId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to reorder widget ${widgetId}: ${error.message}`);
    }
  }
}

export async function updateWidgetConfigForUser(
  widgetId: string,
  userId: string,
  config: Record<string, unknown>,
): Promise<WidgetInstanceRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("widget_instances")
    .update({ config })
    .eq("id", widgetId)
    .eq("user_id", userId)
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to update widget config: ${error?.message ?? "Unknown error"}`);
  }

  return {
    ...(data as WidgetInstanceRow),
    widget_type: toWidgetType(data.widget_type),
  };
}

export async function getWidgetInstanceById(
  userId: string,
  widgetId: string,
): Promise<WidgetInstanceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("widget_instances")
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .eq("id", widgetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch widget: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as WidgetInstanceRow),
    widget_type: toWidgetType(data.widget_type),
  };
}

interface UpdateWidgetInstanceInput {
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export async function updateWidgetInstanceById(
  userId: string,
  widgetId: string,
  input: UpdateWidgetInstanceInput,
): Promise<WidgetInstanceRow> {
  const supabase = await createClient();
  const payload: {
    config?: Record<string, unknown>;
    data?: Record<string, unknown>;
  } = {};

  if (input.config) {
    payload.config = input.config;
  }
  if (input.data) {
    payload.data = input.data;
  }

  const { data, error } = await supabase
    .from("widget_instances")
    .update(payload)
    .eq("id", widgetId)
    .eq("user_id", userId)
    .select(
      "id, user_id, widget_type, position, config, data, is_visible, last_synced_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to update widget: ${error?.message ?? "Unknown error"}`);
  }

  return {
    ...(data as WidgetInstanceRow),
    widget_type: toWidgetType(data.widget_type),
  };
}
