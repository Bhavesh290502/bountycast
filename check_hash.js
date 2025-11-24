
const { keccak256, toBytes } = require('viem');
const fs = require('fs');

const signatures = [
    'QuestionPosted(uint256,address,uint256,uint256,bytes)',
    'QuestionCreated(uint256,address,uint256,uint256,bytes)',
    'QuestionPosted(uint256,address,bytes,uint256,uint256)',
    'QuestionCreated(uint256,address,bytes,uint256,uint256)',
    'QuestionPosted(uint256,address,uint256,uint256,string)',
    'QuestionCreated(uint256,address,uint256,uint256,string)',
    'QuestionPosted(uint256,address,string,uint256,uint256)',
    'QuestionCreated(uint256,address,string,uint256,uint256)',
    'QuestionPosted(uint256,address,uint256,string,uint256)',
    'QuestionCreated(uint256,address,uint256,string,uint256)',
];

let output = '';
signatures.forEach(sig => {
    const hash = keccak256(toBytes(sig));
    output += `Sig: ${sig}\nHash: ${hash}\n`;
    if (hash.startsWith('0xafd6')) {
        output += 'MATCH FOUND!\n';
    }
    output += '---\n';
});

fs.writeFileSync('hash_output.txt', output);
console.log('Done');
