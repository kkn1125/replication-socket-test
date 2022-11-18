import { defineConfig, loadEnv } from "vite";
import dotenv from "dotenv";
import path from "path";

export default defineConfig(({ command, mode, ssrBuild }) => {
  const env = loadEnv(mode, process.cwd(), "");
  dotenv.config({
    path: path.join(__dirname, `./env.${mode}`),
  });

  return {
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    server: {
      host: "0.0.0.0",
      port: 4000,
      cors: true,
      watch: {
        ignored: ["!**/node_modeuls/**"],
        usePolling: true,
      },
      // hmr: {
      //   host: "localhost",
      //   port: 3000,
      // },
    },
    resolve: {
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".css"],
    },
    envPrefix: "V_",
  };
});
