import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name);

  // Deploy CreditScoreOracle (updater = deployer for now, can be changed later)
  const Oracle = await ethers.getContractFactory("CreditScoreOracle");
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("CreditScoreOracle deployed to:", oracleAddress);

  // Deploy LoanVaultFactory
  const Factory = await ethers.getContractFactory("LoanVaultFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("LoanVaultFactory deployed to:", factoryAddress);

  // Save deployment addresses
  const deployments: Record<string, string> = {
    CreditScoreOracle: oracleAddress,
    LoanVaultFactory: factoryAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: String(network.config.chainId || 31337),
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2));
  console.log("Deployment addresses saved to:", filePath);

  // If deploying to local, also deploy MockERC20 for testing
  if (network.name === "hardhat" || network.name === "localhost") {
    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdt = await MockToken.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log("MockUSDT deployed to:", usdtAddress);

    deployments["MockUSDT"] = usdtAddress;
    fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
