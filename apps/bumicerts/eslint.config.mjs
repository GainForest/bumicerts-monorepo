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
    "graphql/graphql-env.d.ts",
  ]),
  {
    plugins: {
      "eslint-comments": eslintComments,
    },
    rules: {
      // Prevent suppressing the no-explicit-any rule via eslint-disable comments.
      // Agents and developers must fix `any` types properly — not silence the linter.
      "eslint-comments/no-restricted-disable": [
        "error",
        "@typescript-eslint/no-explicit-any",
      ],
    },
  },
]);

export default eslintConfig;
