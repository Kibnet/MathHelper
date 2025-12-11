# Logical Expression Editor

A web-based mathematical expression editor that visualizes expressions as nested blocks with color-coded highlighting. Users can apply bidirectional transformation rules via context menus and navigate through a branching history of modifications.

## Features

### Core Capabilities

- **Dual Input Method**: Type expressions in a text field or use the visual builder toolbar
- **Visual Block Representation**: Expressions displayed as nested, color-coded blocks
- **Context Menu Transformations**: Right-click any block to see applicable transformation rules
- **Bidirectional Rules**: All transformations work in both directions (e.g., expand ↔ factor)
- **Branching History**: Navigate through all transformation states with branching support
- **Real-time Feedback**: Immediate visual feedback with animated highlights on changes
- **Rule Descriptions**: Detailed explanations of each transformation with before/after examples

### Supported Operations

- Addition (+)
- Subtraction (-)
- Multiplication (*)
- Division (/)
- Unary minus (negation)
- Parentheses for grouping

### Transformation Rules

#### Algebraic Properties
- **Commutative Property**: a + b ↔ b + a, a * b ↔ b * a
- **Associative Property**: (a + b) + c ↔ a + (b + c)
- **Distributive Property**: a * (b + c) ↔ a * b + a * c

#### Notation Simplification
- **Implicit Multiplication**: 2 * a ↔ 2a, a * b ↔ ab
- **Explicit Multiplication**: 2a ↔ 2 * a
- **Parentheses Removal**: (a) ↔ a (when safe)

#### Simplification Rules
- **Double Negation**: --a ↔ a
- **Common Factor**: a*b + a*c ↔ a*(b+c)

## Usage

### Getting Started

1. Open `expression-editor.html` in a web browser
2. Enter a mathematical expression in the input field (e.g., `2*(a+3)-b`)
3. Click "Build Expression" to visualize it
4. Click on any block to see available transformations
5. Select a transformation from the context menu
6. View the updated expression and transformation history

### Example Workflows

#### Expanding a Distributive Expression

1. Input: `2*(a+b)`
2. Click on the multiplication block
3. Select "→ Expand (Distributive)"
4. Result: `2*a + 2*b`

#### Making Multiplication Implicit

1. Input: `2 * a + 3 * b`
2. Click on the first multiplication block
3. Select "← Make Implicit"
4. Result: `2a + 3*b`
5. Repeat for second multiplication
6. Result: `2a + 3b`

#### Using History Navigation

1. Apply several transformations
2. Click on any previous state in the history panel
3. Expression reverts to that state
4. Apply a different transformation to create a branch
5. Both paths remain accessible in history

## Visual Guide

### Color Coding

- **Blue Borders**: Addition/Subtraction operators
- **Purple Borders**: Multiplication/Division operators
- **Green Borders**: Variables
- **Orange Borders**: Constants (numbers)
- **Gray Borders**: Grouping (parentheses)

### UI Panels

1. **Input Panel** (Top)
   - Text input field for expressions
   - Quick insert toolbar with common operators
   - Build and Clear buttons

2. **Expression Viewer** (Center-Left, 60%)
   - Visual block representation
   - Click blocks to open context menu
   - Hover for highlighting effects

3. **History Panel** (Right, 40%)
   - Chronological list of all states
   - Current state highlighted in blue
   - Click to navigate to any previous state
   - Branches shown with indentation

4. **Description Panel** (Bottom)
   - Rule name and explanation
   - Before/After expressions
   - Mathematical basis formula

## Expression Parser

The parser handles:
- **Operator Precedence**: Multiplication/division before addition/subtraction
- **Unary Operators**: Distinguishes unary minus from binary subtraction
- **Implicit Multiplication**: Recognizes `2a` as `2 * a`
- **Parentheses**: Proper grouping and nesting
- **Error Handling**: Clear error messages for invalid syntax

### Supported Input Formats

Valid expressions:
- `a + b`
- `2 * (a + 3)`
- `2a + 3b`
- `-(x + y)`
- `a*(b+c) - d/2`

Invalid expressions (with errors):
- `a ++b` (consecutive operators)
- `(a + b` (unmatched parentheses)
- `*a` (operator without operand)

## Implementation Details

### Architecture

The application is built as a single HTML file with embedded CSS and JavaScript:

- **No Dependencies**: Pure vanilla JavaScript, no frameworks required
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Theme**: Modern dark UI with gradient backgrounds

### Data Structures

**Expression Tree Node**
```javascript
{
  id: "node_123",           // Unique identifier
  type: "operator",         // operator|unary|variable|constant|group
  value: "*",               // Operator symbol or value
  children: [node1, node2], // Child nodes
  implicit: true            // For implicit multiplication
}
```

**History State**
```javascript
{
  id: "state_456",
  expression: {...},         // Full expression tree
  rule: "Distributive",      // Applied rule name
  before: "a*(b+c)",        // Before transformation
  after: "a*b + a*c",       // After transformation
  timestamp: Date,
  parentId: "state_123"     // For branching
}
```

### Key Functions

- `ExpressionParser.parse()`: Converts string to expression tree
- `renderExpression()`: Creates visual block representation
- `getApplicableRules()`: Determines valid transformations for a node
- `applyTransformation()`: Executes rule and updates expression
- `addToHistory()`: Records state with branching support

## Extending the Editor

### Adding New Transformation Rules

To add a new rule, extend the `getApplicableRules()` function:

```javascript
if (node.type === 'operator' && node.value === '+') {
  rules.push({
    id: 'my_new_rule',
    name: 'My Transformation',
    category: 'Simplification',
    preview: 'a+0 → a',
    apply: myTransformFunction
  });
}
```

Then implement the transformation function:

```javascript
function myTransformFunction(node) {
  // Return transformed node tree
  return {
    id: generateId(),
    type: 'variable',
    value: node.children[0].value
  };
}
```

### Adding New Operators

1. Update the parser to recognize the operator symbol
2. Add parsing logic in appropriate precedence level
3. Add color scheme in CSS
4. Implement rendering in `createExpressionElement()`

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ⚠️ Limited (context menu requires mouse)

## Performance Considerations

- Expression trees are deep-cloned for each state (ensures consistency)
- History limited to 100 states (prevents memory issues)
- Event delegation used for block click handlers
- Debounced input parsing (not yet implemented, future enhancement)

## Accessibility

- Keyboard navigation: Tab through all interactive elements
- ARIA labels on context menu
- High contrast color scheme
- Focus indicators on all buttons and inputs

## Future Enhancements

Potential improvements based on design document:

- [ ] Keyboard shortcuts for common transformations
- [ ] Undo/Redo with Ctrl+Z/Ctrl+Y
- [ ] Export expression as LaTeX or image
- [ ] Animation of transformation steps
- [ ] More algebraic rules (exponentiation, roots, logarithms)
- [ ] Automatic simplification suggestions
- [ ] Step-by-step explanation mode
- [ ] Local storage persistence for session recovery

## License

This is a demonstration project. Feel free to use and modify as needed.

## Credits

Developed based on the Logical Expression Editor design document specification.
