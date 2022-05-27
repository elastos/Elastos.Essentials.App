# Reduce the initial bundle size

- Use lazy **angular routes** (imported modules) and use **one module per screen**, in order to load dependencies only when screens are used.
- Use dynamic imports (in methods) such as ```const MyClass= (await import("...")).MyClass``` instead of root imports. This lets webpack split large bundels into smaller ones.