import fs from 'fs';
import { ZipArchive } from 'archiver';
import readline from 'readline';
import { spawn } from 'child_process';
import { finished } from 'node:stream/promises';

const RELEASE_DIR = 'dist-release';
const args = process.argv.slice(2);
const unknownArgs = args.filter((arg) => arg !== '--no-prompt');

if (unknownArgs.length) {
    console.error(`Unknown option: ${unknownArgs.join(', ')}\nUsage: bun run package [--no-prompt]`);
    process.exit(1);
}

const noPrompt = args.includes('--no-prompt');

// Function to prompt for version
function promptVersion(currentVersion) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(`Enter new version number (current: ${currentVersion}): `, (version) => {
            rl.close();
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
        const build = spawn(process.execPath, ['run', 'build', '--outDir', RELEASE_DIR], {
            stdio: 'inherit',
            env: { ...process.env, BUILD_MODE: 'production' }
        });
        build.on('error', reject);
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
        // 1. Reuse the current version in automation; prompt during interactive use.
        const currentVersion = getCurrentVersion();
        const newVersion = noPrompt ? currentVersion : await promptVersion(currentVersion);

        // 2. Update package.json with new version
        if (newVersion !== currentVersion) {
            updateVersion(newVersion);
        }

        // 3. Build the release separately from the installed dev extension in dist/.
        await runBuild();

        // 4. Create the zip from release contents (not the folder itself).
        const output = fs.createWriteStream('extension.zip');
        const archive = new ZipArchive({
            zlib: { level: 9 } // Maximum compression
        });

        archive.pipe(output);

        archive.on('error', (error) => output.destroy(error));

        // Add all release files to the root of the zip.
        console.log('📦 Packaging extension...');
        archive.directory(RELEASE_DIR, false);
        await Promise.all([archive.finalize(), finished(output)]);
        console.log(`📦 Extension packaged successfully! (${archive.pointer()} bytes)`);
        console.log(`📦 Version: ${newVersion}`);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Start the packaging process
packageExtension();
