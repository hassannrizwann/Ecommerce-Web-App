const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'public');
fs.mkdirSync(path.join(output,'_react'),{recursive:true});
for(const [source,target] of [
  ['index.html','index.html'],
  ['node_modules/scheduler/umd/scheduler.production.min.js','_react/scheduler.production.min.js'],
  ['node_modules/react/umd/react.production.min.js','_react/react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js','_react/react-dom.production.min.js']
])fs.copyFileSync(path.join(root,source),path.join(output,target));
