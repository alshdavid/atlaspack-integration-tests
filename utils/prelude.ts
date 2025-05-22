import * as nodeTest from "node:test";

const ATLASPACK_NATIVE = !!process.env.ATLASPACK_NATIVE

// Patch module to add test presets for
// native and legacy modes
declare module "node:test" {
  const nativeTest: typeof nodeTest.test;
  const legacyTest: typeof nodeTest.test;

  namespace test {
    export { 
      nativeTest as native,
      legacyTest as legacy,
    };
  }

  const nativeDescribe: typeof nodeTest.describe;
  const legacyDescribe: typeof nodeTest.describe;

  namespace describe {
    export { 
      nativeDescribe as native,
      legacyDescribe as legacy,
    };
  }
}

Object.defineProperty(nodeTest.test, "native", {
  get: () => ATLASPACK_NATIVE ? nodeTest.test : nodeTest.skip
});

Object.defineProperty(nodeTest.test, "legacy", {
  get: () => ATLASPACK_NATIVE ? nodeTest.skip : nodeTest.test
});

Object.defineProperty(nodeTest.describe, "native", {
  get: () => ATLASPACK_NATIVE ? nodeTest.describe : nodeTest.skip
});

Object.defineProperty(nodeTest.describe, "legacy", {
  get: () => ATLASPACK_NATIVE ? nodeTest.skip : nodeTest.describe
});
