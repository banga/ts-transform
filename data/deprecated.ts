const u = {
  deprecated_some<T>(a: Array<T> | null, b: (t: T) => boolean): boolean {
    return a?.some(b) ?? false;
  },
};

function foo(x: Array<number>) {
  return x.some((y) => y % 2 === 0);
}

class A {
  bar(x: Array<string | null> | null) {
    if ([].some((l) => l)) {
    }
    return x?.some((y) => (y?.length ?? 0) % 2 === 0) ?? false;
  }
}
