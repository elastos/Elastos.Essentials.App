/*
 * Copyright (c) 2020 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { Resolver } from '../model/address-resolvers/resolvers/Resolver';

@Injectable({
    providedIn: 'root'
})
/**
 * Service responsible for registering and providing name resolvers.
 * Name resolvers are able to get a text/subwallet as input and return a valid/usable
 * address suggestion for this subwallet on its attached network.
 */
export class NameResolvingService {
    public static instance: NameResolvingService = null;

    private resolvers: Resolver[] = [];

    constructor() {
        NameResolvingService.instance = this;
    }

    public registernameResolver(resolver: Resolver) {
        this.resolvers.push(resolver);
    }

    public getResolvers(): Resolver[] {
        return this.resolvers;
    }

    public reset() {
      this.resolvers = [];
    }
}
