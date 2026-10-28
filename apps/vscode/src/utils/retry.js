/**
 * TypeScript equivalent of the Go common.RetryOperation utility
 * Performs an operation with retry logic and timeout handling
 */
export async function retryOperation(maxRetries, timeoutPerAttempt, operation) {
	let lastError
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Create a timeout promise
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Operation timeout")), timeoutPerAttempt),
			)
			// Race the operation against timeout
			const result = await Promise.race([operation(), timeoutPromise])
			return result // Success - return result
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))
			if (attempt < maxRetries) {
				// Brief delay before retry
				await new Promise((resolve) => setTimeout(resolve, 500))
			}
		}
	}
	throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError?.message}`)
}
//# sourceMappingURL=retry.js.map
