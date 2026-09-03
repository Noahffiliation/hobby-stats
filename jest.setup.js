import '@testing-library/jest-dom';

class MockResponse {
	constructor(body, init = {}) {
		this.body = body;
		this.status = init.status ?? 200;
		this.headers = new Map(Object.entries(init.headers ?? {}));
	}

	static json(data, init = {}) {
		const res = new MockResponse(JSON.stringify(data), init);
		res._jsonData = data;
		return res;
	}

	async json() {
		return this._jsonData ?? (typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
	}

	async text() {
		return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
	}
}

class MockRequest {
	constructor(input, init = {}) {
		this.url = typeof input === 'string' ? input : input.url;
		this.method = init.method ?? 'GET';
		this.headers = new Map(Object.entries(init.headers ?? {}));
	}
}

globalThis.Response = MockResponse;
global.Response = MockResponse;
if (typeof window !== 'undefined') {
	window.Response = MockResponse;
}

globalThis.Request = MockRequest;
global.Request = MockRequest;
if (typeof window !== 'undefined') {
	window.Request = MockRequest;
}
