import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/className="material-symbols-outlined"/g, 'className="material-symbols-outlined notranslate"');
  content = content.replace(/className={`material-symbols-outlined /g, 'className={`material-symbols-outlined notranslate ');
  content = content.replace(/className="material-symbols-outlined /g, 'className="material-symbols-outlined notranslate ');
  fs.writeFileSync(file, content);
});
console.log('Done!');
