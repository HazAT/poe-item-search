import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import readline from 'readline';
import { spawn } from 'child_process';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt for version
function promptVersion(currentVersion) {
    return new Promise((resolve) => {
        rl.question(`Enter new version number (current: ${currentVersion}): `, (version) => {
            resolve(version || currentVersion);
        });
    });
}

// Function to get current version from package.json
function getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return packageJson.version;
}

// Function to update version in package.json
function updateVersion(version) {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    packageJson.version = version;
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`📝 Updated package.json to version ${version}`);
}

// Function to run the build
function runBuild() {
    return new Promise((resolve, reject) => {
        console.log('🔨 Building extension...');
        const build = spawn('bun', ['run', 'build'], { stdio: 'inherit' });
        build.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Build failed with code ${code}`));
            }
        });
    });
}

// Main packaging function
async function packageExtension() {
    try {
        // 1. Get current version and prompt for new one
        const currentVersion = getCurrentVersion();
        const newVersion = await promptVersion(currentVersion);

        // 2. Update package.json with new version
        if (newVersion !== currentVersion) {
            updateVersion(newVersion);
        }

        // 3. Run the build (this generates dist/ with correct version in manifest)
        await runBuild();

        // 4. Create the zip from dist/ contents (not the folder itself)
        const output = fs.createWriteStream('extension.zip');
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        archive.pipe(output);

        archive.on('error', (err) => {
            throw err;
        });

        output.on('close', () => {
            console.log(`📦 Extension packaged successfully! (${archive.pointer()} bytes)`);
            console.log(`📦 Version: ${newVersion}`);
            rl.close();
        });

        // Add all files from dist/ to the root of the zip
        console.log('📦 Packaging extension...');
        archive.directory('dist/', false);
        archive.finalize();
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

// Start the packaging process
packageExtension();
