export class InboxBadgeTracker {
	private pendingCount = 0
	private badgeUpdater?: (count: number) => void

	registerUpdater(updater: (count: number) => void): () => void {
		this.badgeUpdater = updater
		updater(this.pendingCount)
		return () => {
			if (this.badgeUpdater === updater) {
				this.badgeUpdater = undefined
			}
		}
	}

	setBadge(count: number): void {
		this.pendingCount = Math.max(0, count)
		if (this.badgeUpdater) {
			this.badgeUpdater(this.pendingCount)
		}
	}

	getPendingCount(): number {
		return this.pendingCount
	}

	reset(): void {
		this.setBadge(0)
	}
}

export const globalInboxBadgeTracker = new InboxBadgeTracker()
