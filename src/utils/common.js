import {
	DRAFT_STATE,
	DRAFTABLE,
	ArchType,
	die
} from '../internal'

/** Returns true if the given value is an Immer draft */
export function isDraft (value) {
	return !!value && !!value[DRAFT_STATE]
}

/** Returns true if the given value can be drafted by Immer */
export function isDraftable(value) {
	if (!value) return false
	return (
		isPlainObject(value) ||
		Array.isArray(value) ||
		!!value[DRAFTABLE] ||
		!!value.constructor?.[DRAFTABLE] ||
		isMap(value) ||
		isSet(value)
	)
}

const objectCtorString = Object.prototype.constructor.toString()

export function isPlainObject (value) {
	if (!value || typeof value !== 'object') return false
	const proto = Object.getPrototypeOf(value)
	if (proto === null) {
		return true
	}
	const Ctor = Object.hasOwnProperty.call(proto, 'constructor') && proto.constructor

	if (Ctor === Object) return true

	return (
		typeof Ctor == 'function' &&
		Function.toString.call(Ctor) === objectCtorString
	)
}

/** Get the underlying object that is represented by the given draft */
export function original (value) {
	if (!isDraft(value)) die(15, value)
	return value[DRAFT_STATE].base_
}

export function each (obj, iter) {
	if (getArchtype(obj) === ArchType.Object) {
		Object.entries(obj).forEach(([key, value]) => {
			iter(key, value, obj)
		})
	} else {
		obj.forEach((entry, index) => iter(index, entry, obj))
	}
}

export function getArchtype (thing) {
	const state = thing[DRAFT_STATE]
	return state
		? state.type_
		: Array.isArray(thing)
		? ArchType.Array
		: isMap(thing)
		? ArchType.Map
		: isSet(thing)
		? ArchType.Set
		: ArchType.Object
}

export function has (thing, prop) {
	return getArchtype(thing) === ArchType.Map
		? thing.has(prop)
		: Object.prototype.hasOwnProperty.call(thing, prop)
}

export function get (thing, prop) {
	return getArchtype(thing) === ArchType.Map ? thing.get(prop) : thing[prop]
}

export function set (thing, propOrOldValue, value) {
	const t = getArchtype(thing)
	if (t === ArchType.Map) thing.set(propOrOldValue, value)
	else if (t === ArchType.Set) {
		thing.add(value)
	} else thing[propOrOldValue] = value
}

export function is (x, y) {
	// From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
	if (x === y) {
		return x !== 0 || 1 / x === 1 / y
	} else {
		return x !== x && y !== y
	}
}

export function isMap (target) {
	return target instanceof Map
}

/*#__PURE__*/
export function isSet (target) {
	return target instanceof Set
}
/*#__PURE__*/
export function latest(state) {
	return state.copy_ || state.base_
}

/*#__PURE__*/
export function shallowCopy(base, strict) {
	if (isMap(base)) {
		return new Map(base)
	}
	if (isSet(base)) {
		return new Set(base)
	}
	if (Array.isArray(base)) return Array.prototype.slice.call(base)

	if (!strict && isPlainObject(base)) {
		if (!Object.getPrototypeOf(base)) {
			const obj = Object.create(null)
			return Object.assign(obj, base)
		}
		return {...base}
	}

	const descriptors = Object.getOwnPropertyDescriptors(base)
	delete descriptors[DRAFT_STATE]

	let keys = Reflect.ownKeys(descriptors)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const desc = descriptors[key]
		if (desc.writable === false) {
			desc.writable = true
			desc.configurable = true
		}

		// like object.assign, we will read any _own_, get/set accessors. This helps in dealing
		// with libraries that trap values, like mobx or vue
		// unlike object.assign, non-enumerables will be copied as well
		if (desc.get || desc.set)
			descriptors[key] = {
				configurable: true,
				writable: true, // could live with !!desc.set as well here...
				enumerable: desc.enumerable,
				value: base[key]
			}
	}

	return Object.create(Object.getPrototypeOf(base), descriptors)
}

/**
 * Freezes draftable objects. Returns the original object.
 * By default freezes shallowly, but if the second argument is `true` it will freeze recursively.
 *
 * @param obj
 * @param deep
 */
export function freeze(obj, deep = false) {
	if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj)) return obj
	if (getArchtype(obj) > 1 /* Map or Set */) {
		obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections as any
	}
	Object.freeze(obj)
	if (deep) each(obj, (_key, value) => freeze(value, true), true)
	return obj
}

function dontMutateFrozenCollections() {
	die(2)
}

export function isFrozen(obj)  {
	return Object.isFrozen(obj)
}
