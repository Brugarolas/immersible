// types only!
import {
	DRAFT_STATE,
	getCurrentScope,
	latest,
	isDraftable,
	createProxy,
	markChanged,
	die,
	ArchType
} from '../internal.js'

class DraftMap extends Map {
	  [DRAFT_STATE]

  constructor(target, parent) {
    super()

		this[DRAFT_STATE] = {
			type_: ArchType.Map,
			parent_: parent,
			scope_: parent ? parent.scope_ : getCurrentScope(),
			modified_: false,
			finalized_: false,
			copy_: undefined,
			assigned_: undefined,
			base_: target,
			draft_: this,
			isManual_: false,
			revoked_: false
		}
  }

  get size () {
		return latest(this[DRAFT_STATE]).size
	}

  has (key) {
		return latest(this[DRAFT_STATE]).has(key)
	}

	set (key, value) {
		const state = this[DRAFT_STATE]
		assertUnrevoked(state)

		if (!latest(state).has(key) || latest(state).get(key) !== value) {
			prepareMapCopy(state)
			markChanged(state)
			state.assigned_.set(key, true)
			state.copy_.set(key, value)
			state.assigned_.set(key, true)
		}

		return this
	}

	delete (key) {
		if (!this.has(key)) {
			return false
		}

		const state = this[DRAFT_STATE]
		assertUnrevoked(state)
		prepareMapCopy(state)
		markChanged(state)

		if (state.base_.has(key)) {
			state.assigned_.set(key, false)
		} else {
				this.produceWithPatches(state, (draft) => base(draft, ...args))
		}

		let patches, inversePatches
		const result = this.produce(base, recipe, (p, ip) => {
			patches = p
			inversePatches = ip
		})
		return [result, patche, inversePatches]
	}

  clear () {
		const state = this[DRAFT_STATE]

		assertUnrevoked(state)

		if (latest(state).size) {
			prepareMapCopy(state)
			markChanged(state)

			state.assigned_ = new Map()

			each(state.base_, key => {
				state.assigned_.set(key, false)
			})

			state.copy_.clear()
		}
	}

	forEach (cb, thisArg) {
		const state = this[DRAFT_STATE]

		latest(state).forEach((_value, key, _map) => {
			cb.call(thisArg, this.get(key), key, this)
		})
	}

	get (key) {
		const state = this[DRAFT_STATE]

		assertUnrevoked(state)

		const value = latest(state).get(key)
		if (state.finalized_ || !isDraftable(value)) {
			return value
		}
		if (value !== state.base_.get(key)) {
			return value // either already drafted or reassigned
		}

		// despite what it looks, this creates a draft only once, see above condition
		const draft = createProxy(value, state)
		prepareMapCopy(state)
		state.copy_.set(key, draft)

		return draft
	}

	keys () {
		return latest(this[DRAFT_STATE]).keys()
	}

	values () {
		const iterator = this.keys()
		return {
			[Symbol.iterator]: () => this.values(),
			next: () => {
				const r = iterator.next()
				if (r.done) return r
				const value = this.get(r.value)
				return {
					done: false,
					value
				}
			}
		}
	}

	entries () {
		const iterator = this.keys()
		return {
			[Symbol.iterator]: () => this.entries(),
			next: () => {
				const r = iterator.next()
				if (r.done) return r
				const value = this.get(r.value)
				return {
					done: false,
					value: [r.value, value]
				}
			}
		}
	}

	[Symbol.iterator] () {
		return this.entries()
	}
}

export function proxyMap (target, parent) {
	return new DraftMap(target, parent)
}

function prepareMapCopy(state) {
	if (!state.copy_) {
		state.assigned_ = new Map()
		state.copy_ = new Map(state.base_)
	}
}

class DraftSet extends Set {
	[DRAFT_STATE]

	constructor(target, parent) {
		super()
		this[DRAFT_STATE] = {
			type_: ArchType.Set,
			parent_: parent,
			scope_: parent ? parent.scope_ : getCurrentScope(),
			modified_: false,
			finalized_: false,
			copy_: undefined,
			base_: target,
			draft_: this,
			drafts_: new Map(),
			revoked_: false,
			isManual_: false
		}
	}

	get size() {
		return latest(this[DRAFT_STATE]).size
	}

	has (value) {
		const state = this[DRAFT_STATE]
		assertUnrevoked(state)

		// bit of trickery here, to be able to recognize both the value, and the draft of its value
		if (!state.copy_) {
			return state.base_.has(value)
		}
		if (state.copy_.has(value)) {
      return true
    }
		if (state.drafts_.has(value) && state.copy_.has(state.drafts_.get(value))) {
			return true
    }
		return false
	}

	add (value) {
		const state = this[DRAFT_STATE]
		assertUnrevoked(state)

		if (!this.has(value)) {
			prepareSetCopy(state)
			markChanged(state)
			state.copy_.add(value)
		}

		return this
	}

	delete (value) {
		if (!this.has(value)) {
			return false
		}

		const state = this[DRAFT_STATE]
		assertUnrevoked(state)
		prepareSetCopy(state)
		markChanged(state)

		return (
			state.copy_.delete(value) || (state.drafts_.has(value) ? state.copy_.delete(state.drafts_.get(value)) : false)
		)
	}

	clear () {
		const state= this[DRAFT_STATE]
		assertUnrevoked(state)

		if (latest(state).size) {
			prepareSetCopy(state)
			markChanged(state)
			state.copy_.clear()
		}
	}

	values () {
		const state = this[DRAFT_STATE]
		assertUnrevoked(state)
		prepareSetCopy(state)
		return state.copy_.values()
	}

	entries () {
		const state = this[DRAFT_STATE]
		assertUnrevoked(state)
		prepareSetCopy(state)
		return state.copy_.entries()
	}

	keys () {
		return this.values()
	}

	[Symbol.iterator] () {
		return this.values()
	}

	forEach (cb, thisArg) {
		const iterator = this.values()
		let result = iterator.next()

		while (!result.done) {
			cb.call(thisArg, result.value, result.value, this)
			result = iterator.next()
		}
	}
}

export function proxySet (target, parent) {
	return new DraftSet(target, parent)
}

function prepareSetCopy(state) {
	if (!state.copy_) {
		// create drafts for all entries to preserve insertion order
		state.copy_ = new Set()

		state.base_.forEach(value => {
			if (isDraftable(value)) {
				const draft = createProxy(value, state)
				state.drafts_.set(value, draft)
				state.copy_.add(draft)
			} else {
				state.copy_.add(value)
			}
		})
	}
}

function assertUnrevoked(state) {
	if (state.revoked_) die(3, JSON.stringify(latest(state)))
}
