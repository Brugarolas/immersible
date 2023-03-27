import {
	DRAFT_STATE,
	ArchType,
	getPlugin
} from '../internal.js'

/** Each scope represents a `produce` call. */
let currentScope

export function getCurrentScope () {
	return currentScope
}

function createScope (parent_, immer_) {
	return {
		drafts_: [],
		parent_,
		immer_,
		// Whenever the modified draft contains a draft from another scope, we
		// need to prevent auto-freezing so the unowned draft can be finalized.
		canAutoFreeze_: true,
		unfinalizedDrafts_: 0
	}
}

export function usePatchesInScope (scope, patchListener) {
	if (patchListener) {
		getPlugin('Patches') // assert we have the plugin
		scope.patches_ = []
		scope.inversePatches_ = []
		scope.patchListener_ = patchListener
	}
}

export function revokeScope (scope) {
	leaveScope(scope)
	scope.drafts_.forEach(revokeDraft)
	scope.drafts_ = null
}

export function leaveScope (scope) {
	if (scope === currentScope) {
		currentScope = scope.parent_
	}
}

export function enterScope (immer) {
	return (currentScope = createScope(currentScope, immer))
}

function revokeDraft(draft) {
	const state = draft[DRAFT_STATE]

	if (state.type_ === ArchType.Object || state.type_ === ArchType.Array) {
		state.revoke_()
  }

	else state.revoked_ = true
}
