export interface TabItem<T extends string = string> {
	readonly id: T;
	readonly label: string;
	readonly count?: number | string;
}

interface TabNavProps<T extends string = string> {
	readonly tabs: readonly TabItem<T>[];
	readonly activeTab: T;
	readonly onTabChange: (tabId: T) => void;
}

export default function TabNav<T extends string = string>({ tabs, activeTab, onTabChange }: Readonly<TabNavProps<T>>) {
	return (
		<div role="tablist" className="flex justify-center gap-2 mb-6 border-b border-zinc-800 pb-3 w-full max-w-2xl">
			{tabs.map((tab) => {
				const isSelected = activeTab === tab.id;
				const labelText = tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;

				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isSelected}
						onClick={() => onTabChange(tab.id)}
						className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
							isSelected
								? 'bg-zinc-800 text-white shadow-sm'
								: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
						}`}
					>
						{labelText}
					</button>
				);
			})}
		</div>
	);
}
