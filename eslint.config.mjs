import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astroParser from "astro-eslint-parser";
import astroPlugin from "eslint-plugin-astro";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      "**/dist/**",
      ".astro/**",
      "**/.astro/**",
      "node_modules/**",
      "**/node_modules/**",
      "drizzle/meta/**",
      "**/drizzle/meta/**",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
      },
    },
  },
];
