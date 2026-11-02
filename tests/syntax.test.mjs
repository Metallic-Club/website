import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('every shipped JavaScript module parses before preview deployment',async()=>{
  for(const name of (await readdir(new URL('../src/',import.meta.url))).filter(name=>name.endsWith('.js'))){
    const file=new URL('../src/'+name,import.meta.url),result=spawnSync(process.execPath,['--check',fileURLToPath(file)],{encoding:'utf8'});
    assert.equal(result.status,0,`${name}: ${result.stderr}`);
  }
});
