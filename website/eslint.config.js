import reactCompiler from "eslint-plugin-react-compiler";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser: tseslint.parser },
  plugins: { "react-compiler": reactCompiler },
  rules: { "react-compiler/react-compiler": "error" },
});
