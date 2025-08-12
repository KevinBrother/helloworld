import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // server: {
  //   host: true,
  //   port: 5173,
  //   proxy: {
  //     // '/api/v1': 'http://localhost:8888'
  //     "/api/v1": "http://localhost:3001/",
  //   },
  // },
  plugins: [react()],
});
