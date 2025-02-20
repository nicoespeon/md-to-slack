import eslint from "@eslint/js";
import n from "eslint-plugin-n";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["lib", "node_modules", "pnpm-lock.yaml"] },
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  eslint.configs.recommended,
  n.configs["flat/recommended"],
  {
    extends: tseslint.configs.recommendedTypeChecked,
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.config.*s"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ["**/*.md/*.ts"],
    rules: {
      "n/no-missing-import": ["error", { allowModules: ["md-to-slack"] }],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
