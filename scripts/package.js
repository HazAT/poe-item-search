import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt for version
function promptVersion() {
    return new Promise((resolve) => {
        rl.question('Enter new version number (e.g., 1.0.1): ', (version) => {
            resolve(version);
        });
    });
}

// Function to update version in JSON files
function updateVersion(version) {
    const files = ['package.json', 'manifest.json'];
    
    files.forEach(file => {
        const filePath = path.join('./', file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        content.version = version;
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
        console.log(`📝 Updated ${file} to version ${version}`);
    });
}

// Files and directories to exclude from the zip
const excludeList = [
    'node_modules',
    '.git',
    '.gitignore',
    '.claude',
    'scripts',
    'bun.lockb',
    'bun.lock',
    'package.json',
    'README.md',
    'CLAUDE.md',
    '.DS_Store',
    'src',
    'tests',
    'assets/demo.png',
    '*.zip'
];

// Main packaging function
async function packageExtension() {
    try {
        const newVersion = await promptVersion();
        updateVersion(newVersion);
        
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
            rl.close();
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
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

// Start the packaging process
packageExtension();