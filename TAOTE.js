function TAOTE({ app, exhaustion }) {
  this.app = app;
  this.last = {
    args: {},
    op: undefined,
  };

  this.memory = {
    // put whatever you want in general
    result: {},
    window: [],
  };

  var timer = function (ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  // Can be used to address back-pressure
  this.rateLimit = async function* ({ generator, delay }) {
    for (let val of generator(this.app)) {
      await timer(delay);
      yield val;
    }
  };

  // Repeater returns a safe generator (that doesn't end)
  // Either it repeats itself (if finite) or repeat in round-robin
  this.repeater = function* ({ generator, round = 1 }) {
    if (!round) throw new Error("Round cannot be zero");
    while (true) {
      let co = 0;
      for (let val of generator(this.app)) {
        if (++co % round) yield val;
        else break;
      }
    }
  };

  // So generators when defined are pure, let's add randomness possibility for tests
  // This does not change values, we are not talking about that.
  // This changes the structure (when it ends)
  // Only one of the defined types must be provided
  // Note that original positions are preserved, and the new impure generator has not only data, but index as well
  // TODO:
  this.impurify = function* ({
    generator,
    endBeforeStart = false,
    ignoreSome = 0,
    hop = 0,
    expander = 0,
    shrinker = 0,
  }) {
    if (!(endBeforeStart || ignoreSome || hop || expander || shrinker)) throw new Error("One method must be provided");
    if (endBeforeStart && (ignoreSome || hop || expander || shrinker))
      throw new Error("endBeforeStart cannot be combined with other methods");
    if (shrinker && expander) console.warn("shrinker along with expander is confusing");

    if (endBeforeStart) yield null;
    if (ignoreSome) {
      let position = 0;
      for (let val of generator(this.app)) {
        if (-ignoreSome-- || ignoreSome == 0) yield [position, val];
        position++;
      }
      return;
    }

    if (hop) {
      let co = 0;
      let position = 0;
      for (let val of generator(this.app)) {
        if (co++ % hop) yield [position, val];
        position++;
      }
      return;
    }

    if (expander) {
      let co = 0;
      let position = 0;
      for (let val of generator(this.app)) {
        if (co++ % 2) {
          for (let i = 0; i < expander; i++) {
            yield [-1, Math.random()];
          }
        }
        yield [position, val];
        position++;
      }
    }
    // TODO:
    if (shrinker) {
      0;
    }

    throw new Error("This should not happen. Verify parameters types");
  };

  this.retry = function (resetMemory) {
    if (resetMemory) this.memory = { result: {}, window: [] };
    return this[this.last.op](this.last.args);
  };

  // Returns results as long as condition IS MET
  this.until = function* ({
    generator,
    condition = (_) => true,
    transformer = (v) => v,
    process = (v, m) => null,
    window = 1,
  }) {
    this.last.args = { generator, condition, transformer, process, window };
    this.last.op = "until";
    let startTime = Date.now();
    let result;
    let co = 0;
    for (let val of generator(this.app)) {
      if (result) return result;
      if (Date.now() > startTime + exhaustion * 1000) {
        result = "exhausted";
        yield result;
      }
      if (condition(val)) {
        this.memory.window[co++ % window] = val;
        process(val, this.memory);
        yield transformer(val);
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
  this.every = function* ({ generator, condition = (_) => true }) {
    this.last.args = { generator, condition };
    this.last.op = "every";
    let startTime = Date.now();
    let result;
    for (let val of generator(this.app)) {
      if (result) {
        yield result;
        return;
      }
      if (Date.now() > startTime + exhaustion * 1000) {
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
  this.some = function* ({ generator, condition = (_) => false }) {
    this.last.args = { generator, condition };
    this.last.op = "some";
    let startTime = Date.now();
    let result;
    for (let val of generator(this.app)) {
      if (result) {
        yield result;
        return;
      }
      if (Date.now() > startTime + exhaustion * 1000) {
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
  this.AUntilB = function* ({ generatorA, generatorB, conditionA = (_) => false, conditionB = (_) => false }) {
    this.last.args = { generatorA, generatorB, conditionA, conditionB };
    this.last.op = "AUntilB";
    let startTime = Date.now();
    let result;

    const combined = (function* (genA, genB) {
      let nextGenA, nextGenB;
      while (!(nextGenA = genA.next()).done && !(nextGenB = genB.next()).done) {
        yield { a: nextGenA.value, b: nextGenB.value };
      }
    })(generatorA(), generatorB());

    for (let val of combined) {
      if (result) return result;
      if (Date.now() > startTime + exhaustion * 1000) {
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

  this.registerLifeCycle = function registerLifeCycle() {
    //do something when app is closing
    process.on("exit", exitHandler.bind(null, { cleanup: true, app: this }));

    //catches ctrl+c event
    process.on("SIGINT", exitHandler.bind(null, { exit: true, app: this }));

    // catches "kill pid" (for example: nodemon restart)
    process.on("SIGUSR1", exitHandler.bind(null, { exit: true, app: this }));
    process.on("SIGUSR2", exitHandler.bind(null, { exit: true, app: this }));

    //catches uncaught exceptions
    process.on("uncaughtException", exitHandler.bind(null, { exit: true, app: this }));
  };
}

process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, exitCode) {
  console.log(`Last operation "${options.app.last.op}" has been stopped unexpectedly`);
  if (options.cleanup) console.log("clean");

  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

export default TAOTE;
