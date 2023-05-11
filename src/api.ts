import chalk from "chalk";

type TestStatus = (typeof testStatuses)[keyof typeof testStatuses];
const testStatuses = {
  RUNNING: "⏳",
  FAILED: chalk.red("✖") + " ",
  PASSED: chalk.green("✔") + " ",
};

type VoidMethod = () => void;

abstract class BaseTest {
  abstract name: string;

  abstract toString(): string;

  /**
   * Executes this test. This should not be used manually outside of rare cases, use `Group.executeAsMain` instead.
   * @example
   * ```ts
   * new Test("My test", () => true).execute(Date.now(), () => { console.log('Log test data to the console.') })
   * // Use this instead:
   * new Group("Main group", new Test("My test", () => true)).executeAsMain();
   * ```
   */
  abstract execute(
    startTime: number,
    consoleUpdateMethod: VoidMethod
  ): void | Promise<void>;
}

/**
 * Test class. This is usually used within a Group class.
 * @example
 * ```ts
 * new Group("My group", new Test("My test", () => true))
 * ```
 */
export class Test extends BaseTest {
  status: TestStatus = testStatuses.RUNNING;
  timeStr = "--s";

  /**
   * @param timeoutSeconds The amount of seconds this test can run before an error is thrown.
   */
  constructor(
    readonly name: string,
    readonly callback: () => boolean | Promise<boolean>,
    readonly timeoutSeconds = 30
  ) {
    super();
  }

  toString() {
    return `${this.status} ${chalk.gray(this.timeStr)} ${chalk.bold(
      this.name
    )}`;
  }

  async execute(startTime: number, consoleUpdateMethod: VoidMethod) {
    this.status = testStatuses.RUNNING;
    consoleUpdateMethod();

    const timeout = setTimeout(() => {
      throw new Error(`Test ${chalk.bold(this.name)} timed out.`);
    }, this.timeoutSeconds * 1000);

    const passed = await this.callback();

    clearTimeout(timeout);

    this.status = passed ? testStatuses.PASSED : testStatuses.FAILED;

    this.timeStr = `${Math.floor((Date.now() - startTime) / 1000)
      .toString()
      .slice(0, 2)
      .padStart(2, "0")}s`;

    consoleUpdateMethod();
  }
}

export class Group extends BaseTest {
  readonly tests;

  constructor(readonly name: string, ...tests: BaseTest[]) {
    super();
    this.tests = tests;
  }

  toString() {
    const sep = "\n ";
    return [
      `${chalk.bold(this.name)}:`,
      ...this.tests.map((test) => test.toString().replaceAll("\n", sep)),
    ].join(sep);
  }

  execute(startTime: number, consoleUpdateMethod: VoidMethod) {
    for (const test of this.tests)
      void test.execute(startTime, consoleUpdateMethod);
  }

  /**
   * Executes this group as the main group. This will execute all child tests and log the data to the console in a UI.
   * @example
   * ```ts
   * new Group("Main group",
   *  new Test("Test a", () => true),
   *  new Group("Group a", new Test("Group a, test b", () => true))
   * ).executeAsMain();
   * ```
   */
  executeAsMain() {
    this.execute(Date.now(), () => {
      console.clear();
      console.log(this.toString());
    });
  }
}
