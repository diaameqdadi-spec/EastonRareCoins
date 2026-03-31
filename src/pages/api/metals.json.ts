import type { APIRoute } from "astro";

export const prerender = false;

type MetalRow = {
  label: string;
  code: string;
  price: number | null;
  changePct: number | null;
};

type MetalsCache = {
  expiresAt: number;
  data: MetalRow[];
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheKey = "__metals_cache__";

const symbols: Array<{ label: string; code: string }> = [
  { label: "Gold", code: "XAU" },
  { label: "Silver", code: "XAG" },
  { label: "Platinum", code: "XPT" },
  { label: "Copper", code: "XCU" }
];

function getCache(): MetalsCache | undefined {
  return (globalThis as typeof globalThis & { [cacheKey]?: MetalsCache })[cacheKey];
}

function setCache(data: MetalRow[]) {
  (globalThis as typeof globalThis & { [cacheKey]?: MetalsCache })[cacheKey] = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data
  };
}

async function fetchMetal(code: string, apiKey: string): Promise<MetalRow> {
  const response = await fetch(`https://www.goldapi.io/api/${code}/USD`, {
    headers: {
      "x-access-token": apiKey,
      Accept: "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Failed to fetch ${code}`);
  }

  return {
    label: symbols.find((item) => item.code === code)?.label ?? code,
    code,
    price: typeof data?.price === "number" ? data.price : null,
    changePct: typeof data?.chp === "number" ? data.chp : null
  };
}

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.GOLDAPI_KEY || import.meta.env.PUBLIC_GOLDAPI_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Missing GOLDAPI_KEY",
        prices: []
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const cached = getCache();
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(
      JSON.stringify({
        ok: true,
        source: "cache",
        prices: cached.data
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60"
        }
      }
    );
  }

  try {
    const prices = await Promise.all(symbols.map((item) => fetchMetal(item.code, apiKey)));
    setCache(prices);

    return new Response(
      JSON.stringify({
        ok: true,
        source: "live",
        prices
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live prices unavailable";
    return new Response(
      JSON.stringify({
        ok: false,
        message,
        prices: []
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
