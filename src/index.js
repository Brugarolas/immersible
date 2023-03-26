const { Subscription  } = Reactivefy;

export class Immersible {
  constructor (object) {
    this.immer = new Immer();
    this.data = object
    this.subscription = new Subscription();
  }

  produce (nextStateFn) {
    this.data = this.immer.produce(this.data, nextStateFn);
    this.subscription.emit('__changed__', this.data);
  }

  produceWithPatches (nextStateFn) {
    this.data = this.immer.produce(this.data, nextStateFn);
    this.subscription.emit('__changed__', this.data);
  }

  applyPatches (changes = []) {
    this.data = this.immer.applyPatches(this.data, changes);
    this.subscription.emit('__changed__', this.data);
  }

  createDraft () {
    return this.immer.createDraft(this.data);
  }

  finishDraft (draft) {
    this.data = this.finishDraft(draft);
  }

  setAutoFreeze (value) {
    this.immer.setAutoFreeze(value);
  }

  setUseStrictShallowCopy (value) {
    this.immer.setUseStrictShallowCopy(value);
  }

  subscribe (callback) {
    return this.subscription.on('__changed__', callback)
  }

  unsuscribe (subscriptionId) {
    return this.subscription.off('__changed__', subscriptionId)
  }
}

// TODO Add `computed` function
