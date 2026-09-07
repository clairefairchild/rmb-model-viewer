import fs from 'node:fs';
import validator from 'gltf-validator';
const file=process.argv[2];
if(!file) throw new Error('Usage: node scripts/validate-glb.mjs file.glb');
const bytes=fs.readFileSync(file);
const result=await validator.validateBytes(new Uint8Array(bytes),{uri:file,maxIssues:100});
console.log(JSON.stringify({file,bytes:bytes.length,errors:result.issues.numErrors,warnings:result.issues.numWarnings,info:result.info,issues:result.issues.messages},null,2));
if(result.issues.numErrors) process.exit(1);
