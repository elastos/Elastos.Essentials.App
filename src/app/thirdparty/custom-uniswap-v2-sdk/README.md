
### Forked from git@github.com:gndplayground/uniswap-v2-sdk.git

We only change the import path to make the compilation successful.

`import { Trade } from 'entities'`

To

`import { Trade } from './entities'`

and also add some dependencies to package.json