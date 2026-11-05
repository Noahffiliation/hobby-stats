export function createElement(doc, tagName, options = {}) {
	const el = doc.createElement(tagName);
	if (options.className) {
		el.className = options.className;
	}
	if (options.text !== undefined) {
		el.textContent = String(options.text);
	}
	if (options.attrs) {
		for (const [name, val] of Object.entries(options.attrs)) {
			if (val !== undefined && val !== null) {
				el.setAttribute(name, String(val));
			}
		}
	}
	return el;
}

export function createProgress(
	doc,
	{ label, showValueLabel = false, value = 0 },
) {
	const percentage = Math.min(100, Math.max(0, value));
	const roundedPercentage = Math.round(percentage);

	const wrapper = createElement(doc, "div", {
		className: "progress-item",
		attrs: {
			"data-testid": "progress",
			"data-value": value,
		},
	});

	if (label || showValueLabel) {
		const header = createElement(doc, "div", { className: "progress-header" });
		if (label) {
			header.appendChild(createElement(doc, "span", { text: label }));
		}
		if (showValueLabel) {
			header.appendChild(
				createElement(doc, "span", { text: `${roundedPercentage}%` }),
			);
		}
		wrapper.appendChild(header);
	}

	const bar = createElement(doc, "progress", {
		className: "progress-bar",
		attrs: {
			"aria-label": label,
			value: roundedPercentage,
			max: 100,
		},
	});
	wrapper.appendChild(bar);
	return wrapper;
}

export function renderLoading(container, message) {
	const doc = container.ownerDocument;
	container.replaceChildren();
	container.hidden = false;
	const loadingEl = createElement(doc, "div", {
		className: "status-loading",
		text: message,
		attrs: { "data-testid": "loading-state" },
	});
	container.appendChild(loadingEl);
}

export function renderError(container, message) {
	const doc = container.ownerDocument;
	container.replaceChildren();
	container.hidden = false;

	const errorEl = createElement(doc, "div", {
		className: "status-error",
		attrs: {
			"data-testid": "error-state",
			role: "alert",
		},
	});
	errorEl.appendChild(
		createElement(doc, "span", {
			text: "⚠",
			attrs: { "aria-hidden": "true" },
		}),
	);
	errorEl.appendChild(createElement(doc, "span", { text: message }));
	container.appendChild(errorEl);
}

export function clearStatus(container) {
	container.replaceChildren();
	container.hidden = true;
}

export function createBadge(doc, text, variant = "default") {
	return createElement(doc, "span", {
		className: variant === "emerald" ? "badge badge-emerald" : "badge",
		text,
	});
}

export function createScoreRating(doc, score) {
	const wrapper = createElement(doc, "div", { className: "score-rating" });
	wrapper.appendChild(
		createElement(doc, "span", {
			text: "★",
			attrs: { "aria-hidden": "true" },
		}),
	);
	wrapper.appendChild(createElement(doc, "span", { text: `${score}/10` }));
	return wrapper;
}

export function createTimestamp(doc, text, datetime) {
	return createElement(doc, "time", {
		className: "timestamp",
		text,
		attrs: datetime ? { datetime } : undefined,
	});
}

export function createWatchedTimestamp(doc, watchedAt) {
	return createTimestamp(doc, new Date(watchedAt).toLocaleString(), watchedAt);
}

export function createEmptyMessage(doc, message) {
	return createElement(doc, "p", {
		className: "empty-message",
		text: message,
	});
}

export function createMediaList(doc) {
	return createElement(doc, "ul", {
		className: "media-list",
		attrs: { role: "list" },
	});
}

export function createTitleRow(doc, title, ...extras) {
	const primary = createElement(doc, "div", { className: "media-primary" });
	primary.appendChild(
		createElement(doc, "span", { className: "media-title", text: title }),
	);
	for (const node of extras) {
		if (node) {
			primary.appendChild(node);
		}
	}
	return primary;
}

export function createMediaItem(doc, responsive, ...children) {
	const li = createElement(doc, "li", {
		className: responsive ? "media-card media-card-responsive" : "media-card",
	});
	for (const child of children) {
		if (child) {
			li.appendChild(child);
		}
	}
	return li;
}

export function renderListPanel(doc, panel, items, renderItem, emptyMessage) {
	panel.replaceChildren();
	if (emptyMessage && items.length === 0) {
		panel.appendChild(createEmptyMessage(doc, emptyMessage));
		return;
	}
	const list = createMediaList(doc);
	for (const item of items) {
		list.appendChild(renderItem(item));
	}
	panel.appendChild(list);
}

function getNextTabIndex(key, currentIndex, length) {
	if (key === "ArrowRight") return (currentIndex + 1) % length;
	if (key === "ArrowLeft") return (currentIndex - 1 + length) % length;
	if (key === "Home") return 0;
	if (key === "End") return length - 1;
	return -1;
}

export function initTabs(tablistEl, onSelect) {
	const tabs = Array.from(tablistEl.querySelectorAll('[role="tab"]'));
	const doc = tablistEl.ownerDocument;

	function activateTab(targetTab, moveFocus = false) {
		const targetId = targetTab.dataset.tab;
		for (const tab of tabs) {
			const isSelected = tab === targetTab;
			tab.setAttribute("aria-selected", String(isSelected));
			tab.tabIndex = isSelected ? 0 : -1;

			const panelId = tab.getAttribute("aria-controls");
			const panel = panelId ? doc.getElementById(panelId) : null;
			if (panel) {
				panel.hidden = !isSelected;
			}
		}

		if (moveFocus) {
			targetTab.focus();
		}
		if (onSelect && targetId) {
			onSelect(targetId);
		}
	}

	for (const tab of tabs) {
		tab.addEventListener("click", () => {
			activateTab(tab, false);
		});

		tab.addEventListener("keydown", (event) => {
			const nextIndex = getNextTabIndex(
				event.key,
				tabs.indexOf(tab),
				tabs.length,
			);
			if (nextIndex !== -1) {
				event.preventDefault();
				activateTab(tabs[nextIndex], true);
			}
		});
	}

	return {
		selectTab(tabId) {
			const found = tabs.find((t) => t.dataset.tab === tabId);
			if (found) {
				activateTab(found, false);
			}
		},
		setTabCounts(counts) {
			for (const tab of tabs) {
				const id = tab.dataset.tab;
				const baseLabel = tab.dataset.label || tab.textContent;
				const count = id ? counts[id] : undefined;
				tab.textContent =
					count !== undefined && count !== null
						? `${baseLabel} (${count})`
						: baseLabel;
			}
		},
	};
}

export function getTabbedPageElements(
	doc,
	tablistId,
	firstPanelId,
	secondPanelId,
) {
	const tablistEl = doc.getElementById(tablistId);
	const statusContainer = doc.getElementById("status-feedback");
	const panelsWrapper = doc.getElementById("content-panels");
	const firstPanel = doc.getElementById(firstPanelId);
	const secondPanel = doc.getElementById(secondPanelId);
	if (
		!tablistEl ||
		!statusContainer ||
		!panelsWrapper ||
		!firstPanel ||
		!secondPanel
	) {
		return null;
	}
	return {
		tabs: initTabs(tablistEl),
		statusContainer,
		panelsWrapper,
		firstPanel,
		secondPanel,
	};
}

export async function runAsyncSection(
	statusContainer,
	contentEl,
	{ loadingMessage, errorMessage },
	task,
) {
	contentEl.hidden = true;
	renderLoading(statusContainer, loadingMessage);

	try {
		const shouldReveal = await task();
		if (shouldReveal !== false) {
			clearStatus(statusContainer);
			contentEl.hidden = false;
		}
	} catch (err) {
		console.error(err);
		renderError(statusContainer, errorMessage);
	}
}

export async function runTabbedPage(doc, config) {
	const els = getTabbedPageElements(
		doc,
		config.tablistId,
		config.firstPanelId,
		config.secondPanelId,
	);
	if (!els) return;

	if (config.initialCounts) {
		els.tabs.setTabCounts(config.initialCounts);
	}

	await runAsyncSection(
		els.statusContainer,
		els.panelsWrapper,
		config,
		async () => {
			await config.load(els);
			return true;
		},
	);
}

export async function runCollectionPage(doc, config) {
	const firstKey = config.firstKey ?? "planToWatch";
	const secondKey = config.secondKey ?? "completed";
	const firstTotalKey = config.firstTotalKey ?? "totalPlanToWatch";
	const secondTotalKey = config.secondTotalKey ?? "totalCompleted";

	await runTabbedPage(doc, {
		tablistId: config.tablistId,
		firstPanelId: config.firstPanelId ?? "panel-plan-to-watch",
		secondPanelId: config.secondPanelId ?? "panel-completed",
		loadingMessage: config.loadingMessage,
		errorMessage: config.errorMessage,
		async load(els) {
			const response = await config.fetchData();
			const firstItems = response[firstKey] || [];
			const secondItems = response[secondKey] || [];
			els.tabs.setTabCounts({
				[firstKey]: response[firstTotalKey] ?? firstItems.length,
				[secondKey]: response[secondTotalKey] ?? secondItems.length,
			});
			renderListPanel(
				doc,
				els.firstPanel,
				firstItems,
				(item) => config.renderFirstItem(doc, item),
				config.firstEmptyMessage,
			);
			renderListPanel(
				doc,
				els.secondPanel,
				secondItems,
				(item) => config.renderSecondItem(doc, item),
				config.secondEmptyMessage,
			);
		},
	});
}

export async function runWatchlistRecentPage(doc, config) {
	await runTabbedPage(doc, {
		tablistId: config.tablistId,
		firstPanelId: "panel-watchlist",
		secondPanelId: "panel-recent",
		initialCounts: { watchlist: 0, recent: 0 },
		loadingMessage: config.loadingMessage,
		errorMessage: config.errorMessage,
		async load(els) {
			const [watchlistRes, recentRes] = await Promise.all([
				config.fetchWatchlist(),
				config.fetchRecent(),
			]);
			const watchlist = watchlistRes.toReversed();
			els.tabs.setTabCounts({
				watchlist: watchlist.length,
				recent: recentRes.length,
			});
			renderListPanel(doc, els.firstPanel, watchlist, (item) => {
				const media = config.getWatchlistMedia(item);
				return createMediaItem(
					doc,
					false,
					createElement(doc, "span", {
						className: "media-title",
						text: media.title,
					}),
					media.year ? createBadge(doc, media.year) : null,
				);
			});
			renderListPanel(doc, els.secondPanel, recentRes, (item) =>
				createMediaItem(
					doc,
					true,
					config.renderRecentPrimary(doc, item),
					createWatchedTimestamp(doc, item.watched_at),
				),
			);
		},
	});
}

export async function bootPage(pageId, initFn, doc = globalThis.document) {
	if (doc?.querySelector(`[data-page="${pageId}"]`)) {
		await initFn();
	}
}
