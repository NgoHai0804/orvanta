/**
 * Simple Logger utility for the extension's backend code.
 */
export class Logger {
	// Production bundles replace `process.env.IS_DEV` with "false" at build time.
	// Read lazily so tests can toggle it.
	static get isVerbose() {
		return process.env.IS_DEV === "true"
	}
	static subscribers = new Set()
	static output(msg) {
		for (const subscriber of Logger.subscribers) {
			try {
				subscriber(msg)
			} catch {
				// ignore errors from subscribers
			}
		}
	}
	/**
	 * Register a callback to receive log output messages.
	 */
	static subscribe(outputFn) {
		Logger.subscribers.add(outputFn)
	}
	static unsubscribe(outputFn) {
		Logger.subscribers.delete(outputFn)
	}
	static error(message, ...args) {
		Logger.#output("ERROR", message, undefined, args)
	}
	static warn(message, ...args) {
		Logger.#output("WARN", message, undefined, args)
	}
	static log(message, ...args) {
		Logger.#output("LOG", message, undefined, args)
	}
	static debug(message, ...args) {
		Logger.#output("DEBUG", message, undefined, args)
	}
	static info(message, ...args) {
		Logger.#output("INFO", message, undefined, args)
	}
	static trace(message, ...args) {
		Logger.#output("TRACE", message, undefined, args)
	}
	static #output(level, message, error, args) {
		try {
			let fullMessage = message
			const formatted = Logger.#formatArgs(args)
			if (formatted) {
				fullMessage += ` ${formatted}`
			}
			const errorSuffix = error?.message ? ` ${error.message}` : ""
			const ts = new Date().toISOString()
			Logger.output(`${ts} ${level} ${fullMessage}${errorSuffix}`.trimEnd())
		} catch {
			// do nothing if Logger fails
		}
	}
	/**
	 * Formats the extra arguments of a log call.
	 *
	 * Verbose (development) builds serialize everything. Production builds are
	 * deliberately narrow because these lines end up in the output channel and
	 * in bug reports that users paste publicly: only error messages (never
	 * stacks, and never other properties of an error), numbers and booleans are
	 * kept. Strings, objects and everything else are dropped, since they routinely
	 * carry URLs with OAuth codes, file or terminal contents, and settings.
	 * Error messages get the same trust as the log message itself: code that
	 * builds an error message must not put secrets in it.
	 */
	static #formatArgs(args) {
		const parts = []
		for (const arg of args) {
			const part = Logger.isVerbose ? Logger.#formatVerbose(arg) : Logger.#formatSafe(arg)
			if (part) {
				parts.push(part)
			}
		}
		return parts.join(" ")
	}
	static #formatVerbose(arg) {
		if (arg instanceof Error) {
			return arg.stack || `${arg.name}: ${arg.message}`
		}
		try {
			return JSON.stringify(arg)
		} catch {
			return String(arg)
		}
	}
	static #formatSafe(arg) {
		if (typeof arg === "number" || typeof arg === "boolean") {
			return String(arg)
		}
		if (arg instanceof Error) {
			return Logger.#describeError(arg)
		}
		if (arg && typeof arg === "object") {
			// Error-like objects (e.g. gRPC service errors) and metadata bags of the
			// form `{ ...context, error }`, as SDK loggers pass them.
			const record = arg
			if (typeof record.message === "string") {
				return record.message
			}
			if (record.error instanceof Error) {
				return Logger.#describeError(record.error)
			}
		}
		return undefined
	}
	static #describeError(error) {
		const seen = new Set()
		const describe = (err, depth) => {
			if (!(err instanceof Error)) {
				return ""
			}
			seen.add(err)
			// JSON.parse errors quote the input being parsed, which is often a
			// settings file or an API response carrying credentials.
			let text = err instanceof SyntaxError ? err.name : `${err.name}: ${err.message}`
			const cause = err.cause
			if (cause instanceof Error && !seen.has(cause) && depth < MAX_CAUSE_DEPTH) {
				text += ` (cause: ${describe(cause, depth + 1)})`
			}
			return text
		}
		return describe(error, 0)
	}
}
const MAX_CAUSE_DEPTH = 3
//# sourceMappingURL=Logger.js.map
