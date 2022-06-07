
import type Transport from "@ledgerhq/hw-transport";
import { Logger } from "src/app/logger";
import { ELAAddressHelper } from "../../ela/ela.address";

const TAG = 'ledgerAppEla'
/* Ledge Communication instruction for Elastos app
//start of the buffer, reject any transmission that doesn't start with this, as it's invalid.
CLA 0x80

// #### instructions start ####
// instruction to sign transaction and send back the signature.
INS_SIGN 0x02

// instruction to send back the public key.
INS_GET_PUBLIC_KEY 0x04

// instruction to send back the public key, and a signature of the private key signing the public key.
INS_GET_SIGNED_PUBLIC_KEY 0x08
*/

// max length in bytes.
const MAX_SIGNED_TX_LEN = 1024;

// /44'/0'/0'/0/0
const bip44PathBase =
  '8000002C' +
  '80000000' +
  '80000000' +
  '00000000' +
  '00000000';

// /44'/2305'/0'/0/0 (2305': ELA coin types for BIP-0044)
const bip44StandardPathBase =
  '8000002C' +
  '80000901' +
  '80000000' +
  '00000000' +
  '00000000';

let bip44Path = '';

/**
 * Elastos API
 *
 * @example
 * const ela = new Ela(transport)
 */

export default class Ela {
  transport: Transport;

  constructor(
    transport: Transport,
    scrambleKey = "w0w",
  ) {
    this.transport = transport;
  }

  //TODO: delete it, just for test
  showGetAddressApduMessage(path = "") {
    if (path == "") {
      bip44Path = bip44StandardPathBase;
    } else {
      bip44Path = this.encodePath(path);
    }
    Logger.warn(TAG, ' getAddress: bip44Path', bip44Path, ' path:', path)

    const message = Buffer.from('8004000000' + bip44Path, 'hex');
    Logger.warn(TAG, ' getAddress: message', message.toString('hex').toUpperCase())
  }

  /**
   * get ELA address for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @return an object with a publicKey and address
   * @example
   */
  async getAddress(path = ""): Promise<{ publicKey: string; address: string; }> {
    if (path == "") {
      bip44Path = bip44StandardPathBase;
    } else {
      bip44Path = this.encodePath(path);
    }

    Logger.log(TAG, ' getAddress: bip44Path', bip44Path)

    // eslint-disable-next-line no-useless-catch
    // try {
      const messageSend = Buffer.from('8004000000' + bip44Path, 'hex');
      Logger.log(TAG, ' getAddress: messageSend', messageSend.toString('hex').toUpperCase())
      let response = await this.transport.exchange(messageSend);
      const responseStr = response.toString('hex').toUpperCase();
      Logger.log(TAG, ' getAddress: response', responseStr)

      let success = false;
      let message = '';
      let publicKey = '';

      if (responseStr.endsWith('9000')) {
        success = true;
        message = responseStr;
        publicKey = responseStr.substring(0, 130);
        Logger.log(TAG, ' getAddress: publicKey', publicKey)
      } else {
        // 6E00, 6E01
        if (responseStr.startsWith('6E')) {
          message = 'App Not Open On Ledger Device';
        } else {
          message = 'Unknown Error ';
        }

        Logger.warn(TAG, ' getAddress: error message', message)
        throw new Error(message);
      }

      let address = await ELAAddressHelper.getAddressFromPublicKey(publicKey);
      return Promise.resolve({
        publicKey: publicKey,
        address: address,
      });
    // } catch (error) {
    //   Logger.error(TAG, ' getAddress: error', error)
    //   // TODO
    //   throw error;
    // }
  }

  // eslint-disable-next-line require-await
  async signTransaction(transactionHex: string, bipPath: string) {
    const transactionByteLength = Math.ceil(transactionHex.length / 2);
    if (transactionByteLength > MAX_SIGNED_TX_LEN) {
      throw new Error(`Transaction length of ${transactionByteLength} bytes exceeds max length of ${MAX_SIGNED_TX_LEN} bytes.`);
    } else {
      Logger.log(TAG, `transaction length of ${transactionByteLength} bytes is under ${MAX_SIGNED_TX_LEN} bytes. Sending ...`);
    }

    const ledgerMessage = transactionHex + this.encodePath(bipPath);
    const messages = this.splitMessageIntoChunks(ledgerMessage);

    try {
      let lastResponse = undefined;
      for (let ix = 0; ix < messages.length; ix++) {
        const message = Buffer.from(messages[ix], 'hex');
        Logger.log(TAG, `STARTED sending message ${ix + 1} of ${messages.length}: ${message.toString('hex').toUpperCase()}`);
        const response = await this.transport.exchange(message);
        const responseStr = response.toString('hex').toUpperCase();
        Logger.log(TAG, `SUCCESS sending message ${ix + 1} of ${messages.length}: ${responseStr}`);

        lastResponse = responseStr;
      }

      let signature = undefined;
      let success = false;
      let message = lastResponse;
      if (lastResponse !== undefined) {
        if (lastResponse.endsWith('9000')) {
          signature = this.decodeSignature(lastResponse);
          success = true;
        } else {
          if (lastResponse == '6985') {
            message += ' Tx Denied on Ledger';
          }
          if (lastResponse == '6D08') {
            message += ' Tx Too Large for Ledger';
          }
        }
      }
      Logger.log(TAG, 'signature:', signature);
      return Promise.resolve({
        success: success,
        message: message,
        signature: signature,
      });
    } catch (error) {
      Logger.error(TAG, ' getAddress: error', error)
      // TODO
      throw error;
    }
  }

  private splitMessageIntoChunks(ledgerMessage) {
    const messages = [];
    const bufferSize = 255 * 2;
    let offset = 0;
    while (offset < ledgerMessage.length) {
      let chunk;
      let p1;
      if ((ledgerMessage.length - offset) > bufferSize) {
        chunk = ledgerMessage.substring(offset, offset + bufferSize);
      } else {
        chunk = ledgerMessage.substring(offset);
      }
      if ((offset + chunk.length) == ledgerMessage.length) {
        p1 = '80';
      } else {
        p1 = '00';
      }

      const chunkLength = chunk.length / 2;

      let chunkLengthHex = chunkLength.toString(16);
      while (chunkLengthHex.length < 2) {
        chunkLengthHex = '0' + chunkLengthHex;
      }

      messages.push('8002' + p1 + '00' + chunkLengthHex + chunk);
      offset += chunk.length;
    }

    return messages;
  }

  private decodeSignature(response) {
    /**
     * https://stackoverflow.com/questions/25829939/specification-defining-ecdsa-signature-data
     * <br>
     * the signature is TLV encoded.
     * the first byte is 30, the "signature" type<br>
     * the second byte is the length (always 44)<br>
     * the third byte is 02, the "number: type<br>
     * the fourth byte is the length of R (always 20)<br>
     * the byte after the encoded number is 02, the "number: type<br>
     * the byte after is the length of S (always 20)<br>
     * <p>
     * eg:
     * 304402200262675396fbcc768bf505c9dc05728fd98fd977810c547d1a10c7dd58d18802022069c9c4a38ee95b4f394e31a3dd6a63054f8265ff9fd2baf68a9c4c3aa8c5d47e9000
     * is
     * 30LL0220RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR0220SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
     */

    const rLenHex = response.substring(6, 8);
    const rLen = parseInt(rLenHex, 16) * 2;
    let rStart = 8;
    const rEnd = rStart + rLen;

    while ((response.substring(rStart, rStart + 2) == '00') && ((rEnd - rStart) > 64)) {
      rStart += 2;
    }

    const r = response.substring(rStart, rEnd);
    const sLenHex = response.substring(rEnd + 2, rEnd + 4);
    const sLen = parseInt(sLenHex, 16) * 2;
    let sStart = rEnd + 4;
    const sEnd = sStart + sLen;

    while ((response.substring(sStart, sStart + 2) == '00') && ((sEnd - sStart) > 64)) {
      sStart += 2;
    }

    const s = response.substring(sStart, sEnd);

    const msgHashStart = sEnd + 4;
    const msgHashEnd = msgHashStart + 64;
    const msgHash = response.substring(msgHashStart, msgHashEnd);

    const SignerLength = 32;
    const SignatureLength = 64;

    let signatureHex = r;
    while (signatureHex.length < SignerLength) {
      signatureHex = '0' + signatureHex;
    }

    signatureHex += s;

    while (signatureHex.length < SignatureLength) {
      signatureHex = '0' + signatureHex;
    }

    return signatureHex;
  }

  public encodePath(path: string): string {
    const result: number[] = [];
    const components = path.split("/");
    components.forEach((element) => {
      let number = parseInt(element, 10);
      if (isNaN(number)) {
        return; // FIXME shouldn't it throws instead?
      }
      if (element.length > 1 && element[element.length - 1] === "'") {
        number += 0x80000000;
      }
      result.push(number);
    });
    const buffer = Buffer.alloc(result.length * 4);
    result.forEach((element, index) => {
      buffer.writeUInt32BE(element, 4 * index);
    });
    return buffer.toString('hex');
  }
}
