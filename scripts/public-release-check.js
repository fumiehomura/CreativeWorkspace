const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const skip=new Set(['.git','node_modules']);
const forbiddenNames=/^(CreativeWorkspaceData|projects|backups|history|logs?|cache|temp|tmp)$/i;
const binaryExt=new Set(['.png','.jpg','.jpeg','.gif','.ico','.zip']);
const rules=[
  ['Windowsユーザー絶対パス',/[A-Za-z]:\\Users\\[^\\\s]+/i],
  ['秘密鍵',new RegExp('BEGIN (?:RSA |OPENSSH |EC )?'+'PRIVATE KEY')],
  ['GitHubトークン',new RegExp('(?:gh'+'p_[A-Za-z0-9]{20,}|github_'+'pat_[A-Za-z0-9_]{20,})')],
  ['一般的なAPIキー候補',/(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ['AWSアクセスキー候補',new RegExp('AK'+'IA[0-9A-Z]{16}')],
  ['メールアドレス',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['既知の非公開作品名',new RegExp('死後'+'即位')],
];
const findings=[]; const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const full=path.join(dir,ent.name),rel=path.relative(root,full);if(forbiddenNames.test(ent.name))findings.push({file:rel,type:'ユーザーデータ用の禁止名'});if(ent.isDirectory())walk(full);else files.push({full,rel});}}
walk(root);
for(const {full,rel} of files){if(binaryExt.has(path.extname(full).toLowerCase()))continue;const stat=fs.statSync(full);if(stat.size>2_000_000){findings.push({file:rel,type:'検査上限を超えるファイル'});continue;}const text=fs.readFileSync(full,'utf8');for(const [type,re] of rules)if(re.test(text))findings.push({file:rel,type});}
if(findings.length){console.error('公開監査で確認が必要な項目が見つかりました。');for(const f of findings)console.error(`- ${f.file}: ${f.type}`);process.exit(1)}
console.log(`公開前チェック OK: ${files.length}ファイル。ユーザーデータ、既知の実作品名、絶対ユーザーパス、秘密情報候補は検出されませんでした。`);
