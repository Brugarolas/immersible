import { original, Immersible } from '../src/index.js'
import { expect } from 'chai'

describe('Immersible', () => {
	const baseState = {
		a: [],
		b: {}
	}

	it('Should return the original from the draft', () => {
    const state = new Immersible(baseState);

    state.produce(draftState => {
			expect(original(draftState)).to.equal(baseState)
			expect(original(draftState.a)).to.equal(baseState.a)
			expect(original(draftState.b)).to.equal(baseState.b)
		})
	})

	it('Should throw undefined for new values on the draft', () => {
    const state = new Immersible(baseState);

    state.produce(draftState => {
			draftState.c = {}
			draftState.d = 3

      expect(() => original(draftState.c)).to.throw(`[Immer] 'original' expects a draft, got: [object Object]`)
			expect(() => original(draftState.d)).to.throw(`[Immer] 'original' expects a draft, got: 3`)
		})
	})

	it('Should return undefined for an object that is not proxied', () => {
		expect(() => original({})).to.throw(`[Immer] 'original' expects a draft, got: [object Object]`)
		expect(() => original(3)).to.throw(`[Immer] 'original' expects a draft, got: 3`)
	})
})
