import { cp, mkdir, readFile, realpath, rm, writeFile, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import path from 'node:path';

const { values } = parseArgs({ options: { beta: {type:'string',default:'.'}, early: {type:'string'} } });
if (!values.early) throw Error('Provide --early <early-release checkout directory>.');
const root = await realpath('.'), local = path.join(root,'.local');
const sources = { beta:await realpath(values.beta), 'early-release':await realpath(values.early) };
for (const directory of Object.values(sources)) {
  // Hosted design previews must never inherit a live account or catalog API.
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd:directory, stdio:'inherit', env:{...process.env,METALLIC_BETA_API:'',METALLIC_CATALOG_API:''},
  });
}
await mkdir(local,{recursive:true});
if (await realpath(local) !== local) throw Error('Preview output parent must not be a symlink.');
const output = path.join(local,'github-pages');
if (Object.values(sources).some(directory=>directory===output||directory.startsWith(output+path.sep))) throw Error('Preview output cannot contain a source checkout.');
const existing = await lstat(output).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
if (existing?.isSymbolicLink()) throw Error('Preview output must not be a symlink.');
// This fixed, verified generated directory is the only tree replaced by this builder.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const [name,directory] of Object.entries(sources)) await cp(path.join(directory,'dist'),path.join(output,name),{recursive:true});
await writeFile(path.join(output,'index.html'),await readFile(path.join(root,'previews','index.html')));
await writeFile(path.join(output,'.nojekyll'),'');
console.log('Built browser previews in '+output);
