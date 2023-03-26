/**
 * The sentinel value returned by producers to replace the draft with undefined.
 */
export const NOTHING = Symbol.for("immer-nothing")

/**
 * To let Immer treat your class instances as plain immutable objects
 * (albeit with a custom prototype), you must define either an instance property
 * or a static property on each of your custom classes.
 *
 * Otherwise, your class instance will never be drafted, which means it won't be
 * safe to mutate in a produce callback.
 */
export const DRAFTABLE = Symbol.for("immer-draftable")

export const DRAFT_STATE = Symbol.for("immer-state")
