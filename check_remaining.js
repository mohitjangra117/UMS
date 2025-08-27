const fs = require('fs');
const path = require('path');

function checkEmptyLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i].trim() === '' && lines[i + 1].trim() === '' && lines[i + 2].trim() === '') {
            let consecutiveEmpty = 3;
            let j = i + 3;
            while (j < lines.length && lines[j].trim() === '') {
                consecutiveEmpty++;
                j++;
            }
            if (consecutiveEmpty >= 3) {
                issues.push(`Lines ${i + 1}-${i + consecutiveEmpty}: ${consecutiveEmpty} consecutive empty lines`);
                i = j - 1; // Skip to avoid duplicate reporting
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
        } else if (item.endsWith('.js') || item.endsWith('.ejs')) {
            files.push(fullPath);
        }
    }
    return files;
}

console.log('Checking for remaining cleanup needed...\n');

const files = scanDirectory('.', ['node_modules', '.git', 'uploads']);

for (const file of files) {
    const issues = checkEmptyLines(file);
    if (issues.length > 0) {
        console.log(`\n${file}:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
}

console.log('\nScan complete.');
