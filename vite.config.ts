import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The whole demo ships as one bundle (the Hogan modules included); one large chunk is expected.
  build: { chunkSizeWarningLimit: 2500 },
});
