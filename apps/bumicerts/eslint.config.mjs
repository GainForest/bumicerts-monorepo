import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintComments from "eslint-plugin-eslint-comments";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated files — lint rules do not apply.
    "graphql/indexer/env.d.ts",
  ]),
  {
    plugins: {
      "eslint-comments": eslintComments,
    },
    rules: {
      // Prevent suppressing the no-explicit-any rule via eslint-disable comments.
      // Agents and developers must fix `any` types properly — not silence the linter.
      // Note: consistent-type-assertions is NOT in this list - it can be disabled with good reason (Proxy patterns, type narrowing)
      "eslint-comments/no-restricted-disable": [
        "error",
        "@typescript-eslint/no-explicit-any",
      ],

      // Ban unsafe object literal type assertions like `{} as SomeType`.
      // This catches patterns where we trust external data without validation.
      // Use explicit variables or validation instead.
      // Legitimate uses (Proxy patterns, type narrowing) must have eslint-disable with explanation.
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
        },
      ],
    },
  },
]);

export default eslintConfig;
