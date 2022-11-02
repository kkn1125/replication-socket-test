import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode, ssrBuild }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    server: {
      host: "localhost",
      port: 4000,
      cors: true,
      watch: {
        ignored: ["!**/node_modeuls/**"],
        usePolling: true,
      },
      hmr: {
        host: "localhost",
        port: 3000,
      },
    },
    resolve: {
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".css"],
    },
    envPrefix: "V_",
  };
});
