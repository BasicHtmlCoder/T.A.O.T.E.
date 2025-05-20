// This is an implementation of our own, you would make your own generators with their
// respective base
class Generators {
  base: number[];

  constructor() {
    this.base = [];
  }

  *fibonacci(self: Generators): Generator<number, void, unknown> {
    console.log(self.base);
    self.base.push(0);
    self.base.push(1);
    let next: number;
    yield 0;
    yield 1;
    while (true) {
      next = self.base[0] + self.base[1];
      [self.base[0], self.base[1]] = [self.base[1], next];
      yield next;
    }
  }

  *naturals(self: Generators): Generator<number, void, unknown> {
    let index = 0;
    while (true) yield index++;
  }

  *negatives(self: Generators): Generator<number, void, unknown> {
    let index = 0;
    while (true) yield index--;
  }
}

export default Generators;
