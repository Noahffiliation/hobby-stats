import { execFile } from 'node:child_process';

export const COMPLETED_REGEX = /Completed[^(]*\(([\d,]+)\)/i;
export const PTW_REGEX = /Plan to Watch[^(]*\(([\d,]+)\)/i;

export function getMdlUsername(): string {
	return process.env.NEXT_PUBLIC_MDL_USERNAME || 'Noahffiliation';
}

export function getCurlBin(): string {
	return process.platform === 'win32' ? String.raw`C:\Windows\System32\curl.exe` : '/usr/bin/curl';
}

export async function fetchMdlHtml(url: string, postJson?: { page: number; username: string }): Promise<string | null> {
	try {
		const response = await fetch(url, {
			method: postJson ? 'POST' : 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				Accept: postJson ? 'text/html, */*; q=0.01' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				...(postJson ? { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' } : {}),
			},
			...(postJson ? { body: JSON.stringify(postJson) } : {}),
		});

		if (response.ok) {
			const text = await response.text();
			if (!text.includes('Just a moment...')) {
				return text;
			}
		}
	} catch {
		// Fallback to system curl below
	}

	return new Promise<string | null>((resolve) => {
		try {
			const curlBin = getCurlBin();
			const args = [
				'-s',
				'-L',
				'-A',
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'--compressed',
			];

			if (postJson) {
				args.push(
					'-X',
					'POST',
					'-H',
					'Content-Type: application/json',
					'-H',
					'X-Requested-With: XMLHttpRequest',
					'-d',
					JSON.stringify(postJson)
				);
			}

			args.push(url);

			execFile(
				curlBin,
				args,
				{ timeout: 15000, maxBuffer: 20 * 1024 * 1024 },
				(error, stdout) => {
					if (!error && stdout && !stdout.includes('Just a moment...')) {
						resolve(stdout);
					} else {
						resolve(null);
					}
				}
			);
		} catch {
			resolve(null);
		}
	});
}
