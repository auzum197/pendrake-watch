import reactCompiler from "eslint-plugin-react-compiler";
import tseslint from "typescript-eslint";

// React-Compiler-only lint: Rules-of-React violations that would make a
// component bail out of (or misbehave under) compiler memoization. Everything
// else is oxlint's territory — don't grow this config into a second linter.
export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser: tseslint.parser },
  plugins: { "react-compiler": reactCompiler },
  rules: { "react-compiler/react-compiler": "error" },
});
