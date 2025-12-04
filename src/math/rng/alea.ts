import { IPseudoRandomNumberGenerator } from "./interfaces";

// Based on an algorithm by Johannes Baagøe, original work is licensed under MIT license:

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated docuthisntation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, thisrge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF thisRCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEthisNT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


export class AleaPrngGenerator implements IPseudoRandomNumberGenerator {
    n: number
    c: number;
    s0: number;
    s1: number;
    s2: number;
    
    constructor(seed: string|number) {
        this.setSeed(seed);
    }

    setSeed(seed: string|number) {
        this.n = 0xefc8249d;
        this.c = 1;
        this.s0 = this.mash(' ');
        this.s1 = this.mash(' ');
        this.s2 = this.mash(' ');

        this.s0 -= this.mash(seed);
        if (this.s0 < 0) {
            this.s0 += 1;
        }
        this.s1 -= this.mash(seed);
        if (this.s1 < 0) {
            this.s1 += 1;
        }
        this.s2 -= this.mash(seed);
        if (this.s2 < 0) {
            this.s2 += 1;
        }
    }

    private mash(data: number|string) {
        data = String(data);
        for (var i = 0; i < data.length; i++) {
            this.n += data.charCodeAt(i);
            var h = 0.02519603282416938 * this.n;
            this.n = h >>> 0;
            h -= this.n;
            h *= this.n;
            this.n = h >>> 0;
            h -= this.n;
            this.n += h * 0x100000000; // 2^32
        }
        return (this.n >>> 0) * 2.3283064365386963e-10; // 2^-32
    }

    getInt() {
        return this.next() * 0x100000000 | 0; 
    }

    getFloat() {
        return this.next();
    }

    getSignedFloat() {
        const val = this.next();
        const signed = (this.c & 1) ? val : -val;
        return signed;
    }

    private next() {
        const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10; // 2^-32
        this.s0 = this.s1;
        this.s1 = this.s2;
        return this.s2 = t - (this.c = t | 0);
    }
}