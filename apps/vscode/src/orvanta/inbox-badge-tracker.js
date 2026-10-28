export class InboxBadgeTracker {
	pendingCount = 0
	badgeUpdater
	registerUpdater(updater) {
		this.badgeUpdater = updater
		updater(this.pendingCount)
		return () => {
			if (this.badgeUpdater === updater) {
				this.badgeUpdater = undefined
			}
		}
	}
	setBadge(count) {
		this.pendingCount = Math.max(0, count)
		if (this.badgeUpdater) {
			this.badgeUpdater(this.pendingCount)
		}
	}
	getPendingCount() {
		return this.pendingCount
	}
	reset() {
		this.setBadge(0)
	}
}
export const globalInboxBadgeTracker = new InboxBadgeTracker()
//# sourceMappingURL=inbox-badge-tracker.js.map
