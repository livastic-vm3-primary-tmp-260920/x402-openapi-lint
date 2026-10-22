import test from 'node:test';
import assert from 'node:assert/strict';
import {
 uintFromWord,boolFromWord,addressFromWord,addressFromStorage,
 encodeIndex,decimalUnits,quoteMint,diagnostics,publicJson
} from '../tapeout/core.mjs';
const word=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
test('parses uint and booleans',()=>{
 assert.equal(uintFromWord(word(42)),42n);
 assert.equal(boolFromWord(word(1)),true);
 assert.equal(boolFromWord(word(0)),false);
 assert.throws(()=>boolFromWord(word(2)));
});
test('rejects malformed ABI words',()=>{
 for(const s of ['0x','0x123','ab'.repeat(32),'0xzz'+'0'.repeat(62)])
  assert.throws(()=>uintFromWord(s));
});
test('canonical ABI address',()=>{
 const addr='1234567890abcdef1234567890abcdef12345678';
 assert.equal(addressFromWord('0x'+'0'.repeat(24)+addr),'0x'+addr);
 assert.throws(()=>addressFromWord('0x'+'1'.repeat(24)+addr));
 assert.equal(addressFromStorage(word(1)),'0x'+'0'.repeat(39)+'1');
});
test('encodes unsigned indices safely',()=>{
 assert.equal(encodeIndex(1),'0'.repeat(63)+'1');
 assert.throws(()=>encodeIndex(-1));
 assert.throws(()=>encodeIndex(2n**256n));
});
test('formats token base units exactly',()=>{
 assert.equal(decimalUnits(1300000000000000n),'0.0013');
 assert.equal(decimalUnits(0n),'0');
 assert.equal(decimalUnits(1234000000000000000n),'1.234');
 assert.equal(decimalUnits(7n),'0');
});
test('cost quote includes flat protocol fee and no imaginary gas',()=>{
 const x=quoteMint(100,10000000000000n,660000000000000n);
 assert.equal(x.transistorCost,1000000000000000n);
 assert.equal(x.msgValue,1660000000000000n);
 assert.throws(()=>quoteMint(0,1,2));
});
test('diagnostics flag upgradeability and unknowns',()=>{
 const d=diagnostics({chainId:196,factory:{isSealed:false,implementation:'0x123'},
    market:{isSealed:false,feeBps:500,implementation:'0xabc'},partial:true});
 assert.ok(d.find(x=>x.level==='warning'&&x.note.includes('Factory')));
 assert.ok(d.find(x=>x.level==='warning'&&x.note.includes('fee')));
 assert.ok(d.find(x=>x.level==='unknown'));
});
test('json serializes bigint',()=>{
 assert.equal(JSON.parse(publicJson({a:1n})).a,'1');
});
