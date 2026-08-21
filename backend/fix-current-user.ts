import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('/Users/aditya/Desktop/ludo-arena-pro-main/backend/src/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes("@CurrentUser('userId')")) {
    content = content.replace(/@CurrentUser\('userId'\)/g, "@CurrentUser('id')");
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
