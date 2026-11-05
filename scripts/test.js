import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rawArgs = new Set(process.argv.slice(2));
const enableCoverage = rawArgs.has("--coverage");
const enableWatch = rawArgs.has("--watch");

const testFiles = [];
function collectTests(dir) {
	if (!fs.existsSync(dir)) return;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collectTests(fullPath);
		} else if (entry.isFile() && entry.name.endsWith(".test.js")) {
			testFiles.push(fullPath);
		}
	}
}

collectTests(path.resolve("tests"));
testFiles.sort((a, b) => a.localeCompare(b));

const nodeArgs = ["--test"];

if (enableWatch) {
	nodeArgs.push("--watch");
}

if (enableCoverage) {
	fs.mkdirSync(path.resolve("coverage"), { recursive: true });
	nodeArgs.push(
		"--experimental-test-coverage",
		"--test-coverage-branches=100",
		"--test-coverage-functions=100",
		"--test-coverage-lines=100",
		"--test-coverage-exclude=tests/**",
		"--test-coverage-exclude=scripts/**",
		"--test-coverage-exclude=node_modules/**",
		"--test-reporter=spec",
		"--test-reporter-destination=stdout",
		"--test-reporter=lcov",
		"--test-reporter-destination=coverage/lcov.info",
	);
}

nodeArgs.push(...testFiles);

const result = spawnSync(process.execPath, nodeArgs, {
	stdio: "inherit",
	env: process.env,
});

process.exit(result.status ?? 1);
