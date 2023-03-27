[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/brugarolas)

# Immersible
Immersible is my own version of Immer. It is more restrictive and has, in my opinion, a more convenient API. You can also subscribe to changes with my library.

## Installation
First, we need to install `immersible`:

```bash
npm install --save immersible
```

And then we import `immersible` where we want to use it.

```js
import { Immersible } from 'immersible'
```

## Usage

Usage is quite simple:

```js
const todo = new Immersible([
    {
        title: "Learn TypeScript",
        done: true
    },
    {
        title: "Try Immer",
        done: false
    }
]);

todo.produce((draft) => {
  draft[1] = true
  draft.push({ title: "Tweet about it", done: false })
})
```

We can access baseState or, if mutated, nextState way simple:
```js
console.log(todo.state)
```

Differently than with `Immer`, we can set `setAutoFreeze` and `setUseStrictShallowCopy` by object, and not globally:
```js
todo.setAutoFreeze(false)
todo.setAutoFreeze(true)
```

We can also subscribe/unsubscribe to changes:
```js
const subscriptionId = todo.subscribe((nextState) =>
  console.log(nextState)
);

todo.produce((draft) => {
  draft[2] = true
})

todo.unsubscribe(subscriptionId)
```
