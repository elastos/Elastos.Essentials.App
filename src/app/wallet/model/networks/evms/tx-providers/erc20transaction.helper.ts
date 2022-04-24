import Web3 from "web3";

export class ERC20TransactionHelper {
  public static async fetchTokenTransactions(web3: Web3, accountAddress: string, contractAddress: string, fromBlock: number, toBlock: number): Promise<unknown> {
    let erc20ABI = (await import('src/assets/wallet/ethereum/StandardErc20ABI.json')).default as any;

    console.log("contractAddress", contractAddress)

    let paddedAccountAddress = '0x' + accountAddress.substr(2).padStart(64, "0"); // 64 = 32 bytes * 2 chars per byte // 20 bytes to 32 bytes

    const contract = new web3.eth.Contract(erc20ABI, contractAddress);
    const transferEvents = await contract.getPastEvents("Transfer", {
      fromBlock,
      toBlock,
      filter: {
        isError: 0,
        txreceipt_status: 1
      },
      topics: [
        web3.utils.sha3("Transfer(address,address,uint256)"),
        null,
        paddedAccountAddress
      ]
    });

    console.log("transferEvents", transferEvents)

    const transferEvents2 = await contract.getPastEvents("Transfer", {
      fromBlock,
      toBlock,
      //filter: {
      //isError: 0,
      //txreceipt_status: 1
      //},
      topics: [
        web3.utils.sha3("Transfer(address,address,uint256)"),
        paddedAccountAddress
      ]
    });

    console.log("transferEvents2", transferEvents2)

    return transferEvents
      .sort((evOne, evTwo) => evOne.blockNumber - evTwo.blockNumber)
      .map(({ blockNumber, transactionHash, returnValues }) => {
        return {
          transactionHash,
          //confirmations: currentBlockNumber - blockNumber,
          //amount: returnValues._value * Math.pow(10, -tokenDecimals)
        };
      });
  }
}