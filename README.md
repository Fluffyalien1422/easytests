# Easytests

A simple testing API for web scripts.
**This is not for testing entire websites, just scripts. Useful for web frameworks.**
Easytests can execute TypeScript or JavaScript tests natively.

Tests run with [JSDom](https://www.npmjs.com/package/jsdom) globals to simulate a web environment.

## Getting Started

1. Install Easytests with `npm i -D easytests`
2. Add a `test` script in your `package.json` with a value of `node --experimental-vm-modules ./tests/index.js`:

   ```json
   {
     "scripts": {
       "test": "node --experimental-vm-modules ./tests/index.js"
     }
   }
   ```

3. Create a `tests` directory in your project
4. Create a `tests/index.js` file with the following content:
   ```js
   import { executeInTestContext } from "easytests";
   executeInTestContext(
     "tests/my_test.test.ts" /* or "tests/my_test.test.js" */
   );
   ```
5. Create the test file. [Creating Your First Test](#creating-your-first-test).
6. Now run `npm test` to execute your tests.

## Creating Your First Test

This tutorial will use TypeScript but you can also use JavaScript.
First, create a `tsconfig.json` in your `tests` directory with the following content:

```json
{
  "extends": "path/to/your_other_config.json",
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "node",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

Next, create a `tests/my_test.test.ts` file with the following content:

```ts
// Imports ending in .d.ts will be ignored by the module loader
import "../types/test_globals.d.ts";
const { Test, Group } = $EASYTESTS;

// Also import the files you will be testing:
// Note: The file extension is required and importing `.ts` extensions is allowed.
//import * as myModule from "path/to/my_module/main_file.ts";
// For this tutorial we won't be testing any actual code, so you can ignore the import above.

// Also import tests you may have contained in other files:
//import * as myOtherTests from "./my_other_tests.test.ts";
// For this tutorial we won't have any other tests, so you can ignore the import above.
```

Now we can start writing our test.
All tests should be contained within one main `Group`:

```ts
import "../types/test_globals.d.ts";
const { Test, Group } = $EASYTESTS;

new Group(
  "Main group"
  // Your tests and other groups will go here.
).executeAsMain();
// No other groups should be executed, even in other files.
// To add tests from other files, import them and add them into the main group.
```

Tests are simple. All you need to do is return `true` or `false` to pass or fail the test, respectively.

You can create a test like this:

```ts
import "../types/test_globals.d.ts";
const { Test, Group } = $EASYTESTS;

new Group(
  "Main group",
  new Test("My test", () => {
    // do something
    return true;
  })
).executeAsMain();
```

However, you shouldn't create loose tests. Instead, organize them into a group:

```ts
import "../types/test_globals.d.ts";
const { Test, Group } = $EASYTESTS;

new Group(
  "Main group",
  new Group(
    "My group",
    new Test("My test", () => {
      // do something
      return true;
    })
  )
).executeAsMain();
```

Tests can also be asynchronous:

```ts
import "../types/test_globals.d.ts";
const { Test, Group } = $EASYTESTS;

new Group(
  "Main group",
  new Group(
    "My group",

    // This test will pass after 1 second.
    new Test(
      "My test",
      () => new Promise((resolve) => setTimeout(() => resolve(true), 1000))
    )
  )
).executeAsMain();
```

## Test Environment

Tests run with JSDom globals with the addition of the `$EASYTESTS` object. This simulates a web environment.

```ts
// This test will pass if the `#element-that-should-say-hello-world` element
// contains the "Hello, World!" text. Otherwise it will fail.
new Test(
  "My test",
  () =>
    document.getElementById("element-that-should-say-hello-world")
      ?.textContent === "Hello, World!"
);
```

## Additional Configuration

### Test Timeouts

By default Easytests will throw an error if a test takes longer than 30s to execute. You can change this by passing the maximum number of seconds to the `Test` constructor:

```ts
// This test will timeout if it takes longer than 1 second to execute.
new Test("My test", () => true, 1 /* timeoutSeconds */);
```

### executeInTestContext options

You can also pass the following options to the `executeInTestContext` function:

```ts
interface ExecuteInTestContextOptions {
  /**
   * The HTML that will be simulated in JSDom.
   */
  html?: string;
  /**
   * Options to pass to the JSDOM constructor.
   */
  jsdomOptions?: jsdom.ConstructorOptions;
  /**
   * The base path of your project (where the `node_modules` directory is.) This is used
   * to import files from node modules.
   */
  basePath?: string;
}
```
