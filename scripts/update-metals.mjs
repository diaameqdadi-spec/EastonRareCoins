import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.METALS_DEV_API_KEY;

if (!apiKey) {
  throw new Error("Missing METALS_DEV_API_KEY");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, "../public/data/metals.json");

const endpoint =
  `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(apiKey)}&currency=USD&unit=toz`;

const response = await fetch(endpoint, {
  headers: {
    Accept: "application/json"
  }
});

const data = await response.json().catch(() => ({}));

if (!response.ok || data?.status === "error") {
  throw new Error(data?.error || data?.message || "Failed to fetch metals.dev data");
}

const prices = [
  { label: "Gold", price: data?.metals?.gold ?? null, changePct: null },
  { label: "Silver", price: data?.metals?.silver ?? null, changePct: null },
  { label: "Platinum", price: data?.metals?.platinum ?? null, changePct: null },
  { label: "Copper", price: data?.metals?.copper ?? null, changePct: null }
];

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      ok: true,
      updatedAt: new Date().toISOString(),
      prices
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Updated metals prices at ${new Date().toISOString()}`);
