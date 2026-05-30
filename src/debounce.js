export function makeDebounce(fn, delayMs) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };
}
// change
// test
// final test
