export function resolveOriginUrl(rawHref, baseOrigin) {
	if (!rawHref) return undefined;
	try {
		const resolved = new URL(rawHref.trim(), baseOrigin);
		return resolved.origin === baseOrigin ? resolved.href : undefined;
	} catch {
		return undefined;
	}
}
