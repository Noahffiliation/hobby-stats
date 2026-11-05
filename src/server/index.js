import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { loadEnvFiles } from "./env.js";

export function startServer(options = {}) {
	loadEnvFiles(options.envFiles, options.baseDir);

	const port = options.port ?? Number.parseInt(process.env.PORT ?? "3000", 10);
	const hostname = options.hostname ?? process.env.HOSTNAME ?? "0.0.0.0";
	const app =
		options.app ??
		createApp({
			publicDir: options.publicDir,
			cacheTtlMs: options.cacheTtlMs,
		});

	const server = http.createServer((req, res) => {
		void app(req, res).catch(() => {
			if (!res.headersSent) {
				res.writeHead(500, {
					"Content-Type": "application/json; charset=utf-8",
					"X-Content-Type-Options": "nosniff",
				});
			}
			res.end(JSON.stringify({ error: "Internal server error" }));
		});
	});

	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, hostname, () => {
			server.removeListener("error", reject);
			resolve(server);
		});
	});
}

export async function runMainIfCli(
	argv1 = process.argv[1],
	metaUrl = import.meta.url,
	proc = process,
	startServerFn = startServer,
) {
	const entryUrl = argv1 ? pathToFileURL(path.resolve(argv1)).href : "";
	if (metaUrl !== entryUrl) {
		return null;
	}

	const server = await startServerFn();
	const address = server.address();
	const boundPort = typeof address === "object" && address ? address.port : "";
	console.log(`Hobby Stats listening on http://localhost:${boundPort}`);

	const shutdown = () => {
		server.close(() => {
			proc.exit(0);
		});
	};
	proc.on("SIGINT", shutdown);
	proc.on("SIGTERM", shutdown);
	return { server, shutdown };
}

await runMainIfCli();
