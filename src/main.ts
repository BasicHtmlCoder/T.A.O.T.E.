import Generators from "./Generators";
import TAOTE from "./TAOTE";
import * as a from "../GeneratorCanvas/animation"
import * as f from "../GeneratorCanvas/frame"

const square = new f.Rect(0, 0, 100, 100, a.HexColor("#e6e2e1"));

const exhaustion: number = 2; // Seconds we consider it Infinite already
const condition1 = (value: number): boolean => value == 0 || value > 0;
const condition2 = (value: number): boolean => value > 300;
const condition3 = (value: number): boolean => value < 0;
const condition4 = (value: number): boolean => value < -300;

function transform(value: number): number {
  return value * 2;
}

function process(value: number, memo: any): void {
  // Do whatever and rely on memo.result to stack results
  memo.result["sum"] = memo.result["sum"] ? memo.result["sum"] + value : 0;
}

const app: Generators = new Generators();
const context: TAOTE = new TAOTE(app, exhaustion);
context.registerLifeCycle();
// for (let n of context.repeater({ generator: naturals, round: 5 })) {
//     console.log(n);
// }
(async () => {
  for await (let n of context.delayedGenerator({ generator: app.naturals })) {
    console.log(n);
  }
})();

/*
const fib = app.fibonacci; // function context detached
// for (let val of fib()) {
//     console.log(val)
// }

console.log("trying UNTIL");
for (let n of context.until({ generator: app.naturals, condition: condition1, transform, process })) {
  // console.log(n);
}

console.log('first memory')
console.log(context.memory)
// Having memory, It is easy to rebuilt a retry scenario. A scenario similar to rebooting an app after a failure.
// A retry scenario is to run the last operation with the same argumants once again but importantly building on the same previous or a new memory
for (let n of context.retry(false)) {
    // console.log(n);
}
console.log('second memory')
console.log(context.memory)
console.log('trying EVERY')
for (let _every of context.every({ generator: app.naturals, condition: condition1 })) { console.log(_every) }

console.log('trying SOME')
for (let _some of context.some({ generator: app.naturals, condition: condition2 })) { console.log(_some) }

console.log('trying SOME')
for (let _some of context.some({ generator: app.naturals, condition: condition3 })) { console.log(_some) }

let generatorA = app.naturals
let generatorB = app.negatives
console.log('trying AUntilB')
for (let n of context.AUntilB({ generatorA, generatorB, conditionA: condition1, conditionB: condition4 })) {
    // console.log(n);
}
*/
