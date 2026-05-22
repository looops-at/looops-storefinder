#!/usr/bin/env node
/**
 * esbuild + statischer Dev-Server.
 * - Erzeugt dist/storefinder.js (IIFE, minified) + dist/storefinder.css
 * - --watch    rebuild on change
 * - --serve    statischer HTTP-Server auf :8080 (kombiniert mit --watch)
 */
import * as esbuild from "esbuild";
import http from "node:http";
import { existsSync, mkdirSync, readFile, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const args = new Set(process.argv.slice(2));
const watch = args.has("--watch");
const serve = args.has("--serve");

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: [
    path.join(ROOT, "src/storefinder.js"),
    path.join(ROOT, "src/storefinder.css"),
  ],
  bundle: true,
  format: "iife",
  globalName: "LooopsStorefinder",
  outdir: DIST,
  minify: !watch,
  sourcemap: watch ? "inline" : true,
  target: ["es2020"],
  loader: { ".svg": "dataurl" },
  banner: {
    js: "/* Looops Storefinder — github.com/looops/looops-storefinder */",
  },
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  await ctx.rebuild();
  console.log("→ esbuild watching …");
} else {
  await esbuild.build(buildOptions);
  console.log("✓ Build done → dist/");
}

if (serve) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
  };
  const PORT = 8080;
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/" || urlPath === "")
      urlPath = "/src/index.html";
    const filePath = path.join(ROOT, urlPath);
    // Prevent path traversal
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    try {
      const st = statSync(filePath);
      if (st.isDirectory()) {
        res.writeHead(302, { Location: urlPath.replace(/\/?$/, "/") + "index.html" });
        return res.end();
      }
    } catch {
      res.writeHead(404);
      return res.end(`Not found: ${urlPath}`);
    }
    readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end(String(err));
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
  server.listen(PORT, () => {
    console.log(`→ Dev server: http://localhost:${PORT}/`);
  });
}
