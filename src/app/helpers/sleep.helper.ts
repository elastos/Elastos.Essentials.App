export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    })
}

/**
 * Executes the given code after a given delay.
 * This method can't be awaited, this is on purpose, to delay non mandatory actions for later. 
 */
export function runDelayed(method: () => unknown, delayMs: number) {
    setTimeout(() => {
        method();
    }, delayMs);
}