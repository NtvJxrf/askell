import fs from 'fs';
import path from 'path';

function printTree(dir, prefix = '', maxDepth = 10, depth = 0) {
  if (depth > maxDepth) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules') continue; // пропускаем node_modules

    const fullPath = path.join(dir, file);
    const isDir = fs.statSync(fullPath).isDirectory();

    if (isDir) {
      console.log(prefix + '📁 ' + file);
      printTree(fullPath, prefix + '  ', maxDepth, depth + 1);
    } else if (file.endsWith('.js')) {
      console.log(prefix + '📄 ' + file);
    }
  }
}

// Указываешь корень проекта или папку с сервисом
printTree('../', '', 10);
