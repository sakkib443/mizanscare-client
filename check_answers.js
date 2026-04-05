const fs = require('fs'); 
const path = require('path'); 

let log = ''; 
for(let i=1; i<=20; i++) { 
  const str = i.toString().padStart(2, '0'); 
  const p = path.join('public', 'mock', 'mock-' + str); 
  if(!fs.existsSync(p)) continue; 
  const items = fs.readdirSync(p); 
  log += 'MOCK-' + str + ':\n  ' + items.join('\n  ') + '\n\n'; 
  
  // also check inside 'ANSWER' folder if it exists
  const ansDir = path.join(p, 'ANSWER');
  if(fs.existsSync(ansDir)) {
      const ansItems = fs.readdirSync(ansDir);
      log += '  [ANSWER Dir]:\n    ' + ansItems.join('\n    ') + '\n\n';
  }
} 
fs.writeFileSync('_all_mock_files.txt', log, 'utf8');
