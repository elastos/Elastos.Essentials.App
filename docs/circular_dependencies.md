# Solving typescript circular dependencies

- Enable the "import" eslint plugin with typescript configuration
- Use "import type" everywhere possible. This doesn't solve circular issues but this makes the linter show no error when these are not real issues, and makes real circular dependency problems emerge. Typescript already knows when to import only types or not.
- Do NOT "import type" for angular service, otherwise they don't get injected and become undefined at runtime.