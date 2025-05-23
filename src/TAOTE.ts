import Generators from "./Generators";

interface Memory {
  result: any;
  window: any[];
}

interface LastOperation {
  args: any;
  op: 'repeater' | 'impurify' | 'until' | 'every' | 'some' | 'AUntilB' | undefined;
}

class TAOTE {
  app: Generators;
  exhaustion: number;
  last: LastOperation;
  memory: Memory;

  constructor(app: Generators, exhaustion: number) {
    this.app = app;
    this.exhaustion = exhaustion;
    this.last = {
      args: {},
      op: undefined,
    };
    this.memory = {
      result: {},
      window: [],
    };

    this.registerLifeCycle();
  }

  private timer(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // Can be used to address back-pressure
  public async *rateLimit({ generator, delay }: { generator: any; delay: number }): AsyncGenerator<any, void, unknown> {
    for (let val of generator(this.app)) {
      await this.timer(delay);
      yield val;
    }
  }

  // Repeater returns a safe generator (that doesn't end)
  // Either it repeats itself (if finite) or repeat in round-robin
  public *repeater({ generator, round = 1 }: { generator: any; round?: number }): Generator<any, void, unknown> {
    if (!round) throw new Error("Round cannot be zero");
    while (true) {
      let co = 0;
      for (let val of generator(this.app)) {
        if (++co % round) yield val;
        else break;
      }
    }
  }

  // So generators when defined are pure, let's add randomness possibility for tests
  // This does not change values, we are not talking about that.
  // This changes the structure (when it ends)
  // Only one of the defined types must be provided
  // Note that original positions are preserved, and the new impure generator has not only data, but index as well
  // TODO:
  public *impurify({
    generator,
    endBeforeStart = false,
    ignoreSome = 0,
    hop = 0,
    expander = 0,
    shrinker = 0,
  }: {
    generator: any;
    endBeforeStart?: boolean;
    ignoreSome?: number;
    hop?: number;
    expander?: number;
    shrinker?: number;
  }): Generator<any, void, unknown> {
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
  }

  // public retry(resetMemory: boolean) {
  //   if (resetMemory) this.memory = { result: {}, window: [] };
  //   return TOATE[this.last.op as OppLastOperation](this.last.args);
  // }

  // Returns results as long as condition IS MET
  public *until({
    generator,
    condition = (_: any) => true,
    transformer = (v: any) => v,
    process = (v: any, m: Memory) => null,
    window = 1,
  }: {
    generator: any;
    condition?: (val: any) => boolean;
    transformer?: (val: any) => any;
    process?: (val: any, memory: Memory) => void;
    window?: number;
  }): Generator<any, void, unknown> {
    this.last.args = { generator, condition, transformer, process, window };
    this.last.op = "until";
    let startTime = Date.now();
    let result: any;
    let co = 0;
    for (let val of generator(this.app)) {
      if (result) return result;
      if (Date.now() > startTime + this.exhaustion * 1000) {
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
  }

  // Checks if every value fulfills a condition and returns a Boolean
  // Returns as soon as condition is False
  // Returns True when exhausted
  public *every({ generator, condition = (_: any) => true }: { generator: any; condition?: (val: any) => boolean }): Generator<any, void, unknown> {
    this.last.args = { generator, condition };
    this.last.op = "every";
    let startTime = Date.now();
    let result: any;
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
  }

  // Checks if some values fulfill a condition and returns a Boolean
  // Returns as soon as condition is True
  // Returns False when exhausted
  public *some({ generator, condition = (_: any) => false }: { generator: any; condition?: (val: any) => boolean }): Generator<any, void, unknown> {
    this.last.args = { generator, condition };
    this.last.op = "some";
    let startTime = Date.now();
    let result: any;
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
  }

  // Composition (inspired from LTL: Linear Time Logic. A logic used for formal testing systems)
  public *AUntilB({
    generatorA,
    generatorB,
    conditionA = (_: any) => false,
    conditionB = (_: any) => false,
  }: {
    generatorA: any;
    generatorB: any;
    conditionA?: (val: any) => boolean;
    conditionB?: (val: any) => boolean;
  }): Generator<any, void, unknown> {
    this.last.args = { generatorA, generatorB, conditionA, conditionB };
    this.last.op = "AUntilB";
    let startTime = Date.now();
    let result: any;

    const combined = (function* (genA: any, genB: any) {
      let nextGenA: any, nextGenB: any;
      while (!(nextGenA = genA.next()).done && !(nextGenB = genB.next()).done) {
        yield { a: nextGenA.value, b: nextGenB.value };
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
  }

  public *authority(self: TAOTE): Generator<Promise<void>, void, unknown> {
    let delay = 1000;
    while (true) {
      yield new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  public async *delayedGenerator({ generator }: { generator: any }): AsyncGenerator<any, void, unknown> {
    const combined = (function* (genA: any, genB: any) {
      let nextGenA: any, nextGenB: any;
      while (!(nextGenA = genA.next()).done && !(nextGenB = genB.next()).done) {
        yield { a: nextGenA.value, b: nextGenB.value };
      }
    })(generator(), this.authority(this));
    for (let wee_wee of combined) {
      yield Promise.all([wee_wee.a, wee_wee.b]);
    }
  }

  private registerLifeCycle(): void {
    if (typeof process !== 'object') {
      // TODO: deal wwith browser environment

      return;
    }

    //do something when app is closing
    process.on("exit", exitHandler.bind(null, { cleanup: true, app: this }));

    //catches ctrl+c event
    process.on("SIGINT", exitHandler.bind(null, { exit: true, app: this }));

    // catches "kill pid" (for example: nodemon restart)
    process.on("SIGUSR1", exitHandler.bind(null, { exit: true, app: this }));
    process.on("SIGUSR2", exitHandler.bind(null, { exit: true, app: this }));

    //catches uncaught exceptions
    process.on("uncaughtException", exitHandler.bind(null, { exit: true, app: this }));
  }
}

if (typeof process === 'object')
  process.stdin.resume(); //so the program will not close instantly

function exitHandler(options: { cleanup?: boolean; exit?: boolean; app: TAOTE }, exitCode?: number): void {
  console.log(`Last operation "${options.app.last.op}" has been stopped unexpectedly`);
  if (options.cleanup) console.log("clean");

  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

export default TAOTE;
