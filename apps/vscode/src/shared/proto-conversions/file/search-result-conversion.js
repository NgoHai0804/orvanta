/**
 * Converts domain search result objects to proto FileInfo objects
 */
export function convertSearchResultsToProtoFileInfos(results) {
	return results.map((result) => ({
		path: result.path,
		type: result.type,
		label: result.label,
		workspaceName: result.workspaceName,
	}))
}
//# sourceMappingURL=search-result-conversion.js.map
