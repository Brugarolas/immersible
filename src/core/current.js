import {
	die,
	isDraft,
	shallowCopy,
	each,
	DRAFT_STATE,
	get,
	set,
	isDraftable,
	getArchtype,
  isFrozen
} from '../internal.js'

/** Takes a snapshot of the current state of a draft and finalizes it (but without freezing). This is a great utility to print the current state during debugging (no Proxies in the way). The output of current can also be safely leaked outside the producer. */
export function current(value) {
	if (!isDraft(value)) die(10, value)
	return currentImpl(value)
}

function currentImpl(value) {
	if (!isDraftable(value) || isFrozen(value)) {
    return value
  }

	const state = value[DRAFT_STATE]
	let copy
	if (state) {
		if (!state.modified_) return state.base_
		// Optimization: avoid generating new drafts during copying
		state.finalized_ = true
		copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_)
	} else {
		copy = shallowCopy(value, true)
	}

  // recurse
	each(copy, (key, childValue) => {
		if (state && get(state.base_, key) === childValue) return // no need to copy or search in something that didn't change
		set(copy, key, currentImpl(childValue))
	})

  if (state) {
		state.finalized_ = false
	}

	return copy
}
