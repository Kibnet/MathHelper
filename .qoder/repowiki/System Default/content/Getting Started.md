# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [TESTING.md](file://TESTING.md)
- [package.json](file://package.json)
- [vite.config.ts](file://vite.config.ts)
- [tsconfig.json](file://tsconfig.json)
- [vitest.config.ts](file://vitest.config.ts)
- [expression-editor-modular.html](file://expression-editor-modular.html)
- [test-runner.html](file://test-runner.html)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Development Workflow](#development-workflow)
5. [Application Launch](#application-launch)
6. [Test Runner](#test-runner)
7. [Build and Production](#build-and-production)
8. [Configuration Deep Dive](#configuration-deep-dive)
9. [Troubleshooting](#troubleshooting)
10. [Conclusion](#conclusion)

## Introduction
This guide helps you set up the MathHelper development environment from scratch. You will clone the repository, install dependencies, start the Vite development server, and run both the main application and the test runner. It also explains the build process, key configuration files, and common pitfalls to avoid.

## Prerequisites
- Node.js 16+ and npm
- A modern web browser (Chrome/Edge recommended)

These prerequisites are required to run the development server, build the project, and execute tests.

**Section sources**
- [README.md](file://README.md#L16-L21)

## Installation
Follow these steps to prepare your local environment:

1. Clone the repository to your machine.
2. Open a terminal in the project root.
3. Install dependencies using npm:
   - Run: npm install

This installs all development dependencies declared in the project’s package manifest.

**Section sources**
- [README.md](file://README.md#L22-L36)
- [package.json](file://package.json#L1-L33)

## Development Workflow
The project uses Vite for fast development with hot module replacement (HMR). The typical workflow is:
- Start the dev server: npm run dev
- Open the main application in your browser.
- Iterate quickly with HMR updates.

You can also preview the production build locally before deploying:
- npm run preview

**Section sources**
- [README.md](file://README.md#L14-L21)
- [README.md](file://README.md#L145-L156)

## Application Launch
The main application entry point is the modular HTML file. Vite serves it at the configured development server address.

- Open the main app: http://localhost:8000/expression-editor-modular.html

This URL is configured as the default browser launch target in the development server configuration.

**Section sources**
- [README.md](file://README.md#L38-L41)
- [vite.config.ts](file://vite.config.ts#L9-L13)
- [expression-editor-modular.html](file://expression-editor-modular.html#L1-L10)

## Test Runner
The test runner is a browser-based UI that executes the test suite. It is served by the same Vite dev server.

- Open the test runner: http://localhost:8000/test-runner.html

The test runner auto-runs tests on page load and provides visual results, filtering, and performance metrics.

**Section sources**
- [TESTING.md](file://TESTING.md#L28-L48)
- [TESTING.md](file://TESTING.md#L30-L38)
- [test-runner.html](file://test-runner.html#L292-L322)

## Build and Production
To build the project for production:

- Build command: npm run build
- Preview production build: npm run preview

The build compiles TypeScript sources according to the TypeScript configuration and outputs artifacts to the configured output directory. The preview server serves the built assets locally.

Notes:
- The TypeScript compiler is invoked via npm scripts.
- The Vite preview server serves the production build locally for verification.

**Section sources**
- [README.md](file://README.md#L145-L156)
- [package.json](file://package.json#L6-L16)
- [tsconfig.json](file://tsconfig.json#L1-L34)
- [vite.config.ts](file://vite.config.ts#L5-L8)

## Configuration Deep Dive
This section explains the key configuration files that drive development and builds.

- Vite configuration
  - Root directory: project root
  - Output directory: dist
  - Server host: 0.0.0.0
  - Port: 8000
  - Default browser launch: expression-editor-modular.html

- TypeScript configuration
  - Target and module: ES2020
  - Strict mode enabled
  - Source maps enabled
  - Declaration files generated
  - Output directory: dist
  - Root directory: src
  - Includes: src/**
  - Excludes: node_modules, dist, tests

- Vitest configuration
  - Test environment: jsdom
  - Test files: src/test/**/*.test.ts
  - Coverage: enabled with v8 provider and multiple reporters

These configurations collectively define how the app is compiled, served, and tested.

**Section sources**
- [vite.config.ts](file://vite.config.ts#L1-L15)
- [tsconfig.json](file://tsconfig.json#L1-L34)
- [vitest.config.ts](file://vitest.config.ts#L1-L21)

## Troubleshooting
Common setup issues and fixes:

- Missing dependencies
  - Symptom: npm install fails or dev server cannot start.
  - Fix: Re-run npm install and ensure Node.js 16+ is installed.

- Port conflict (port 8000)
  - Symptom: Dev server fails to start due to port already in use.
  - Fix: Change the port in the Vite configuration or stop the conflicting service.

- TypeScript errors during build
  - Symptom: npm run build reports type errors.
  - Fix: Address reported type issues in src/**/*.ts files.

- Browser cannot load modules
  - Symptom: Errors loading TS modules in the browser.
  - Fix: Confirm Vite is running and serving from the project root. Ensure module paths match the source structure.

- Test runner not updating
  - Symptom: Changes do not trigger re-execution in the test runner.
  - Fix: Refresh the browser tab; the test runner auto-runs on load. Alternatively, restart the dev server.

**Section sources**
- [vite.config.ts](file://vite.config.ts#L9-L13)
- [README.md](file://README.md#L16-L21)
- [TESTING.md](file://TESTING.md#L28-L48)

## Conclusion
You now have the essentials to set up the MathHelper environment, launch the main application and test runner, and build for production. Use the provided configuration references to tailor the dev server and build process to your needs, and consult the troubleshooting section if you encounter issues.