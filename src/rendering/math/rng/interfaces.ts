export interface IPseudoRandomNumberGenerator {
    getInt(): number;
    getFloat(): number;
    getSignedFloat(): number;
}