declare module 'bloomfilter' {
  export class BloomFilter {
    constructor(m: number, k: number);
    add(item: any): void;
    test(item: any): boolean;
    buckets: Int32Array;
  }
}
