/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    // `project: true` tells the parser to find the nearest tsconfig.json for
    // each file being linted. This is required for type-aware rules
    // (no-floating-promises, await-thenable, etc.) to work in a monorepo.
    // Without this, @typescript-eslint throws "parserServices not generated".
    project: true,
    // Resolve tsconfig relative to each linted file's directory, not cwd.
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "import", "prettier"],
  extends: [
    "eslint:recommended",
    // `recommended-type-checked` is the correct name in @typescript-eslint v6+/v7.
    // The old name `recommended-requiring-type-checking` was deprecated in v6
    // and removed in v7. This preset includes `recommended` rules and adds
    // type-aware rules that require parserOptions.project.
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
    // `plugin:prettier/recommended` already includes `eslint-config-prettier`
    // (which turns off formatting rules that conflict with Prettier) plus the
    // prettier plugin itself. No need to also extend "prettier" separately.
    "plugin:prettier/recommended",
  ],
  rules: {
    // TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    // date-fns, socket.io-client and similar libraries have internal `any` in
    // their @types packages (e.g. `formatDistance?: (...args: any[]) => any`).
    // Keeping this as a warning instead of an error lets us track real `any`
    // propagation in our own code via `no-explicit-any` without being blocked
    // by third-party typing imperfections.
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/no-import-type-side-effects": "error",

    // Import ordering
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling", "index"],
          "object",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "warn",

    // General
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prettier/prettier": "error",
  },
  settings: {
    "import/resolver": {
      // eslint-import-resolver-typescript resolves @govsphere/* path aliases
      // defined in each package's tsconfig.json paths field.
      typescript: {
        alwaysTryTypes: true,
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
      },
    },
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    ".turbo/",
    "*.config.js",
    "*.config.mjs",
    "*.config.ts",
    "*.config.cjs",
    "generated/",
  ],
};
