/*
 * Copied this file from ledgerhq only to solve the compilation problem caused by the incompatibility of rxjs versions.
*/

import { DisconnectedDevice, TransportError } from "@ledgerhq/errors";
import { Observable } from "rxjs";

const TagId = 0x05;

function chunkBuffer(
    buffer: Buffer,
    sizeForIndex: (arg0: number) => number
  ): Array<Buffer> {
    const chunks: Buffer[] = [];

    for (
      let i = 0, size = sizeForIndex(0);
      i < buffer.length;
      i += size, size = sizeForIndex(i)
    ) {
      chunks.push(buffer.slice(i, i + size));
    }

    return chunks;
}


export const receiveAPDU = (
    rawStream: Observable<Buffer>
  ): Observable<Buffer> =>
    Observable.create((o) => {
      let notifiedIndex = 0;
      let notifiedDataLength = 0;
      let notifiedData = Buffer.alloc(0);
      const sub = rawStream.subscribe({
        complete: () => {
          o.error(new DisconnectedDevice());
          sub.unsubscribe();
        },
        error: (e) => {
          o.error(e);
          sub.unsubscribe();
        },
        next: (value) => {
          const tag = value.readUInt8(0);
          const index = value.readUInt16BE(1);
          let data = value.slice(3);

          if (tag !== TagId) {
            o.error(
              new TransportError("Invalid tag " + tag.toString(16), "InvalidTag")
            );
            return;
          }

          if (notifiedIndex !== index) {
            o.error(
              new TransportError(
                "BLE: Invalid sequence number. discontinued chunk. Received " +
                  index +
                  " but expected " +
                  notifiedIndex,
                "InvalidSequence"
              )
            );
            return;
          }

          if (index === 0) {
            notifiedDataLength = data.readUInt16BE(0);
            data = data.slice(2);
          }

          notifiedIndex++;
          notifiedData = Buffer.concat([notifiedData, data]);

          if (notifiedData.length > notifiedDataLength) {
            o.error(
              new TransportError(
                "BLE: received too much data. discontinued chunk. Received " +
                  notifiedData.length +
                  " but expected " +
                  notifiedDataLength,
                "BLETooMuchData"
              )
            );
            return;
          }

          if (notifiedData.length === notifiedDataLength) {
            o.next(notifiedData);
            o.complete();
            sub.unsubscribe();
          }
        },
      });
      return () => {
        sub.unsubscribe();
      };
    });

export const sendAPDU = (
    write: (arg0: Buffer) => Promise<void>,
    apdu: Buffer,
    mtuSize: number
    ): Observable<Buffer> => {
    const chunks = chunkBuffer(apdu, (i) => mtuSize - (i === 0 ? 5 : 3)).map(
        (buffer, i) => {
        const head = Buffer.alloc(i === 0 ? 5 : 3);
        head.writeUInt8(TagId, 0);
        head.writeUInt16BE(i, 1);

        if (i === 0) {
            head.writeUInt16BE(apdu.length, 3);
        }

        return Buffer.concat([head, buffer]);
        }
    );
    return new Observable((o) => {
        let terminated = false;

        async function main() {
            for (const chunk of chunks) {
                if (terminated) return;
                await write(chunk);
            }
        }

        main().then(
            () => {
                terminated = true;
                o.complete();
            },
            (e) => {
                terminated = true;
                o.error(e);
            }
        );

        const unsubscribe = () => {
            if (!terminated) {
                terminated = true;
            }
        };

        return unsubscribe;
    });
};