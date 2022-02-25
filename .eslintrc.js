module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: __dirname + "/tsconfig.json"
  },
  plugins: [
    '@typescript-eslint',
    'no-async-foreach',
    'import'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended'
  ],
  rules: {
    // Generic JS
    "space-before-function-paren": "off",
    "no-tabs": "off",
    "no-case-declarations": "off",
    "indent": "off",
    "quotes": "off",
    "semi": "off",
    "spaced-comment": "off",
    "brace-style": "off",
    "lines-between-class-members": "off", // Jump lines between class properties - useless
    "eol-last": "off",
    "curly": "off",
    "prefer-const": "off",
    "no-var": "off",
    "no-empty": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-constant-condition": "warn",
    "no-class-assign": "warn",
    "require-await": "error",
    "no-async-promise-executor": "error",
    "no-promise-executor-return": "error",
    "no-non-null-assertion": "off",
    "no-async-foreach/no-async-foreach": "error",

    // TS specific
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-inferrable-types": "warn",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-extra-semi": "warn",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-interface": "off",

    // Import plugin
    "import/no-unresolved": "off",
    "import/no-cycle": ["off", { maxDepth: 5 }]
  }
};