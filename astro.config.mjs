import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.eastonrarecoin.com",
  adapter: vercel()
});
