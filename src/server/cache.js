async function serializeResponse(response) {
	const headers = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});
	const body = await response.text();
	return {
		status: response.status,
		headers,
		body,
	};
}

export class ResponseCache {
	entries = new Map();
	inFlight = new Map();

	constructor(ttlMs = 3_600_000) {
		this.ttlMs = ttlMs;
	}

	async getOrFetch(key, fetcher) {
		if (this.ttlMs <= 0) {
			const fresh = await fetcher();
			return serializeResponse(fresh);
		}

		const now = Date.now();
		const cached = this.entries.get(key);
		if (cached) {
			if (now < cached.expiresAt) {
				return cached.value;
			}
			this.entries.delete(key);
		}

		const pending = this.inFlight.get(key);
		if (pending) {
			return pending;
		}

		const promise = (async () => {
			try {
				const response = await fetcher();
				const serialized = await serializeResponse(response);
				if (serialized.status >= 200 && serialized.status < 300) {
					this.entries.set(key, {
						value: serialized,
						expiresAt: Date.now() + this.ttlMs,
					});
				}
				return serialized;
			} finally {
				this.inFlight.delete(key);
			}
		})();

		this.inFlight.set(key, promise);
		return promise;
	}

	clear() {
		this.entries.clear();
		this.inFlight.clear();
	}
}
