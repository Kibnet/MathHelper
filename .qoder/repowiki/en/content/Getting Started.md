# Getting Started

<cite>
**Referenced Files in This Document**
- [expression-editor.html](file://expression-editor.html)
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md)
- [IMPLEMENTATION-SUMMARY.md](file://IMPLEMENTATION-SUMMARY.md)
- [TEST-CASES.md](file://TEST-CASES.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Launch the Application](#launch-the-application)
4. [Using the Editor: Step-by-Step](#using-the-editor-step-by-step)
5. [Developer Quickstart: Inspecting the Single HTML File](#developer-quickstart-inspecting-the-single-html-file)
6. [Beginner-Friendly Examples](#beginner-friendly-examples)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Next Steps](#next-steps)

## Introduction
Welcome to the Logical Expression Editor. This single-file web application lets you visualize mathematical expressions as nested blocks, apply bidirectional transformation rules, and explore a branching history of changes. It requires no installation or build steps—just open the HTML file in a modern browser.

## Prerequisites
- A modern web browser (Chrome, Edge, Firefox, Safari)
- Basic familiarity with mathematical notation:
  - Variables: letters like a, b, x, y
  - Numbers: integers and decimals
  - Operators: +, −, *, /
  - Parentheses: ( )
  - Unary minus: −a
- Basic JavaScript knowledge helps developers explore the codebase quickly

**Section sources**
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L1-L20)
- [IMPLEMENTATION-SUMMARY.md](file://IMPLEMENTATION-SUMMARY.md#L250-L275)

## Launch the Application
- Open the file expression-editor.html in your browser
- The interface appears immediately with:
  - An input panel at the top
  - A visual block viewer in the center-left
  - A history panel on the right
  - A description panel below

No installation or build steps are required.

**Section sources**
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L44-L52)
- [IMPLEMENTATION-SUMMARY.md](file://IMPLEMENTATION-SUMMARY.md#L250-L275)

## Using the Editor: Step-by-Step
1. Enter a mathematical expression in the input field (examples: 2*(a+3)-b, a+b, 2a+3b)
2. Click “Build Expression” or press Enter
3. The expression renders as nested blocks in the viewer
4. Interact with blocks:
   - Hover to see highlighting
   - Right-click a block to open the context menu with applicable transformation rules
5. Apply a rule to transform the expression
6. Use the history panel to navigate between states and explore branches

Tip: Use the quick-insert toolbar to add operators and common tokens.

**Section sources**
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L44-L52)
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L90-L111)
- [TEST-CASES.md](file://TEST-CASES.md#L1-L21)

## Developer Quickstart: Inspecting the Single HTML File
The entire application lives in a single HTML file. Here’s how to navigate it:

- Global state and helpers
  - Look for global variables and utilities near the top of the script section
  - Find the unique ID generator and text insertion helper
  - See the global arrays for current expression, history, and state index
  - Reference: [expression-editor.html](file://expression-editor.html#L484-L510)

- Expression parsing
  - The parser class converts a string into an expression tree
  - It handles operator precedence, unary minus, implicit multiplication, and parentheses
  - Reference: [expression-editor.html](file://expression-editor.html#L508-L666)

- Rendering
  - The renderer creates nested block elements and attaches click handlers
  - Reference: [expression-editor.html](file://expression-editor.html#L669-L736)

- Context menu and rules
  - The context menu lists applicable rules for the selected block
  - Rules are categorized and include previews
  - Reference: [expression-editor.html](file://expression-editor.html#L739-L823), [expression-editor.html](file://expression-editor.html#L887-L1169)

- Applying transformations
  - The transformation engine clones the tree, finds the target node, applies the rule, updates the UI, and records history
  - Reference: [expression-editor.html](file://expression-editor.html#L1434-L1469)

- History management
  - Adds states to history, supports branching, and renders the timeline
  - Reference: [expression-editor.html](file://expression-editor.html#L1471-L1541)

- UI wiring
  - Event listeners connect the Build and Clear buttons, handle Enter key, and close the context menu when clicking outside
  - Reference: [expression-editor.html](file://expression-editor.html#L1653-L1718)

Key functions to bookmark:
- buildExpression(): triggers parsing and rendering
- applyTransformation(): executes a rule and updates the UI
- getApplicableRules(): determines available transformations for a node
- renderExpression(): draws the block tree
- addToHistory(): records a new state
- renderHistory(): displays the timeline

**Section sources**
- [expression-editor.html](file://expression-editor.html#L484-L510)
- [expression-editor.html](file://expression-editor.html#L508-L666)
- [expression-editor.html](file://expression-editor.html#L669-L736)
- [expression-editor.html](file://expression-editor.html#L739-L823)
- [expression-editor.html](file://expression-editor.html#L887-L1169)
- [expression-editor.html](file://expression-editor.html#L1434-L1469)
- [expression-editor.html](file://expression-editor.html#L1471-L1541)
- [expression-editor.html](file://expression-editor.html#L1653-L1718)

## Beginner-Friendly Examples
Try these short loops to feel the immediate feedback:

- Expand a distributive expression
  - Enter: 2*(a+b)
  - Click the multiplication block
  - Choose “→ Expand (Distributive)”
  - Observe the visual change and the history entry
  - Reference: [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L55-L61)

- Make multiplication implicit
  - Enter: 2 * a + 3 * b
  - Click a multiplication block
  - Choose “← Make Implicit”
  - Repeat for the other multiplication
  - Observe the visual change and the history entry
  - Reference: [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L62-L70)

- Navigate history and branch
  - Apply several transformations
  - Click on a previous state in the history panel
  - Apply a different transformation to create a branch
  - Both paths remain accessible
  - Reference: [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L71-L78)

- Hover and right-click
  - Hover over blocks to see highlighting
  - Right-click any block to open the context menu and review available rules
  - Reference: [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L90-L111)

**Section sources**
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L55-L78)
- [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L90-L111)

## Troubleshooting Common Issues
- Empty input
  - If you click “Build” without typing anything, an error message appears
  - Fix: Enter a valid expression and try again
  - Reference: [expression-editor.html](file://expression-editor.html#L1653-L1689)

- Invalid syntax
  - Examples: consecutive operators, unmatched parentheses, missing operands
  - Fix: Correct the expression; the parser reports clear error messages
  - Reference: [TEST-CASES.md](file://TEST-CASES.md#L127-L149)

- Context menu does not appear
  - Some blocks have no applicable rules (e.g., a simple variable)
  - Fix: Try another block or adjust the expression
  - Reference: [TEST-CASES.md](file://TEST-CASES.md#L146-L150)

- Clearing state
  - Use the Clear button to reset the input, viewer, history, and description panels
  - Reference: [expression-editor.html](file://expression-editor.html#L1691-L1703)

**Section sources**
- [expression-editor.html](file://expression-editor.html#L1653-L1689)
- [TEST-CASES.md](file://TEST-CASES.md#L127-L150)
- [expression-editor.html](file://expression-editor.html#L1691-L1703)

## Next Steps
- Explore more examples and workflows in the documentation
- Extend the editor by adding new transformation rules or operators
- Reference the implementation details and extension guidelines
- Reference: [README-EXPRESSION-EDITOR.md](file://README-EXPRESSION-EDITOR.md#L171-L216), [IMPLEMENTATION-SUMMARY.md](file://IMPLEMENTATION-SUMMARY.md#L180-L209)