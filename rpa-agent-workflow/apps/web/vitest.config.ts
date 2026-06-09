import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    server: {
      deps: {
        inline: ["@aientry/ui-components", "react-pdf", "pdfjs-dist"],
      },
    },
  },
});
