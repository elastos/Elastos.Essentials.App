import BigNumber from "bignumber.js";

const zero = new BigNumber(0);
const one = new BigNumber(1);
const n256 = new BigNumber(256);

export class ByteBuffer {
    private buffer: Uint8Array;
    private position: number;

    private constructor() {
        this.buffer = new Uint8Array(0);
        this.position = 0;
    }

    /* public static wrap(buffer: Buffer): ByteBuffer {
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < buffer.length; ++i) {
            bytes[i] = buffer[i];

        }
        return new ByteBuffer(bytes);
    } */

    public hasRemaining(): boolean {
        return this.size() > this.position;
    }

    /**
     * Actual bytes written
     */
    public size() {
        return this.buffer.length;
    }

    /**
     * Increases the available space available for writing more bytes to the buffer.
     */
    public reallocate() {
        const new_array = new Uint8Array(this.size() + 50);
        new_array.set(this.buffer);
        this.buffer = new_array;
    }

    /**
     * Reduces the buffer size to the real number of written bytes.
     */
    public shrink() {
        this.buffer = this.buffer.subarray(0, this.position);
        return this.buffer;
    }

    public writeUInt8(b: number) {
        if (b > 0xFF) {
            throw b + " is over byte value";
        }

        if (this.buffer.length < this.position + 1) {
            this.reallocate();
        }
        this.buffer[this.position++] = b;
    }

    public readUInt8(index: number = null): number {
        if (index == null) {
            index = this.position;
            this.position += 1;
        }
        if (this.buffer.length < index + 1) {
            return 0;
        }
        return this.buffer[index];
    }

    public writeUInt16(num: number) {
        if (num > 0xFFFF) {
            throw num + " is over short value";
        }
        const lower = (0x00FF & num);
        const upper = (0xFF00 & num) >> 8;
        this.writeUInt8(lower);
        this.writeUInt8(upper);
    }

    public readUInt16(index: number = null): number {
        if (index == null) {
            index = this.position;
            this.position += 2;
        }
        if (this.buffer.length < index + 2) {
            return 0;
        }
        const lower = this.buffer[index];
        const upper = this.buffer[index + 1];
        return (upper << 8) + lower;
    }

    // Write integer to buffer by little endian
    public writeUInt32(num: number) {
        if (num > 0xFFFFFFFF) {
            throw num + " is over uint32 value";
        }

        const b0 = (0x000000FF & num);
        const b1 = (0x0000FF00 & num) >> 8;
        const b2 = (0x00FF0000 & num) >> 16;
        const b3 = (0xFF000000 & num) >> 24;
        this.writeUInt8(b0);
        this.writeUInt8(b1);
        this.writeUInt8(b2);
        this.writeUInt8(b3);
    }

    public readUInt32(index: number = null): number {
        if (index > (this.size() + 4)) {
            throw new Error("OutOfBoundException");
        }
        if (index == null) {
            index = this.position;
            this.position += 4;
        }
        if (this.buffer.length < index + 4) {
            return 0;
        }
        const b0 = this.buffer[index];
        const b1 = this.buffer[index + 1];
        const b2 = this.buffer[index + 2];
        const b3 = this.buffer[index + 3];
        return (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
    }

    // https://stackoverflow.com/questions/48521840/biginteger-to-a-uint8array-of-bytes
    public writeBNAsUInt256(bn: BigNumber) {
        //let result = new Uint8Array(32);
        let i = 0;
        while (i < 32) { // 32 bytes to write
            this.writeUInt8(bn.mod(n256).toNumber());
            bn = bn.dividedBy(n256);
            i += 1;
        }
    }

    public readUInt256AsBN(): BigNumber | null {
        let result = zero;
        let base = one;

        let index = this.position;
        for (let i = 0; i < 32; i++) {
            let byte = this.buffer[index];
            result = result.plus(base.multipliedBy(byte));
            base = base.multipliedBy(n256);
        }
        return result;
    }
}