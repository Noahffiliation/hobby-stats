import fs from "node:fs";
import path from "node:path";

export function parseEnvContent(content) {
	const parsed = {};
	const lines = content.split(/\r?\n/);

	for (const rawLine of lines) {
		const trimmed = rawLine.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const eqIndex = trimmed.indexOf("=");
		if (eqIndex <= 0) {
			continue;
		}

		const key = trimmed.slice(0, eqIndex).trim();
		if (!/^[A-Za-z_]\w*$/.test(key)) {
			continue;
		}

		let value = trimmed.slice(eqIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		parsed[key] = value;
	}

	return parsed;
}

export function loadEnvFiles(
	files = [".env.local", ".env"],
	baseDir = process.cwd(),
	targetEnv = process.env,
) {
	for (const file of files) {
		const fullPath = path.resolve(baseDir, file);
		if (!fs.existsSync(fullPath)) {
			continue;
		}
		const content = fs.readFileSync(fullPath, "utf8");
		const entries = parseEnvContent(content);
		for (const [key, value] of Object.entries(entries)) {
			if (targetEnv[key] === undefined) {
				targetEnv[key] = value;
			}
		}
	}
}
