# 🧮 MathHelper - Expression Editor

Interactive mathematical expression editor with visual transformation capabilities.

## ✨ Features

- **Visual Expression Parsing** - See all valid subexpressions with colored frames
- **Interactive Transformations** - Click on any subexpression to see available operations
- **Smart Frame Detection** - Automatically finds all parseable parts of your expression
- **Algebraic Operations** - Evaluate, simplify, expand, rearrange expressions
- **History Tracking** - Navigate through all changes with undo/redo
- **Rule Descriptions** - Learn what each transformation does

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 16+ and npm
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Access the App

Open [http://localhost:8000/expression-editor-modular.html](http://localhost:8000/expression-editor-modular.html)

## 📁 Project Structure

```
MathHelper/
├── src/                          # TypeScript source code
│   ├── types/index.ts           # Type definitions
│   ├── core/
│   │   ├── parser.ts            # Expression parser
│   │   ├── analyzer.ts          # Subexpression detection
│   │   └── rules.ts             # Transformation rules
│   └── utils/
│       └── helpers.ts           # AST utilities
├── expression-editor-modular.html # Main UI
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── vite.config.ts               # Vite config
```

## 🎯 How It Works

### 1. Enter an Expression

```
2 + 3 * 4
```

### 2. See Visual Frames

The editor automatically detects all valid subexpressions:
- `2` (constant)
- `3` (constant)
- `4` (constant)
- `3 * 4` (multiplication)
- `2 + 3 * 4` (full expression)

### 3. Click to Transform

Each frame shows available operations:
- **Computation** - Evaluate numeric expressions
- **Simplification** - Remove identity operations (×1, +0, etc.)
- **Transformation** - Apply algebraic rules (distributive, etc.)
- **Rearrangement** - Swap operands (commutative)
- **Wrapping** - Add parentheses or identity operations

### 4. Navigate History

Use the history panel to:
- See all previous states
- Click any state to restore it
- Review what rule was applied

## 🔧 Technology Stack

- **TypeScript** - Type-safe code with strict checking
- **Vite** - Fast development with HMR
- **ES Modules** - Modern modular architecture
- **Vanilla JavaScript** - No framework dependencies

## 📊 Transformation Rules

### Priority 1: Computation
- Evaluate arithmetic operations on constants

### Priority 2: Simplification
- Remove multiplication/division by 1
- Remove addition/subtraction of 0
- Simplify multiplication by 0
- Remove double negation
- Remove unnecessary parentheses

### Priority 3: Transformation
- Distributive property (expansion)
- Factoring (planned)

### Priority 4: Rearrangement
- Commutative property (swap operands)

### Priority 5: Wrapping
- Add parentheses
- Add double negation
- Multiply/divide by 1
- Add/subtract 0

## 🎨 UI Features

### Single-Screen Layout
- Fixed header with input
- Left panel: Available commands
- Center: Expression with frames
- Right panel: History + descriptions

### Smart Frame Positioning
- Monospace font for precise alignment
- Multi-level layout prevents overlap
- Hover highlighting shows covered characters
- Click interaction for commands

### Atomic Number Handling
- Multi-digit numbers (123) treated as single units
- Individual digits only if standalone

## 🧪 Development

### Build Commands

```bash
# TypeScript compilation
npm run build

# Watch mode (auto-recompile)
npm run watch

# Development server
npm run dev
```

### TypeScript Features

- Strict type checking enabled
- Discriminated unions for AST nodes
- Type guards for safe narrowing
- Source maps for debugging

## 📝 Examples

**Input:** `2 + 3 * 4`

**Available operations:**
1. Click `3 * 4` → Evaluate → `2 + 12`
2. Click `2 + 12` → Evaluate → `14`

**Input:** `x * (y + z)`

**Available operations:**
1. Click `x * (y + z)` → Expand → `x * y + x * z`

## 🤝 Contributing

This is a personal learning project. Feel free to fork and experiment!

## 📄 License

MIT License - feel free to use and modify.

## 🎓 Learning Resources

This project demonstrates:
- Recursive descent parsing
- Abstract Syntax Trees (AST)
- Pattern matching with TypeScript
- Algebraic transformation systems
- Interactive UI without frameworks
- Type-safe architecture

---

**Built with TypeScript + Vite** 🚀
