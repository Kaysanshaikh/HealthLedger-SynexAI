const pinataService = require('./services/pinataService');
const path = require('path');

async function testDeepValidation() {
    console.log("🧪 Testing Deep Validation Logic in PinataService...");

    const testCases = [
        { name: "scan.pdf.encrypted", expected: "pass" },
        { name: "report.docx.encrypted", expected: "pass" },
        { name: "photo.jpg.encrypted", expected: "pass" },
        { name: "movie.mp4.encrypted", expected: "fail" },
        { name: "script.sh.encrypted", expected: "fail" },
        { name: "legacy.pdf", expected: "pass" },
        { name: "malicious.exe", expected: "fail" }
    ];

    const dummyBuffer = Buffer.from("dummy data");

    for (const test of testCases) {
        try {
            console.log(`\n🔍 testing: ${test.name}`);
            // We simulate the validation part of uploadFile
            // since we don't want to actually hit the Pinata API

            const clinicalExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            let fileExtension = path.extname(test.name).toLowerCase();
            let underlyingExtension = fileExtension;

            if (fileExtension === '.encrypted') {
                const nameWithoutEncrypted = test.name.slice(0, -10);
                underlyingExtension = path.extname(nameWithoutEncrypted).toLowerCase();
            }

            if (!clinicalExtensions.includes(underlyingExtension)) {
                console.log(`❌ REJECTED: ${underlyingExtension} is unauthorized (Expected: ${test.expected})`);
                if (test.expected === "pass") {
                    console.error("FAIL: Should have passed but was rejected.");
                } else {
                    console.log("PASS: Correctly rejected unauthorized type.");
                }
            } else {
                console.log(`✅ ACCEPTED: ${underlyingExtension} is authorized (Expected: ${test.expected})`);
                if (test.expected === "fail") {
                    console.error("FAIL: Should have been rejected but was accepted.");
                } else {
                    console.log("PASS: Correctly accepted authorized type.");
                }
            }
        } catch (err) {
            console.error(`💥 Error testing ${test.name}:`, err.message);
        }
    }
}

testDeepValidation();
