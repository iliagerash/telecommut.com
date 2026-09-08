// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

const env = loadEnv('', process.cwd(), '');
const mainDomain = (env.MAIN_DOMAIN || 'telecommut.com').trim();

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Behind nginx/Cloudflare the Node app listens on localhost:4321 but receives
  // X-Forwarded-Host. Astro ignores that header unless allowedDomains is set.
  security: {
    allowedDomains: [
      {
        hostname: mainDomain,
        protocol: 'https',
      },
    ],
  },

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
