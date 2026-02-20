import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "./components"),
      "@/hooks": path.resolve(__dirname, "./hooks"),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/types": path.resolve(__dirname, "./types"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
