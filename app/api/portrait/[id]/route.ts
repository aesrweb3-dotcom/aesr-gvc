import { NextRequest, NextResponse } from "next/server";

const IPFS_CID = "QmY6JpwTYx6zZHgfJb3gPJRh1U897NX4RudtK5jhJ3sNDS";

const SOURCES = (id: number) => [
  `https://goodvibesclub.ai/portraits/gvc-${id}.jpg`,
  `https://ipfs.io/ipfs/${IPFS_CID}/${id}.jpg`,
  `https://cloudflare-ipfs.com/ipfs/${IPFS_CID}/${id}.jpg`,
  `https://gateway.pinata.cloud/ipfs/${IPFS_CID}/${id}.jpg`,
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 0 || id > 6968) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; VibeCard/1.0)",
    "Accept": "image/jpeg,image/*,*/*",
    "Referer": "https://goodvibesclub.ai/",
  };

  for (const url of SOURCES(id)) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      const body = await res.arrayBuffer();

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      // try next source
    }
  }

  return new NextResponse("Portrait unavailable", { status: 502 });
}
