import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Files and directories to exclude from the zip
const excludeList = [
    'node_modules',
    '.git',
    '.gitignore',
    'scripts',
    'package-lock.json',
    'package.json',
    'README.md',
    '.DS_Store',
    'src',
    'tests',
    'vite.config.js',
    'assets/demo.png',
    '*.zip'
];

// Create a write stream for the zip file
const output = fs.createWriteStream('extension.zip');
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

// Listen for archive events
archive.pipe(output);

archive.on('error', (err) => {
    throw err;
});

output.on('close', () => {
    console.log(`📦 Extension packaged successfully! (${archive.pointer()} bytes)`);
});

// Add files to the archive, excluding items in excludeList
function addFilesToArchive(dir, baseDir = '') {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(baseDir, file);
        const stat = fs.statSync(filePath);

        // Skip excluded files and directories
        if (excludeList.some(exclude => {
            if (exclude.startsWith('*')) {
                return file.endsWith(exclude.slice(1));
            }
            return relativePath.includes(exclude);
        })) {
            return;
        }

        if (stat.isDirectory()) {
            addFilesToArchive(filePath, relativePath);
        } else {
            archive.file(filePath, { name: relativePath });
        }
    });
}

// Start packaging
console.log('📦 Packaging extension...');
addFilesToArchive('./');
archive.finalize();