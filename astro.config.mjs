// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

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
        "mysql2",
      ],
    },
  },

  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
