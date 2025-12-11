# Expression Editor Test Cases

## Test Cases for Logical Expression Editor

### Basic Parsing Tests

1. **Simple Addition**
   - Input: `a + b`
   - Expected: Two-node tree with + operator and two variable children
   - Visual: Two green boxes (variables) connected by blue box (operator)

2. **Simple Multiplication**
   - Input: `a * b`
   - Expected: Two-node tree with * operator
   - Visual: Two green boxes connected by purple box

3. **Precedence**
   - Input: `a + b * c`
   - Expected: Addition at root, multiplication as right child
   - Visual: Nested structure showing multiplication inside addition

4. **Parentheses**
   - Input: `(a + b) * c`
   - Expected: Multiplication at root, grouped addition as left child
   - Visual: Gray grouping box around addition

5. **Unary Minus**
   - Input: `-a`
   - Expected: Unary node with variable child
   - Visual: Blue box with minus sign and green variable box

6. **Implicit Multiplication**
   - Input: `2a`
   - Expected: Multiplication node with implicit flag
   - Visual: Purple box showing `2 · a` (middle dot)

7. **Complex Expression**
   - Input: `2*(a+3)-b`
   - Expected: Multi-level tree with subtraction at root
   - Visual: Nested blocks showing all operations

### Transformation Tests

#### Distributive Property

1. **Forward (Expand)**
   - Start: `a*(b+c)`
   - Click: Multiplication block
   - Select: "→ Expand (Distributive)"
   - Result: `a*b + a*c`
   - History: Shows transformation with description

2. **Reverse (Factor)**
   - Start: `a*b + a*c`
   - Click: Addition block
   - Select: "← Factor Out"
   - Result: `a*(b+c)`
   - History: Shows reverse transformation

#### Commutative Property

1. **Addition**
   - Start: `a + b`
   - Click: Addition block
   - Select: "Swap Operands"
   - Result: `b + a`

2. **Multiplication**
   - Start: `2 * a`
   - Click: Multiplication block
   - Select: "Swap Operands"
   - Result: `a * 2`

#### Notation Transformations

1. **Make Implicit**
   - Start: `2 * a`
   - Click: Multiplication block
   - Select: "← Make Implicit"
   - Result: `2a`
   - Visual: Shows middle dot (·)

2. **Make Explicit**
   - Start: `2a`
   - Click: Multiplication block
   - Select: "→ Make Explicit"
   - Result: `2 * a`
   - Visual: Shows asterisk (*)

#### Simplification

1. **Double Negation**
   - Start: `--a`
   - Click: Outer unary minus block
   - Select: "Remove Double Negative"
   - Result: `a`

2. **Remove Parentheses**
   - Start: `(a)`
   - Click: Group block
   - Select: "Remove Parentheses"
   - Result: `a`

### History Navigation Tests

1. **Linear History**
   - Perform 3 transformations in sequence
   - Verify all 4 states appear (initial + 3 transformations)
   - Click on step 2
   - Verify expression reverts to step 2 state
   - Current state indicator moves to step 2

2. **Branching History**
   - Start with `a+b`
   - Apply transformation 1 (e.g., swap to `b+a`)
   - Click on initial state in history
   - Apply different transformation 2
   - Verify both branches exist in history
   - Both paths should remain accessible

3. **Description Updates**
   - Click on any history state
   - Verify description panel updates
   - Shows correct rule name, before/after, and reasoning

### Edge Cases

1. **Invalid Syntax**
   - Input: `a ++b`
   - Expected: Error message displayed
   - Visual: Red error text, no expression rendered

2. **Empty Input**
   - Input: (empty)
   - Click Build
   - Expected: "Please enter an expression" error

3. **Unmatched Parentheses**
   - Input: `(a + b`
   - Expected: "Missing closing parenthesis" error

4. **Invalid Start**
   - Input: `*a`
   - Expected: "Unexpected character" error

5. **Context Menu Edge**
   - Click on a simple variable block
   - Expected: No context menu (no applicable rules)

### Visual Tests

1. **Color Coding**
   - Create expression with all types: `2a + (b - c) * d`
   - Verify colors:
     - Constants (2): Orange
     - Variables (a,b,c,d): Green
     - Multiplication (*): Purple
     - Addition/Subtraction (+,-): Blue
     - Group (()): Gray

2. **Hover Effects**
   - Hover over any block
   - Verify border becomes thicker
   - Verify subtle glow effect
   - Verify slight upward translation

3. **Change Animation**
   - Apply any transformation
   - Verify changed block pulses with orange color
   - Animation lasts ~2 seconds

4. **Responsive Layout**
   - Resize browser window
   - Verify panels stack on narrow screens
   - Verify all content remains accessible

### Performance Tests

1. **Large Expression**
   - Input: `a+b+c+d+e+f+g+h+i+j`
   - Verify renders without lag
   - Verify all blocks are clickable

2. **Deep Nesting**
   - Input: `((((a))))`
   - Verify nested groups render correctly
   - Verify can remove parentheses step by step

3. **Long History**
   - Apply 20+ transformations
   - Verify history scrolls properly
   - Verify navigation remains fast

### Integration Tests

1. **Full Workflow**
   - Input: `2*(a+b)`
   - Expand: `2*a + 2*b`
   - Make implicit: `2a + 2*b`
   - Make implicit: `2a + 2b`
   - Navigate back to step 2
   - Verify can create alternative branch
   - Clear and start new expression
   - Verify history is cleared

## Manual Testing Checklist

- [ ] All basic expressions parse correctly
- [ ] All transformation rules appear when applicable
- [ ] Context menu positions correctly near clicked block
- [ ] History updates after each transformation
- [ ] Description panel shows correct information
- [ ] Navigation between history states works
- [ ] Branching history is supported
- [ ] Visual highlighting works (hover, change animation)
- [ ] Error handling shows appropriate messages
- [ ] Clear button resets all state
- [ ] Quick insert buttons work
- [ ] Enter key builds expression
- [ ] Click outside closes context menu
- [ ] All colors match specification
- [ ] Responsive design works on different screen sizes

## Automated Test Results

(To be filled after running tests)

### Parser Tests
- [ ] Simple expressions: PASS/FAIL
- [ ] Operator precedence: PASS/FAIL
- [ ] Implicit multiplication: PASS/FAIL
- [ ] Error handling: PASS/FAIL

### Transformation Tests
- [ ] Distributive property: PASS/FAIL
- [ ] Commutative property: PASS/FAIL
- [ ] Notation changes: PASS/FAIL
- [ ] Simplification: PASS/FAIL

### UI Tests
- [ ] Context menu: PASS/FAIL
- [ ] History navigation: PASS/FAIL
- [ ] Visual feedback: PASS/FAIL
- [ ] Responsive layout: PASS/FAIL
