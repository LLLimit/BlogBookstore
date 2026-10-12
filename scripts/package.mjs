import { readFile, readdir, stat, mkdir, writeFile, realpath } from 'node:fs/promises';
import { dirname, basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const name = 'BlogBookstore';
const plugin = await readFile(join(root, 'Plugin.php'), 'utf8');
const action = await readFile(join(root, 'Action.php'), 'utf8');
if (basename(await realpath(root)) !== name || !/@package\s+BlogBookstore\b/.test(plugin)
    || !plugin.includes('namespace TypechoPlugin\\BlogBookstore;')
    || !action.includes('namespace TypechoPlugin\\BlogBookstore;')) {
  throw new Error('项目目录、@package 和 PHP 命名空间必须全部为 BlogBookstore。');
}
if (!/@author\s+LLLimit\b/.test(plugin) || !/@link\s+https:\/\/github\.com\/LLLimit\b/.test(plugin)) {
  throw new Error('插件署名必须为 LLLimit，链接必须指向其 GitHub 主页。');
}
const version = plugin.match(/@version\s+([\d.]+)/)?.[1];
if (!version) throw new Error('Plugin.php 缺少版本号。');
await stat(join(root, 'dist', 'index.html')).catch(() => { throw new Error('请先运行 pnpm build。'); });
const files = ['Plugin.php', 'Action.php', 'README.md', 'CHANGELOG.md'];
async function collect(directory, target = files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.bookstore','.local','.git','node_modules','test-results'].includes(entry.name) || entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`发布包不接受符号链接：${path}`);
    if (entry.isDirectory()) await collect(path, target);
    else if (entry.isFile()) target.push(relative(root, path).split(sep).join('/'));
  }
}
await collect(join(root, 'dist'));
await collect(join(root, 'docs'));
for (const notice of ['LICENSE','THIRD_PARTY_NOTICES.md']) { try { await stat(join(root, notice)); files.push(notice); } catch {} }
files.sort();

// Write a standard ZIP with Node's built-in deflate; no system zip command is required.
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
async function writeZip(entries, destination, rootName = name) {
const chunks = [];
const records = [];
let offset = 0;
for (const entry of entries) {
  const data = await readFile(join(root, entry.source));
  const compressed = deflateRawSync(data, { level: 9 });
  const filename = Buffer.from(`${rootName}/${entry.path}`, 'utf8');
  const checksum = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(0x21, 12); // deterministic ZIP timestamp: 1980-01-01
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);
  chunks.push(local, filename, compressed);
  records.push(central, filename);
  offset += local.length + filename.length + compressed.length;
}
const directory = Buffer.concat(records);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
await mkdir(join(root, 'releases'), { recursive: true });
const zip = Buffer.concat([...chunks, directory, end]);
await writeFile(destination, zip);
console.log(`已生成 ${destination}\n${entries.length} 个文件，${(zip.length / 1024 / 1024).toFixed(2)} MB；顶层目录：${rootName}/。`);
}
const pluginFiles=files.filter(file=>!file.startsWith('dist/api/')&&!file.startsWith('dist/admin/'));
await writeZip(pluginFiles.map(file=>({source:file,path:file})),join(root,'releases',`${name}-${version}.zip`));
const standalone=files.filter(file=>file.startsWith('dist/')).map(file=>({source:file,path:file.slice(5)}));
standalone.push({source:'README.md',path:'README.md'});
standalone.push({source:'CHANGELOG.md',path:'CHANGELOG.md'});
standalone.push(...files.filter(file=>file.startsWith('docs/')).map(file=>({source:file,path:file})));
for(const notice of ['LICENSE','THIRD_PARTY_NOTICES.md'])if(files.includes(notice))standalone.push({source:notice,path:notice});
await writeZip(standalone,join(root,'releases',`${name}-standalone-${version}.zip`));
const sourceFiles=['.gitignore','.env.example','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','vite.config.js','index.html','Plugin.php','Action.php','README.md','CHANGELOG.md','启动书店.cmd'];
for(const dir of ['src','public','scripts','docs','integrations'])await collect(join(root,dir),sourceFiles);
for(const notice of ['LICENSE','THIRD_PARTY_NOTICES.md'])if(files.includes(notice))sourceFiles.push(notice);
sourceFiles.sort();
await writeZip(sourceFiles.map(file=>({source:file,path:file})),join(root,'releases',`${name}-source-${version}.zip`));

const bridgeName='BookstoreGallery',bridgeDirectory=join(root,'integrations',bridgeName);
const bridgePlugin=await readFile(join(bridgeDirectory,'Plugin.php'),'utf8');
const bridgeAction=await readFile(join(bridgeDirectory,'Action.php'),'utf8');
if(basename(await realpath(bridgeDirectory))!==bridgeName || !/@package\s+BookstoreGallery\b/.test(bridgePlugin)
  || !bridgePlugin.includes('namespace TypechoPlugin\\BookstoreGallery;') || !bridgeAction.includes('namespace TypechoPlugin\\BookstoreGallery;')
  || !/@author\s+LLLimit\b/.test(bridgePlugin) || !/@link\s+https:\/\/github\.com\/LLLimit\b/.test(bridgePlugin))throw new Error('相册桥接插件名称或署名不一致。');
const bridgeVersion=bridgePlugin.match(/@version\s+([\d.]+)/)?.[1];
if(!bridgeVersion)throw new Error('相册桥接插件缺少版本号。');
const bridgeFiles=[];await collect(bridgeDirectory,bridgeFiles);
await writeZip(bridgeFiles.map(file=>({source:file,path:file.slice(('integrations/'+bridgeName+'/').length)})),join(root,'releases',`${bridgeName}-${bridgeVersion}.zip`),bridgeName);
