const fs = require("fs");
const path = require("path");

const artifacts = [
  "contracts/LoanVault.sol/LoanVault.json",
  "contracts/LoanVaultFactory.sol/LoanVaultFactory.json",
  "contracts/CreditScoreOracle.sol/CreditScoreOracle.json",
  "contracts/MockERC20.sol/MockERC20.json",
];

const destDir = path.join(__dirname, "..", "..", "backend", "abis");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const artifact of artifacts) {
  const srcPath = path.join(__dirname, "..", "artifacts", artifact);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Artifact not found: ${srcPath}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
  const name = path.basename(artifact, ".json");
  const dest = path.join(destDir, `${name}.json`);

  fs.writeFileSync(
    dest,
    JSON.stringify({ abi: data.abi, bytecode: data.bytecode }, null, 2)
  );
  console.log(`Copied ABI: ${name} -> ${dest}`);
}
