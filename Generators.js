// This is an inplementation of our own, you would make your own generators with their
// respective base
function Generators() {
    // Used for recursive generators - where f(n,) is defined by f(n-1,), f(n-2,), ...
    this.base = [];
    this.fibonacci = function* fibonacci(self) {
        console.log(self.base);
        self.base.push(0);
        self.base.push(1);
        let next;
        yield 0;
        yield 1;
        while (true) {
            next = self.base[0] + self.base[1];;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
            [self.base[0], self.base[1]] = [self.base[1], next];
            yield next;
        }
    };

    this.naturals = function* naturals(self) {
        let index = 0;
        while (true)
            yield index++;
    };
    this.negatives = function* negatives(self) {
        let index = 0;
        while (true)
            yield index--;
    };

}

export default Generators