module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: "./tsconfig.json"
    },
    plugins: [
      '@typescript-eslint'
    ],
    extends: [
      'eslint:recommended',
      'plugin:node/recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        // Generic JS
        "space-before-function-paren": "off",
        "no-tabs": "off",
        "indent": "off",
        "quotes": "off",
        "semi": "off",
        "spaced-comment": "off",
        "brace-style": "off",
        "lines-between-class-members": "off", // Jump lines between class properties - useless
        "node/no-deprecated-api": "warn",
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

        // Node
        "node/no-unsupported-features/es-syntax": "off",
        "node/no-missing-import": "off",

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
        "@typescript-eslint/no-empty-interface": "off"
    }
};