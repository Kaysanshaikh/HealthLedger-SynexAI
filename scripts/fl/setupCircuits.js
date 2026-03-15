const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');
const snarkjs = require('snarkjs');

const CIRCUIT_DIR = path.join(__dirname, '..', '..', 'circuits');
const CIRCOM_SRC = path.join(CIRCUIT_DIR, 'ModelTraining.circom');
const PTAU_PATH = path.join(CIRCUIT_DIR, 'powersOfTau28_hez_final_12.ptau');

const CIRCOM_VERSION = 'v2.1.8';

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            console.log(`✅ File already exists: ${path.basename(dest)}`);
            return resolve();
        }

        console.log(`⬇️  Downloading ${path.basename(dest)}... from ${url}`);
        const file = fs.createWriteStream(dest);

        // Handle redirects
        const request = (currentUrl) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            };
            https.get(currentUrl, options, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    return request(response.headers.location);
                }
                
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get '${currentUrl}' (${response.statusCode})`));
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => reject(err));
            });
        };

        request(url);
    });
}

async function getCircomBinary() {
    const platform = os.platform();
    const arch = os.arch();
    
    let binaryName = 'circom';
    let downloadUrl = '';

    if (platform === 'win32') {
        binaryName = 'circom.exe';
        downloadUrl = `https://github.com/iden3/circom/releases/download/${CIRCOM_VERSION}/circom-windows-amd64.exe`;
    } else if (platform === 'darwin') {
        if (arch === 'arm64') {
            downloadUrl = `https://github.com/iden3/circom/releases/download/${CIRCOM_VERSION}/circom-macos-arm64`;
        } else {
            downloadUrl = `https://github.com/iden3/circom/releases/download/${CIRCOM_VERSION}/circom-macos-amd64`;
        }
    } else { // Linux
        downloadUrl = `https://github.com/iden3/circom/releases/download/${CIRCOM_VERSION}/circom-linux-amd64`;
    }

    const binaryPath = path.join(CIRCUIT_DIR, binaryName);

    if (!fs.existsSync(binaryPath)) {
        await downloadFile(downloadUrl, binaryPath);
        if (platform !== 'win32') {
            fs.chmodSync(binaryPath, 0o755); // Make executable on Unix
        }
    } else {
        console.log(`✅ Circom binary already exists.`);
    }

    return binaryPath;
}

async function setupCircuits() {
    console.log("🚀 Starting Production ZK Circuit Setup...");

    if (!fs.existsSync(CIRCUIT_DIR)) {
        fs.mkdirSync(CIRCUIT_DIR, { recursive: true });
    }

    try {
        // 1. Get Circom compiler
        const circomPath = await getCircomBinary();

        // 2. Generate Local Powers of Tau (trusted setup Phase 1)
        console.log("🎲 Generating Local Powers of Tau (Phase 1) via snarkjs CLI...");
        const pot0Path = path.join(CIRCUIT_DIR, 'pot12_0000.ptau');
        const pot1Path = path.join(CIRCUIT_DIR, 'pot12_0001.ptau');
        
        if (!fs.existsSync(PTAU_PATH)) {
            // Drop back to CLI to avoid snarkjs internal API logger errors
            execSync(`npx snarkjs powersoftau new bn128 12 "${pot0Path}" -v`, { stdio: 'inherit', cwd: CIRCUIT_DIR });
            execSync(`npx snarkjs powersoftau contribute "${pot0Path}" "${pot1Path}" --name="Setup" -v -e="RandomEntropy123"`, { stdio: 'inherit', cwd: CIRCUIT_DIR });
            execSync(`npx snarkjs powersoftau prepare phase2 "${pot1Path}" "${PTAU_PATH}" -v`, { stdio: 'inherit', cwd: CIRCUIT_DIR });
            
            if (fs.existsSync(pot0Path)) fs.unlinkSync(pot0Path);
            if (fs.existsSync(pot1Path)) fs.unlinkSync(pot1Path);
            console.log("✅ Local Powers of Tau generated.");
        } else {
            console.log("✅ Local Powers of Tau already exists.");
        }

        // 3. Compile the Circuit
        console.log("⚙️  Compiling circuit ModelTraining.circom to WebAssembly and R1CS...");
        const compileCmd = `"${circomPath}" "${CIRCOM_SRC}" --r1cs --wasm --sym -o "${CIRCUIT_DIR}"`;
        execSync(compileCmd, { stdio: 'inherit' });
        console.log("✅ Circuit compiled successfully.");

        // 4. Generate ZKey (Phase 2)
        console.log("🔑 Generating ZKey (Proving Key)... this may take a moment.");
        const r1csPath = path.join(CIRCUIT_DIR, 'ModelTraining.r1cs');
        const zkeyPath = path.join(CIRCUIT_DIR, 'ModelTraining_final.zkey');
        
        // Generate ZKey via CLI as well for consistency
        execSync(`npx snarkjs groth16 setup "${r1csPath}" "${PTAU_PATH}" "${zkeyPath}"`, { stdio: 'inherit', cwd: CIRCUIT_DIR });

        // 5. Export Verification Key
        console.log("📄 Exporting Verification Key...");
        const vKeyPath = path.join(CIRCUIT_DIR, 'ModelTraining_verification_key.json');
        execSync(`npx snarkjs zkey export verificationkey "${zkeyPath}" "${vKeyPath}"`, { stdio: 'inherit', cwd: CIRCUIT_DIR });
        
        console.log("✅ Verification key exported.");
        console.log("🎉 Production ZK Setup Complete! The federated learning system is now utilizing real SNARKs.");

    } catch (error) {
        console.error("❌ Setup failed:", error.message);
        process.exit(1);
    }
}

setupCircuits();
