import {
	isDraftable,
	processResult,
	DRAFT_STATE,
	isDraft,
	isMap,
	isSet,
	createProxyProxy,
	getPlugin,
	die,
	enterScope,
	revokeScope,
	leaveScope,
	usePatchesInScope,
	getCurrentScope,
	NOTHING,
	freeze,
	current,
	proxyMap,
	proxySet
} from '../internal.js'

export class Immer {
	autoFreeze_ = true
	useStrictShallowCopy_ = false

	constructor(config = { autoFreeze: true, useStrictShallowCopy: false }) {
		if (typeof config?.autoFreeze === 'boolean')
			this.setAutoFreeze(config.autoFreeze)
		if (typeof config?.useStrictShallowCopy === 'boolean')
			this.setUseStrictShallowCopy(config.useStrictShallowCopy)
	}

	/**
	 * The `produce` function takes a value and a 'recipe function' (whose
	 * return value often depends on the base state). The recipe function is
	 * free to mutate its first argument however it wants. All mutations are
	 * only ever applied to a __copy__ of the base state.
	 *
	 * Pass only a function to create a 'curried producer' which relieves you
	 * from passing the recipe function every time.
	 *
	 * Only plain objects and arrays are made mutable. All other objects are
	 * considered uncopyable.
	 *
	 * Note: This function is __bound__ to its `Immer` instance.
	 *
	 * @param {any} base - the initial state
	 * @param {Function} recipe - function that receives a proxy of the base state as first argument and which can be freely modified
	 * @param {Function} patchListener - optional function that will be called with all the patches produced here
	 * @returns {any} a new state, or the initial state if nothing was modified
	 */
	produce = (base, recipe, patchListener) => {
		// curried invocation
		if (typeof base === 'function' && typeof recipe !== 'function') {
			const defaultBase = recipe
			recipe = base

			const self = this
			return function curriedProduce(
				self,
				base = defaultBase,
				...args
			) {
				return self.produce(base, (draft) => recipe.call(self, draft, ...args))
			}
		}

		if (typeof recipe !== 'function') die(6)
		if (patchListener !== undefined && typeof patchListener !== 'function') die(7)

		let result

		// Only plain objects, arrays, and 'immerable classes' are drafted.
		if (isDraftable(base)) {
			const scope = enterScope(this)
			const proxy = createProxy(base, undefined)
			let hasError = true

			try {
				result = recipe(proxy)
				hasError = false
			} finally {
				// finally instead of catch + rethrow better preserves original stack
				if (hasError) revokeScope(scope)
				else leaveScope(scope)
			}

			usePatchesInScope(scope, patchListener)

			return processResult(result, scope)
		} else if (!base || typeof base !== 'object') {
			result = recipe(base)

			if (result === undefined) result = base
			if (result === NOTHING) result = undefined
			if (this.autoFreeze_) freeze(result, true)

			if (patchListener) {
				const p = []
				const ip = []
				getPlugin('Patches').generateReplacementPatches_(base, result, p, ip)
				patchListener(p, ip)
			}
			return result
		} else die(1, base)
	}

	produceWithPatches = (base, recipe) => {
		// curried invocation
		if (typeof base === 'function') {
			return (state, ...args) =>
				this.produceWithPatches(state, (draft) => base(draft, ...args))
		}

		let patches, inversePatches
		const result = this.produce(base, recipe, (p, ip) => {
			patches = p
			inversePatches = ip
		})
		return [result, patches, inversePatches]
	}

	createDraft (base) {
		if (!isDraftable(base)) die(8)
		if (isDraft(base)) base = current(base)

		const scope = enterScope(this)
		const proxy = createProxy(base, undefined)

		proxy[DRAFT_STATE].isManual_ = true

		leaveScope(scope)

		return proxy
	}

	finishDraft(draft,patchListener) {
		const state = draft && draft[DRAFT_STATE]

		if (!state || !state.isManual_) die(9)

		const {scope_: scope} = state

		usePatchesInScope(scope, patchListener)

		return processResult(undefined, scope)
	}

	/**
	 * Pass true to automatically freeze all copies created by Immer.
	 *
	 * By default, auto-freezing is enabled.
	 */
	setAutoFreeze(value) {
		this.autoFreeze_ = value
	}

	/**
	 * Pass true to enable strict shallow copy.
	 *
	 * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
	 */
	setUseStrictShallowCopy(value) {
		this.useStrictShallowCopy_ = value
	}

	applyPatches (base, patches) {
		// If a patch replaces the entire state, take that replacement as base before applying patches
		for (let i = patches.length - 1; i >= 0; i--) {
			const patch = patches[i]
			if (patch.path.length === 0 && patch.op === 'replace') {
				base = patch.value
				break
			}
		}
		// If there was a patch that replaced the entire state, start from the patch after that.
		if (i > -1) {
			patches = patches.slice(i + 1)
		}

		const applyPatchesImpl = getPlugin('Patches').applyPatches_

		if (isDraft(base)) {
			// N.B: never hits if some patch a replacement, patches are never drafts
			return applyPatchesImpl(base, patches)
		}

		// Otherwise, produce a copy of the base state.
		return this.produce(base, (draft) =>
			applyPatchesImpl(draft, patches)
		)
	}
}

export function createProxy (value, parent) {
	// precondition: createProxy should be guarded by isDraftable, so we know we can safely draft
	const draft = isMap(value)
		? proxyMap(value, parent)
		: isSet(value)
		? proxySet(value, parent)
		: createProxyProxy(value, parent)

	const scope = parent ? parent.scope_ : getCurrentScope()
	scope.drafts_.push(draft)

	return draft
}
