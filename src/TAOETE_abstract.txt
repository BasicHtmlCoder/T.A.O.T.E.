// Lighter distilled verion of TAOTE.js
// (without state and sophisticated operations)

import Generators from "./Generators";

var timer = function (ms): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class TAOTE {
  app: Generators;
  exhaustion: number;

  constructor(app: Generators, exhaustion: number) {
    this.app = app;
    this.exhaustion = exhaustion;
  }

  // Can be used to address back-pressure
  private async * rateLimit({ generator, delay }){
    for (let val of generator(this.app)) {
      await timer(delay);
      yield Promise.resolve(val);
    }
  };

  // Repeater returns a safe generator (that doesn't end)
  // Either it repeats itself (if finite) or repeat in round-robin
  private * repeater({ generator, round = 1 }): Generator {
    if (!round) throw new Error("Round cannot be zero");
    while (true) {
      let co = 0;
      for (let val of generator(this.app)) {
        if (++co % round) yield val;
        else break;
      }
    }
  };

  // Returns results as long as condition IS MET
  private * until({
    generator, condition = (_) => true,
  }): Generator {
    let startTime = Date.now();
    let result;
    
    for (let val of generator(this.app)) {
      if (result) return result;
      if (Date.now() > startTime + this.exhaustion * 1000) {
        result = "exhausted";
        yield result;
      }
      if (condition(val)) {
        yield val;
      } else {
        result = "halted";
        yield result;
      }
    }
    console.log("done");
  };

  // Checks if every value fulfills a condition and returns a Boolean
  // Returns as soon as condition is False
  // Returns True when exhausted
  private * every({ generator, condition = (_) => true }): Generator {
    let startTime = Date.now();
    let result;
    for (let val of generator(this.app)) {
      if (result) {
        yield result;
        return;
      }
      if (Date.now() > startTime + this.exhaustion * 1000) {
        result = "exhausted";
        yield true;
      }
      // Do not return from here as it is the default case of Every
      if (condition(val)) {
        1;
      } else {
        result = "halted";
        yield false;
      }
    }
    console.log("done");
  };

  // Checks if some values fulfill a condition and returns a Boolean
  // Returns as soon as condition is True
  // Returns False when exhausted
  private * some({ generator, condition = (_) => false }): Generator {
    let startTime = Date.now();
    let result;
    for (let val of generator(this.app)) {
      if (result) {
        yield result;
        return;
      }
      if (Date.now() > startTime + this.exhaustion * 1000) {
        result = "exhausted";
        yield false;
      }
      // Do not return from here as it is the default case of Some
      if (!condition(val)) {
        1;
      } else {
        result = "halted";
        yield true;
      }
    }
    console.log("done");
  };

  // Composition (inspired from LTL: Linear Time Logic. A logic used for formal testing systems)
  private * AUntilB({ generatorA, generatorB, conditionA = (_) => false, conditionB = (_) => false }): Generator {
    let startTime = Date.now();
    let result;

    const combined = (function* (genA, genB) {
      let nextGenA, nextGenB;
      while (!(nextGenA = genA.next()).done && !(nextGenB = genB.next()).done) {
        yield ({ a: nextGenA.value, b: nextGenB.value });
      }
    })(generatorA(), generatorB());

    for (let val of combined) {
      if (result) return result;
      if (Date.now() > startTime + this.exhaustion * 1000) {
        result = "exhausted";
        yield result;
      }
      if (conditionB(val.b)) {
        yield val.b;
      } else if (conditionA(val.a)) {
        yield val.a;
      }
    }
    console.log("done");
  };

};

// const exhaustion = 2; // Seconds we consider it Infinite already
// const app = new Generators();
// new TAOTE(app, exhaustion);


// export default TAOTE;
