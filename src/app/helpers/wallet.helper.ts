/**
 * Converts 0xABCDEFG into 0xAB...FG or ABCDEFG into AB...FG
 */
export const reducedWalletAddress = (address: string): string => {
  if (!address)
    return null;

  if (address.length < 12) // Should not happen
    return address;

  let hasPrefix = false;
  let workedAddress = address;
  if (address.startsWith("0x")) {
    hasPrefix = true;
    workedAddress = workedAddress.replace("0x", "");
  }

  return `${hasPrefix ? '0x' : ''}${workedAddress.substr(0, 5)}...${workedAddress.substr(workedAddress.length - 5, 5)}`;
}