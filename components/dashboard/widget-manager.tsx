"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { WIDGET_PROVIDER_GROUPS, WIDGET_REGISTRY, type WidgetRegistryItem } from "@/lib/widgets/registry";
import { isWidgetType, type WidgetType } from "@/lib/widgets/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface WidgetInstanceListItem {
  id: string;
  widget_type: WidgetType;
  position: number;
  is_visible: boolean;
  created_at: string;
}

interface WidgetManagerProps {
  initialWidgets: WidgetInstanceListItem[];
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  };
}

interface ApiErrorResponse {
  error: string;
}

interface ListApiResponse {
  widgets?: WidgetInstanceListItem[];
  error?: string;
}

interface CreateApiResponse {
  widget?: WidgetInstanceListItem;
  error?: string;
}

function getWidgetMeta(widgetType: WidgetType): WidgetRegistryItem | undefined {
  return WIDGET_REGISTRY.find((widget) => widget.type === widgetType);
}

function SortableWidgetItem({
  widget,
  onToggleVisibility,
  onDelete,
}: {
  widget: WidgetInstanceListItem;
  onToggleVisibility: (widgetId: string, nextValue: boolean) => Promise<void>;
  onDelete: (widgetId: string) => Promise<void>;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const meta = getWidgetMeta(widget.widget_type);
  const Icon = meta?.icon;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 ${isDragging ? "opacity-80" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Drag widget"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
            <p className="truncate text-sm font-medium">
              {meta?.displayName ?? widget.widget_type}
            </p>
            <Badge variant={widget.is_visible ? "secondary" : "outline-solid"}>
              {widget.is_visible ? "Visible" : "Hidden"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Type: {widget.widget_type} · Position: {widget.position}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void onToggleVisibility(widget.id, !widget.is_visible)}
            aria-label={widget.is_visible ? "Hide widget" : "Show widget"}
          >
            {widget.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void onDelete(widget.id)}
            aria-label="Delete widget"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function WidgetManager({ initialWidgets }: WidgetManagerProps): React.JSX.Element {
  const [widgets, setWidgets] = useState<WidgetInstanceListItem[]>(
    [...initialWidgets].sort((a, b) => a.position - b.position),
  );
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const sensors = useSensors(useSensor(PointerSensor));
  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.position - b.position),
    [widgets],
  );

  async function refreshWidgets(): Promise<void> {
    const response = await fetch("/api/widgets/instances", { cache: "no-store" });
    const json = (await response.json()) as ListApiResponse;
    if (!response.ok || !json.widgets) {
      throw new Error(json.error ?? "Unable to refresh widgets.");
    }
    setWidgets([...json.widgets].sort((a, b) => a.position - b.position));
  }

  async function onAddWidget(widgetType: WidgetType): Promise<void> {
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/widgets/instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ widget_type: widgetType }),
      });
      const json = (await response.json()) as CreateApiResponse;
      const createdWidget = json.widget;
      if (!response.ok || !createdWidget) {
        throw new Error(json.error ?? "Unable to add widget.");
      }
      setWidgets((current) => [...current, createdWidget].sort((a, b) => a.position - b.position));
      setIsPickerOpen(false);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add widget.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function onToggleVisibility(widgetId: string, isVisible: boolean): Promise<void> {
    setErrorMessage(null);
    const previous = widgets;
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === widgetId ? { ...widget, is_visible: isVisible } : widget,
      ),
    );
    const response = await fetch(`/api/widgets/${widgetId}/visibility`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_visible: isVisible }),
    });
    if (!response.ok) {
      const json = (await response.json()) as ApiErrorResponse;
      setWidgets(previous);
      setErrorMessage(json.error ?? "Unable to update visibility.");
    }
  }

  async function onDelete(widgetId: string): Promise<void> {
    setErrorMessage(null);
    const previous = widgets;
    setWidgets((current) => current.filter((widget) => widget.id !== widgetId));
    const response = await fetch(`/api/widgets/${widgetId}`, { method: "DELETE" });
    if (!response.ok) {
      const json = (await response.json()) as ApiErrorResponse;
      setWidgets(previous);
      setErrorMessage(json.error ?? "Unable to delete widget.");
      return;
    }
    await refreshWidgets();
  }

  async function persistReorder(nextWidgets: WidgetInstanceListItem[]): Promise<void> {
    const payload = nextWidgets.map((widget, index) => ({
      id: widget.id,
      position: index,
    }));
    const response = await fetch("/api/widgets/reorder", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: payload }),
    });
    if (!response.ok) {
      const json = (await response.json()) as ApiErrorResponse;
      throw new Error(json.error ?? "Unable to reorder widgets.");
    }
    await refreshWidgets();
  }

  async function onDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = sortedWidgets.findIndex((widget) => widget.id === active.id);
    const newIndex = sortedWidgets.findIndex((widget) => widget.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(sortedWidgets, oldIndex, newIndex).map((widget, index) => ({
      ...widget,
      position: index,
    }));
    const previous = widgets;
    setWidgets(reordered);
    try {
      await persistReorder(reordered);
    } catch (error: unknown) {
      setWidgets(previous);
      setErrorMessage(error instanceof Error ? error.message : "Unable to reorder widgets.");
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Widget instances</CardTitle>
            <CardDescription>
              Add widgets, change ordering, and toggle visibility for your public board.
            </CardDescription>
          </div>
          <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Add widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Widget picker</DialogTitle>
                <DialogDescription>
                  Choose widgets grouped by provider. You can add multiple from the same provider.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {WIDGET_PROVIDER_GROUPS.map((group) => {
                  const options = WIDGET_REGISTRY.filter((item) => item.provider === group.key);
                  return (
                    <div key={group.key} className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">{group.label}</p>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {options.map((widget) => {
                          const Icon = widget.icon;
                          return (
                            <li
                              key={widget.type}
                              className="rounded-md border bg-background p-3 text-sm"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <Icon className="size-4 text-muted-foreground" />
                                <span className="font-medium">{widget.displayName}</span>
                                <Badge variant="outline">
                                  {widget.gridWidth}×{widget.gridHeight}
                                </Badge>
                              </div>
                              <p className="mb-3 text-xs text-muted-foreground">
                                {widget.description}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isUpdating || !isWidgetType(widget.type)}
                                onClick={() => {
                                  if (isWidgetType(widget.type)) {
                                    void onAddWidget(widget.type);
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPickerOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          {sortedWidgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No widgets yet. Open the picker to add your first widget.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={sortedWidgets.map((widget) => widget.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {sortedWidgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      onToggleVisibility={onToggleVisibility}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

