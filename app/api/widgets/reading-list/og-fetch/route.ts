import ogs from "open-graph-scraper";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z
  .object({
    url: z.string().url("A valid URL is required."),
  })
  .strict();

interface OgFetchResponse {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<OgFetchResponse>> {
  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse((await request.json()) as unknown);
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  try {
    const { result } = await ogs({
      url: payload.url,
      timeout: 10_000,
      onlyGetOpenGraphInfo: false,
      fetchOptions: {
        headers: {
          "user-agent": "NotisBot/1.0 (+https://notis.app)",
        },
      },
    });

    const image =
      Array.isArray(result.ogImage) && result.ogImage.length > 0
        ? result.ogImage[0]?.url
        : undefined;

    return NextResponse.json(
      {
        title: result.ogTitle ?? result.twitterTitle ?? result.dcTitle,
        description:
          result.ogDescription ?? result.twitterDescription ?? result.dcDescription,
        image,
        siteName: result.ogSiteName,
        url: result.requestUrl ?? payload.url,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch URL metadata.",
      },
      { status: 400 },
    );
  }
}
