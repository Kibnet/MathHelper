/**
 * Простой тестовый фреймворк
 * Легковесные утилиты для тестирования без внешних зависимостей
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  describe(name: string, fn: () => void): void {
    this.currentSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0
    };

    const suiteStart = performance.now();
    fn();
    this.currentSuite.duration = performance.now() - suiteStart;

    this.suites.push(this.currentSuite);
    this.currentSuite = null;
  }

  it(name: string, fn: () => void): void {
    if (!this.currentSuite) {
      throw new Error('it() must be called inside describe()');
    }

    const start = performance.now();
    const result: TestResult = {
      name,
      passed: false,
      duration: 0
    };

    try {
      fn();
      result.passed = true;
      this.currentSuite.passed++;
    } catch (error) {
      result.passed = false;
      result.error = error instanceof Error ? error.message : String(error);
      this.currentSuite.failed++;
    }

    result.duration = performance.now() - start;
    this.currentSuite.tests.push(result);
  }

  getSuites(): TestSuite[] {
    return this.suites;
  }

  getTotalStats() {
    const total = this.suites.reduce((acc, suite) => ({
      passed: acc.passed + suite.passed,
      failed: acc.failed + suite.failed,
      duration: acc.duration + suite.duration
    }), { passed: 0, failed: 0, duration: 0 });

    return {
      ...total,
      total: total.passed + total.failed,
      suites: this.suites.length
    };
  }

  clear(): void {
    this.suites = [];
    this.currentSuite = null;
  }
}

export const runner = new TestRunner();
export const describe = runner.describe.bind(runner);
export const it = runner.it.bind(runner);

/**
 * Утилиты для проверок
 */
export function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },

    toEqual(expected: T): void {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr}, but got ${actualStr}`);
      }
    },

    toBeNull(): void {
      if (actual !== null) {
        throw new Error(`Expected null, but got ${JSON.stringify(actual)}`);
      }
    },

    toBeUndefined(): void {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, but got ${JSON.stringify(actual)}`);
      }
    },

    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${JSON.stringify(actual)}`);
      }
    },

    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected falsy value, but got ${JSON.stringify(actual)}`);
      }
    },

    toContain(item: any): void {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(String(item))) {
          throw new Error(`Expected string to contain ${JSON.stringify(item)}`);
        }
      } else {
        throw new Error('toContain() only works with arrays and strings');
      }
    },

    toHaveLength(length: number): void {
      const actualLength = (actual as any).length;
      if (actualLength !== length) {
        throw new Error(`Expected length ${length}, but got ${actualLength}`);
      }
    },

    toThrow(expectedMessage?: string): void {
      if (typeof actual !== 'function') {
        throw new Error('toThrow() expects a function');
      }

      let thrown = false;
      let thrownError: any;

      try {
        (actual as Function)();
      } catch (error) {
        thrown = true;
        thrownError = error;
      }

      if (!thrown) {
        throw new Error('Expected function to throw an error');
      }

      if (expectedMessage !== undefined) {
        const errorMessage = thrownError instanceof Error ? thrownError.message : String(thrownError);
        if (!errorMessage.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", but got "${errorMessage}"`);
        }
      }
    },

    toBeGreaterThan(value: number): void {
      if (typeof actual !== 'number') {
        throw new Error('toBeGreaterThan() expects a number');
      }
      if (actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`);
      }
    },

    toBeLessThan(value: number): void {
      if (typeof actual !== 'number') {
        throw new Error('toBeLessThan() expects a number');
      }
      if (actual >= value) {
        throw new Error(`Expected ${actual} to be less than ${value}`);
      }
      }
  };
}
