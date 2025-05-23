# Test Apps On The Edge

This is an attempt to test apps the time they bootstrap, crash or recover. To be able to deliver such practical solution, let's rephrase the previous phrase to the following:

Take decisions on un-bound data under the [closed world assumption](https://en.wikipedia.org/wiki/Closed-world_assumption) 

Before understanding "intent" please read [README](README.md).

## Intent

Values from streams can be **"pulled"** or **"pushed"** ; In other words, values can be asked for (on demand by consumer) or continuously ingested (on decision by producer).

In TAOTE, I would like to introduce the concept of **"Intent"**. Please let me lay it down through some examples first so you can get a taste of what **"Intent"** in the context of streams and paricularly in **TAOTE**'s world might be.

### Examples

Having a worker **A** in a Factory **F**; Let's assume **A** is a consumer of tasks and the Factory is a producer of tasks.

- Somebody is doing a job while not really liking it, the only motive is to get some money:
    - When **A** says "enough", that means **A** can no longer consume anything. Before **A** say "enough" **A** is OK with it, we know **A** is neither happy nor sad, **A** just wants money.
- Now imagine, **A** is the only one in the Factory, no authority and the Factory is in fact a river with plenty of gold:
    - **A** is always happy about it if the time **A** asks for Gold, **A** gets a new amount of Gold
    - **A** is unhappy about it if there is a delay
    - Before or after saying "enough" has no influence on **A** being Happy or unhappy

```js
  // 2nd case is just a generator
  // 1st case is that generator with a timer (another generator)
  
  this.authority = function* authority(self) {
    let delay = 1000;
    while (true) {
      yield new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  };

  this.delayedGenerator = async function* ({ generator }) {
    const combined = (function* (genA, genB) {
      let nextGenA, nextGenB;
      while (!(nextGenA = genA.next()).done && !(nextGenB = genB.next()).done) {
        yield { a: nextGenA.value, b: nextGenB.value };
      }
    })(generator(), this.authority());
    for (let wee_wee of combined) {
      yield Promise.all([wee_wee.a, wee_wee.b])
    }
  };
```

To simplify, you can view the first case as *Responsibility* and the second as a *Game*. You can see we introduced a whole new view of *consuming vs. producing* streams. In contrast to the classic *pull vs. push* approach.

-- to be continued.
