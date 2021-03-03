BPI 20210302:

This whole folder is initially cloned from the Trinity DApp SDK NPM library.
We need to clone it because:
- We can't use the "trinity" dapp sdk any more.
- We need to add a concept of "DID isolation" as this is not done by trinity any more.
- We would like to make this helper library available to third party ionic applications later, but for now
while we are merging everything into essentials, there are already too many topics at the same time. So as a temporary
way of solving the problem, we just import everything in the project, and we'll extract it later.

- The Trinity Web3 provider should be part of the future cordova connectivity SDK.
- The did helper is a generic elastos cordova helpers as it relies on cordova-did but not on trinity.
- The hive helper may be in the cordova connectivity SDK as it relies on essentials to get the auth credential. Though,
The credential generation part could be agnostic to essentials or another provider and be implemented using an external interface.

    -> hive did and backup restore helpers inside elastos cordova helpers sdk
        -> with an interface layer to store things on disk (with a default interface built-in, can be overriden)
        -> with an interface layer implemented by all apps for hive auth, with a one liner to call essentials cordova connectivity SDK to start with
    -> web3 provider only inside essentials connectivity SDK for now.
        -> As a first step, it remains in the essentials app source code.