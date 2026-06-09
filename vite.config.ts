import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` defaults to '/' for local dev / root deploys; the GitHub Pages workflow sets
// VITE_BASE=/interactivemap/ so assets resolve under the project subpath.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
});
