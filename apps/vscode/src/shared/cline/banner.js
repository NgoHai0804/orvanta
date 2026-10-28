/**
 * Action types that can be triggered from banner buttons/links
 * Frontend maps these to actual handlers
 */
export var BannerActionType
;((BannerActionType) => {
	/** Open external URL */
	BannerActionType["Link"] = "link"
	/** Open API settings tab */
	BannerActionType["ShowApiSettings"] = "show-api-settings"
	/** Open feature settings tab */
	BannerActionType["ShowFeatureSettings"] = "show-feature-settings"
	/** Open account/login view */
	BannerActionType["ShowAccount"] = "show-account"
	/** Set the active model */
	BannerActionType["SetModel"] = "set-model"
	/** Trigger CLI installation flow */
	BannerActionType["InstallCli"] = "install-cli"
})(BannerActionType || (BannerActionType = {}))
/**
 * The list of predefined banner config rendered by the Welcome Section UI.
 * TODO: Backend would return a similar JSON structure in the future which we will replace this with.
 */
export const BANNER_DATA = []
//# sourceMappingURL=banner.js.map
