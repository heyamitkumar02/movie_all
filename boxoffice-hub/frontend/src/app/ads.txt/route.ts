import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").trim();
  const pubId = client.replace(/^ca-/, "");

  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : "# Set NEXT_PUBLIC_ADSENSE_CLIENT (e.g. ca-pub-XXXXXXXXXXXXXXXX) in Vercel Environment Variables\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
