const mudder = require('mudder');
const mid = new mudder.SymbolTable('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const num = mid.mudder('Z', 'A');
const num2 = mid.mudder('T', 'M');
console.log(mid.stringToNumber(num2));