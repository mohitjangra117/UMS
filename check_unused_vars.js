const fs = require('fs');
const path = require('path');

function checkJSFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for common unused imports
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for requires that might be unused
        if (line.startsWith('const ') && line.includes('require(')) {
            const varName = line.split('=')[0].replace('const', '').trim();
            const restOfFile = lines.slice(i + 1).join('\n');
            
            // Simple check if variable is used later
            if (!restOfFile.includes(varName) && !line.includes('app.use')) {
                issues.push(`Line ${i + 1}: Potentially unused require: ${line}`);
            }
        }
        
        // Check for unused variables
        if (line.startsWith('let ') || (line.startsWith('const ') && !line.includes('require('))) {
            const varName = line.split('=')[0].replace(/let|const/, '').trim();
            const restOfFile = lines.slice(i + 1).join('\n');
            
            if (varName && !restOfFile.includes(varName)) {
                issues.push(`Line ${i + 1}: Potentially unused variable: ${varName}`);
            }
        }
    }
    
    return issues;
}

function scanDirectory(dir, exclude = []) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        if (exclude.includes(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...scanDirectory(fullPath, exclude));
        } else if (item.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

console.log('Checking for unused imports and variables...\n');

const files = scanDirectory('.', ['node_modules', '.git', 'uploads']);

for (const file of files) {
    if (file.includes('check_remaining.js')) continue; // Skip this temp file
    
    const issues = checkJSFile(file);
    if (issues.length > 0) {
        console.log(`\n${file}:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
}

console.log('\nScan complete.');
