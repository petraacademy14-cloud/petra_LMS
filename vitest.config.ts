import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/lib/academics.ts",
        "src/lib/finance.ts",
        "src/lib/permissions.ts",
        "src/lib/scope.ts",
      ],
    },
  },
});
