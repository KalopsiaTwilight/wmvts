export interface IPseudoRandomNumberGenerator {
    getInt(): number;
    getFloat(): number;
    getSignedFloat(): number;
    setSeed(seed: number|string): void;
}