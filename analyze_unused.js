const fs = require('fs');
const path = require('path');

// Track what's being used across the application
const usageTracker = {
    imports: new Set(),
    functions: new Set(),
    variables: new Set(),
    routes: new Set(),
    views: new Set(),
    models: new Set()
};

// File extensions to analyze
const jsExtensions = ['.js'];
const viewExtensions = ['.ejs'];

// Recursive directory walker
function walkDirectory(dir, callback) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
            walkDirectory(filePath, callback);
        } else {
            callback(filePath);
        }
    });
}

// Analyze JavaScript files
function analyzeJSFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const issues = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Check for empty lines (more than 2 consecutive)
        if (trimmedLine === '') {
            issues.push({
                line: index + 1,
                type: 'empty_line',
                content: line
            });
        }
        
        // Check for unused variables (basic detection)
        if (trimmedLine.startsWith('const ') || trimmedLine.startsWith('let ') || trimmedLine.startsWith('var ')) {
            const varMatch = trimmedLine.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (varMatch) {
                const varName = varMatch[1];
                // Check if variable is used elsewhere in the file
                const usageCount = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
                if (usageCount === 1) {
                    issues.push({
                        line: index + 1,
                        type: 'unused_variable',
                        content: trimmedLine,
                        variable: varName
                    });
                }
            }
        }
        
        // Check for unused imports
        if (trimmedLine.startsWith('const ') && trimmedLine.includes('require(')) {
            const importMatch = trimmedLine.match(/const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*require\(/);
            if (importMatch) {
                const importName = importMatch[1];
                const usageCount = (content.match(new RegExp(`\\b${importName}\\b`, 'g')) || []).length;
                if (usageCount === 1) {
                    issues.push({
                        line: index + 1,
                        type: 'unused_import',
                        content: trimmedLine,
                        import: importName
                    });
                }
            }
        }
    });
    
    return issues;
}

// Analyze EJS files
function analyzeEJSFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const issues = [];
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Check for empty lines
        if (trimmedLine === '') {
            issues.push({
                line: index + 1,
                type: 'empty_line',
                content: line
            });
        }
        
        // Check for unused includes or partials
        if (trimmedLine.includes('include(') && !trimmedLine.includes('<%')) {
            issues.push({
                line: index + 1,
                type: 'potential_unused_include',
                content: trimmedLine
            });
        }
    });
    
    return issues;
}

// Main analysis function
function analyzeProject() {
    console.log('🔍 Analyzing project for unused code...\n');
    
    const allIssues = {};
    
    walkDirectory('.', (filePath) => {
        const ext = path.extname(filePath);
        const relativePath = path.relative('.', filePath);
        
        if (jsExtensions.includes(ext)) {
            const issues = analyzeJSFile(filePath);
            if (issues.length > 0) {
                allIssues[relativePath] = issues;
            }
        } else if (viewExtensions.includes(ext)) {
            const issues = analyzeEJSFile(filePath);
            if (issues.length > 0) {
                allIssues[relativePath] = issues;
            }
        }
    });
    
    // Report findings
    if (Object.keys(allIssues).length === 0) {
        console.log('✅ No obvious unused code found!');
        return;
    }
    
    console.log('📋 Found potential issues:\n');
    
    Object.entries(allIssues).forEach(([filePath, issues]) => {
        console.log(`📁 ${filePath}:`);
        
        issues.forEach(issue => {
            switch (issue.type) {
                case 'unused_variable':
                    console.log(`  ❌ Line ${issue.line}: Unused variable '${issue.variable}'`);
                    break;
                case 'unused_import':
                    console.log(`  ❌ Line ${issue.line}: Unused import '${issue.import}'`);
                    break;
                case 'empty_line':
                    // Group consecutive empty lines
                    break;
                case 'potential_unused_include':
                    console.log(`  ⚠️  Line ${issue.line}: Check if include is needed`);
                    break;
            }
        });
        
        // Count consecutive empty lines
        let emptyLineGroups = [];
        let currentGroup = [];
        
        issues.filter(i => i.type === 'empty_line').forEach(issue => {
            if (currentGroup.length === 0 || issue.line === currentGroup[currentGroup.length - 1].line + 1) {
                currentGroup.push(issue);
            } else {
                if (currentGroup.length > 2) {
                    emptyLineGroups.push(currentGroup);
                }
                currentGroup = [issue];
            }
        });
        
        if (currentGroup.length > 2) {
            emptyLineGroups.push(currentGroup);
        }
        
        emptyLineGroups.forEach(group => {
            console.log(`  📝 Lines ${group[0].line}-${group[group.length - 1].line}: ${group.length} consecutive empty lines (consider reducing)`);
        });
        
        console.log('');
    });
}

// Run the analysis
analyzeProject();
