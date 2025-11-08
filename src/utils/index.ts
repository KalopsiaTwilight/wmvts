export * from "./io"
export * from "./callbackManager"

export function hasFlagsActive(testVal: number, enumVals: number) {
    return (testVal & enumVals) === enumVals;
}


function onlyUnique<T>(value: T, index: number, array: Array<T>) {
    return array.indexOf(value) === index;
}
export function distinct<T>(array: Array<T>) {
    return array.filter(onlyUnique);
}