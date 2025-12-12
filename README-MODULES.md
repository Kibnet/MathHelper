# Expression Editor - Modular Architecture

## 📁 Project Structure

```
MathHelper/
├── js/
│   ├── core/               # Core logic (pure functions, no DOM)
│   │   ├── parser.js       # Expression parser (ExpressionParser class)
│   │   ├── analyzer.js     # Subexpression detection and frame layout
│   │   └── rules.js        # Transformation rules and applicability
│   ├── ui/                 # UI rendering (to be created)
│   │   ├── renderer.js     # DOM rendering functions
│   │   ├── commands-panel.js
│   │   └── frames.js       # Frame visualization
│   └── utils/              # Helper utilities
│       └── helpers.js      # AST manipulation, string conversion
├── tests/
│   ├── core/
│   │   └── parser.test.js  # Parser tests
│   └── test-runner.html    # Test suite runner
├── expression-editor.html  # Main application (to be refactored)
└── README-MODULES.md       # This file
```

## 🧩 Module Overview

### Core Modules (Logic Only - No DOM)

#### `js/core/parser.js`
**Exports:**
- `ExpressionParser` class - Parses expression strings into AST
- `generateId()` - Generates unique node IDs
- `resetIdCounter()` - Resets ID counter (useful for testing)

**Example:**
```javascript
import { ExpressionParser } from './js/core/parser.js';

const parser = new ExpressionParser('2 + 3 * 4');
const ast = parser.parse();
// Returns: { id: 'node_0', type: 'operator', value: '+', children: [...] }
```

#### `js/core/analyzer.js`
**Exports:**
- `findAllSubexpressions(exprString)` - Finds all valid subexpressions
- `assignLevels(subexpressions)` - Assigns non-overlapping levels
- `calculateFramePositions(subexpressions, exprString, config)` - Calculates frame positions
- `doRangesOverlap(start1, end1, start2, end2)` - Checks range overlap
- `measureTextWidth(text)` - Measures monospace text width
- `calculateTotalHeight(levels, config)` - Calculates total frame height

**Example:**
```javascript
import { findAllSubexpressions, assignLevels } from './js/core/analyzer.js';

const subexpressions = findAllSubexpressions('a + 2 + 3');
// Returns array of subexpression objects with positions
```

#### `js/core/rules.js`
**Exports:**
- `getApplicableRules(node)` - Returns array of applicable transformation rules

**Example:**
```javascript
import { getApplicableRules } from './js/core/rules.js';

const rules = getApplicableRules(astNode);
// Returns: [{ id: 'eval_add', name: '→ Evaluate', apply: fn, ... }]
```

#### `js/utils/helpers.js`
**Exports:**
- `expressionToString(node)` - Converts AST to string
- `cloneNode(node)` - Deep clones an AST node
- `findNodeById(root, id)` - Finds node by ID
- `replaceNode(root, targetId, newNode)` - Replaces node in AST
- `getLeafNodes(node)` - Gets all leaf nodes
- `countNodes(node)` - Counts total nodes
- `getDepth(node)` - Gets AST depth
- `nodesEqual(node1, node2)` - Checks structural equality

**Example:**
```javascript
import { expressionToString, cloneNode } from './js/utils/helpers.js';

const str = expressionToString(ast);
const copy = cloneNode(ast);
```

## 🧪 Testing

### Running Tests

1. Start local server (if not already running):
```bash
python -m http.server 8000
```

2. Open test runner:
```
http://localhost:8000/tests/test-runner.html
```

### Writing New Tests

Create a new test file in `tests/core/`:

```javascript
// tests/core/mymodule.test.js
import { MyFunction } from '../../js/core/mymodule.js';

export function runMyTests(runner) {
  runner.describe('My Module', function() {
    
    this.it('should do something', function() {
      const result = MyFunction('input');
      this.expect(result).toBe('expected');
    });
    
    this.it('should throw on invalid input', function() {
      this.expect(() => MyFunction(null)).toThrow();
    });
  });
}
```

Then import and run in `tests/test-runner.html`:

```javascript
import { runMyTests } from './core/mymodule.test.js';

const runner = new TestRunner();
runMyTests(runner);
runner.run();
```

### Test Assertions

Available assertions:
- `expect(value).toBe(expected)` - Strict equality
- `expect(value).toEqual(expected)` - Deep equality (JSON)
- `expect(array).toContain(item)` - Array contains item
- `expect(array).toHaveLength(n)` - Array length
- `expect(value).toBeGreaterThan(n)` - Numeric comparison
- `expect(value).toBeTruthy()` - Truthy check
- `expect(fn).toThrow()` - Function throws error

## 🎯 Benefits of Modular Architecture

### ✅ Testability
- Core logic is **pure functions** - easy to test
- No DOM dependencies in core modules
- Can use any test framework (Jest, Mocha, Vitest)

### ✅ Maintainability
- Clear separation of concerns
- Easy to find and modify specific functionality
- Smaller, focused files

### ✅ Reusability
- Core modules can be used in different contexts
- Parser can be used in Node.js, workers, or other projects
- Rules engine is framework-agnostic

### ✅ Collaboration
- Multiple developers can work on different modules
- Clear interfaces between modules
- Less merge conflicts

## 🚀 Next Steps

### To Complete Migration:

1. **Create UI modules** (`js/ui/`)
   - Extract DOM rendering logic from main HTML
   - Create separate modules for frames, panels, etc.

2. **Refactor main HTML file**
   - Import and use modules instead of inline scripts
   - Keep only initialization code

3. **Add more tests**
   - Analyzer tests
   - Rules tests
   - Utils tests
   - Integration tests

4. **Optional: Add build tools**
   - Bundle with Vite/Webpack
   - Add TypeScript
   - Add linting/formatting

## 📚 Module Import Examples

### In HTML:
```html
<script type="module">
  import { ExpressionParser } from './js/core/parser.js';
  import { findAllSubexpressions } from './js/core/analyzer.js';
  import { expressionToString } from './js/utils/helpers.js';
  
  // Use the modules
  const parser = new ExpressionParser('2 + 3');
  const ast = parser.parse();
  const str = expressionToString(ast);
</script>
```

### In another JS module:
```javascript
// my-module.js
import { ExpressionParser } from './core/parser.js';
import { getApplicableRules } from './core/rules.js';

export function analyzeExpression(input) {
  const parser = new ExpressionParser(input);
  const ast = parser.parse();
  return getApplicableRules(ast);
}
```

## 🔧 Configuration

Frame layout can be configured in `analyzer.js`:

```javascript
const config = {
  LEVEL_HEIGHT: 18,  // Height of each level in pixels
  BASE_OFFSET: 5     // Gap between text and first level
};

const positions = calculateFramePositions(subexpressions, exprString, config);
```

## 📝 Notes

- All core modules use **ES6 modules** (`import`/`export`)
- Requires a server to run (no `file://` protocol)
- Browser must support ES6 modules (all modern browsers)
- No build step required - runs directly in browser
