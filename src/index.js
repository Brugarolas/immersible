import Reactivefy from 'reactivefy'
import { Immer } from './internal.js'

export {
	original,
	current,
	isDraft,
	isDraftable,
	NOTHING as nothing,
	DRAFTABLE as immerable,
	freeze
} from './internal.js'

const { Subscription  } = Reactivefy;

export class Immersible {
  /**
   * The Immersible constructor takes an object as base state, which
   * will be the one that mutates with `produce` function.
   * @param {*} object
   */
  constructor (object) {
    this._immer = new Immer();
    this._state = object
    this._subscription = new Subscription();
  }

  get state () {
    return this._state;
  }

  /**
 * The `produce` function takes a 'recipe function' (whose
 * return value often depends on the base state). The recipe function is
 * free to mutate its first argument however it wants. All mutations are
 * only ever applied to a __copy__ of the base state, that then will be
 * the next `Immersible` base state.
 *
 * Pass only a function to create a 'curried producer' which relieves you
 * from passing the recipe function every time.
 *
 * Only plain objects and arrays are made mutable. All other objects are
 * considered uncopyable.
 *
 * @param {any} base - the initial state
 * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
 * @param {Function} patchListener - optional function that will be called with all the patches produced here
 * @returns {any} a new state, or the initial state if nothing was modified
 */
  produce (nextStateFn) {
    this._state = this._immer.produce(this._state, nextStateFn);
    this._subscription.emit('__changed__', this._state);
  }

  /**
 * Like `produce`, but `produceWithPatches` always returns a tuple
 * [nextState, patches, inversePatches] (instead of just the next state)
 */
  produceWithPatches (nextStateFn) {
    this._state = this._immer.produce(this._state, nextStateFn);
    this._subscription.emit('__changed__', this._state);
  }

  /**
 * Apply an array of Immersible patches to the first argument.
 *
 * This function is a producer, which means copy-on-write is in effect.
 */
  applyPatches (changes = []) {
    this._state = this._immer.applyPatches(this._state, changes);
    this._subscription.emit('__changed__', this._state);
  }

  /**
 * Create an Immersible draft from the given base state, which may be a draft itself.
 * The draft can be modified until you finalize it with the `finishDraft` function.
 */
  createDraft () {
    return this._immer.createDraft(this._state);
  }

  /**
 * Finalize an Immersible draft from a `createDraft` call, returning the base state
 * (if no changes were made) or a modified copy. The draft must *not* be
 * mutated afterwards.
 *
 * Pass a function as the 2nd argument to generate Immersible patches based on the
 * changes that were made.
 */
  finishDraft (draft) {
    this._state = this.finishDraft(draft);
  }

  /**
 * Pass true to automatically freeze all copies created by Immersible.
 *
 * Always freeze by default, even in production mode
 */
  setAutoFreeze (value) {
    this._immer.setAutoFreeze(value);
  }

  /**
 * Pass true to enable strict shallow copy.
 *
 * By default, Immersible does not copy the object descriptors such as getter, setter and non-enumrable properties.
 */
  setUseStrictShallowCopy (value) {
    this._immer.setUseStrictShallowCopy(value);
  }

  subscribe (callback) {
    return this._subscription.on('__changed__', callback)
  }

  unsuscribe (subscriptionId) {
    return this._subscription.off('__changed__', subscriptionId)
  }
}
