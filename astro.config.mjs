// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      cors: true,
    },
    ssr: {
      external: [
        "node:crypto",
        "node:path",
        "node:async_hooks",
        "path",
        "util",
        "better-sqlite3",
        "bindings",
        "file-uri-to-path",
      ],
    },
  },

  adapter: cloudflare({
    imageService: "compile"
  })
});
