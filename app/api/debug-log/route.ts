import { appendFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface DebugLogPayload {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const DEBUG_LOG_PATH = "/opt/cursor/logs/debug.log";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDebugLogPayload(value: unknown): DebugLogPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const hypothesisId = value.hypothesisId;
  const location = value.location;
  const message = value.message;
  const data = value.data;
  const timestamp = value.timestamp;

  if (typeof hypothesisId !== "string") {
    return null;
  }
  if (typeof location !== "string") {
    return null;
  }
  if (typeof message !== "string") {
    return null;
  }
  if (!isRecord(data)) {
    return null;
  }
  if (typeof timestamp !== "number") {
    return null;
  }

  return {
    hypothesisId,
    location,
    message,
    data,
    timestamp,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const payload = toDebugLogPayload(body);

    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
    }

    await appendFile(DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to append debug log." }, { status: 500 });
  }
}
