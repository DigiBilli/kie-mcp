const http = require("http");
const { spawn } = require("child_process");

const SECRET = process.env.URL_SECRET;
const PORT = process.env.PORT || 10000;
const PREFIX = "/" + SECRET;

// Lance le serveur Kie en local (non exposé à internet)
const child = spawn("npx", ["-y", "@felores/kie-ai-mcp-server", "--http"], {
  stdio: "inherit",
  env: {
    ...process.env,
    MCP_TRANSPORT: "http",
    MCP_HTTP_HOST: "127.0.0.1",
    MCP_HTTP_PORT: "3000",
  },
});
child.on("exit", (c) => process.exit(c ?? 1));

// Portier : seules les URLs contenant le secret passent
http
  .createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200);
      return res.end("ok");
    }
    if (!SECRET || !req.url.startsWith(PREFIX + "/mcp")) {
      res.writeHead(404);
      return res.end();
    }
    const up = http.request(
      {
        host: "127.0.0.1",
        port: 3000,
        method: req.method,
        path: req.url.slice(PREFIX.length),
        headers: { ...req.headers, host: "127.0.0.1:3000" },
      },
      (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      }
    );
    up.on("error", () => {
      res.writeHead(502);
      res.end("upstream error");
    });
    req.pipe(up);
  })
  .listen(PORT, "0.0.0.0", () => console.log("Proxy prêt sur " + PORT));
