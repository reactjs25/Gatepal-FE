const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

const srcDir = path.join(__dirname, '..', 'src');

function getAllFiles(dir, extensions, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, extensions, files);
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function removeComments(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Strip comments but preserve important ones like eslint-disable
    const stripped = strip(content, { 
      preserveNewlines: true,
      language: 'javascript'
    });
    
    // Clean up multiple consecutive empty lines (more than 2)
    const cleaned = stripped.replace(/\n{3,}/g, '\n\n');
    
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`Processed: ${path.relative(srcDir, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('Removing comments from TypeScript/TSX files in src/...\n');

const files = getAllFiles(srcDir, ['.ts', '.tsx']);
let processedCount = 0;

for (const file of files) {
  if (removeComments(file)) {
    processedCount++;
  }
}

console.log(`\nDone! Processed ${processedCount} of ${files.length} files.`);
