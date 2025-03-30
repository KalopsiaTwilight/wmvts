export * from "./io"

export function hasFlagsActive(testVal: number, enumVals: number) {
    return (testVal & enumVals) === enumVals;
}