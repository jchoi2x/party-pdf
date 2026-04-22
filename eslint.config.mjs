import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import importNewlines from "eslint-plugin-import-newlines";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/server/**/*.ts"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/internal-regex": "^@(cf-rendercv/|/)",
    },
    plugins: {
      import: importPlugin,
      "import-newlines": importNewlines,
    },
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          caughtErrors: "all",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      "no-console": ["warn", { allow: ["error", "warn", "info", "debug"] }],
      "no-debugger": "warn",
      "import-newlines/enforce": [
        "error",
        {
          items: 4,
          "max-len": 120,
          forceSingleLine: false,
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?:\\./|\\.\\./|@/).*\\.js$",
              message:
                "Omit the .js extension for local imports (relative paths and the @/ alias).",
            },
          ],
        },
      ],
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "object",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          warnOnUnassignedImports: false,
        },
      ],
    },
  },
  {
    files: ["src/frontend/**/*.tsx"],
    plugins: {
      import: importPlugin,
      "react-refresh": reactRefresh,
    },
    rules: {
      "import/no-default-export": "error",
      "react-refresh/only-export-components": "error",
    },
  },
  prettierRecommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    ignores: [
      "**/build.js",
      "node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.wrangler/**",
      "**/worker-configuration.d.ts",
      "**/*.config.js",
      "**/*.config.ts",
      "**/tsconfig.tsbuildinfo",
      "**/tests/**",
      "**/__tests__/**",
      "pnpm-lock.yaml",
    ],
  },
);
