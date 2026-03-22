import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { LoanVault, LoanVaultFactory } from "../typechain-types";

describe("LoanVault", function () {
  const PRINCIPAL = ethers.parseUnits("1000", 6); // 1000 USDT (6 decimals)
  const APR_BPS = 500; // 5% APR
  const DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

  async function deployFixture() {
    const [owner, lender, borrower, other] = await ethers.getSigners();

    // Deploy mock USDT (ERC20)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdt = await MockToken.deploy("Tether USD", "USDT", 6);

    // Mint to lender and borrower
    await usdt.mint(lender.address, ethers.parseUnits("100000", 6));
    await usdt.mint(borrower.address, ethers.parseUnits("10000", 6));

    // Deploy factory
    const Factory = await ethers.getContractFactory("LoanVaultFactory");
    const factory = await Factory.deploy();

    // Create vault via factory
    const tx = await factory.createVault(
      lender.address,
      borrower.address,
      await usdt.getAddress(),
      PRINCIPAL,
      APR_BPS,
      DURATION
    );
    const receipt = await tx.wait();

    const vaultAddress = await factory.allVaults(0);
    const vault = await ethers.getContractAt("LoanVault", vaultAddress);

    return { vault, factory, usdt, owner, lender, borrower, other };
  }

  describe("Construction", function () {
    it("should set immutable parameters correctly", async function () {
      const { vault, lender, borrower, usdt } = await deployFixture();

      expect(await vault.lender()).to.equal(lender.address);
      expect(await vault.borrower()).to.equal(borrower.address);
      expect(await vault.asset()).to.equal(await usdt.getAddress());
      expect(await vault.principal()).to.equal(PRINCIPAL);
      expect(await vault.aprBps()).to.equal(APR_BPS);
      expect(await vault.durationSeconds()).to.equal(DURATION);
      expect(await vault.state()).to.equal(0); // Created
    });
  });

  describe("Funding", function () {
    it("should allow lender to fund the vault", async function () {
      const { vault, usdt, lender } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await expect(vault.connect(lender).fund())
        .to.emit(vault, "LoanFunded")
        .withArgs(lender.address, (await vault.borrower()), PRINCIPAL);

      expect(await vault.state()).to.equal(1); // Funded
      expect(await usdt.balanceOf(vaultAddr)).to.equal(PRINCIPAL);
    });

    it("should reject funding from non-lender", async function () {
      const { vault, other } = await deployFixture();
      await expect(vault.connect(other).fund()).to.be.revertedWith(
        "LoanVault: caller is not lender"
      );
    });

    it("should reject double funding", async function () {
      const { vault, usdt, lender } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();

      await expect(vault.connect(lender).fund()).to.be.revertedWith(
        "LoanVault: invalid state"
      );
    });
  });

  describe("Drawing", function () {
    it("should allow borrower to draw funds", async function () {
      const { vault, usdt, lender, borrower } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();

      const balBefore = await usdt.balanceOf(borrower.address);
      await expect(vault.connect(borrower).draw())
        .to.emit(vault, "LoanDrawn")
        .withArgs(borrower.address, PRINCIPAL);

      expect(await vault.state()).to.equal(2); // Drawn
      expect(await usdt.balanceOf(borrower.address)).to.equal(balBefore + PRINCIPAL);
    });

    it("should reject draw from non-borrower", async function () {
      const { vault, usdt, lender, other } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();

      await expect(vault.connect(other).draw()).to.be.revertedWith(
        "LoanVault: caller is not borrower"
      );
    });
  });

  describe("Interest Calculation", function () {
    it("should calculate interest linearly over time", async function () {
      const { vault, usdt, lender } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();

      // Advance 15 days (half duration)
      await time.increase(15 * 24 * 60 * 60);

      const interest = await vault.interestOwed();
      // Expected: 1000 * 500 * (15 * 86400) / (365 * 86400 * 10000)
      // = 1000 * 500 * 15 / (365 * 10000) = 7500000 / 3650000 ≈ 2.054...
      // With 6 decimals: 1000_000000 * 500 * 15 / (365 * 10000) ≈ 2_054794
      const expectedApprox = (PRINCIPAL * BigInt(APR_BPS) * BigInt(15)) / (BigInt(365) * BigInt(10000));
      // Allow 1 unit tolerance for rounding
      expect(interest).to.be.closeTo(expectedApprox, ethers.parseUnits("1", 6));
    });

    it("should cap interest at due date", async function () {
      const { vault, usdt, lender } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();

      // Advance well past duration
      await time.increase(60 * 24 * 60 * 60);

      const interest = await vault.interestOwed();
      const maxInterest = (PRINCIPAL * BigInt(APR_BPS) * BigInt(DURATION)) / (BigInt(365 * 24 * 60 * 60) * BigInt(10000));

      expect(interest).to.equal(maxInterest);
    });
  });

  describe("Repayment", function () {
    it("should allow borrower to repay principal + interest", async function () {
      const { vault, usdt, lender, borrower } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();
      await vault.connect(borrower).draw();

      // Advance 10 days
      await time.increase(10 * 24 * 60 * 60);

      // Approve more than enough to account for timestamp advancing between approve and repay
      const maxTotal = await vault.totalOwed() + ethers.parseUnits("10", 6);
      await usdt.connect(borrower).approve(vaultAddr, maxTotal);

      const lenderBalBefore = await usdt.balanceOf(lender.address);
      await vault.connect(borrower).repay();

      expect(await vault.state()).to.equal(3); // Repaid
      // Lender received principal + interest
      expect(await usdt.balanceOf(lender.address)).to.be.greaterThan(lenderBalBefore + PRINCIPAL);
    });
  });

  describe("Default", function () {
    it("should allow lender to mark default after due date", async function () {
      const { vault, usdt, lender, borrower } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();
      await vault.connect(borrower).draw();

      // Advance past due date
      await time.increase(DURATION + 1);

      await expect(vault.connect(lender).markDefault())
        .to.emit(vault, "LoanDefaulted");

      expect(await vault.state()).to.equal(4); // Defaulted
    });

    it("should reject default before due date", async function () {
      const { vault, usdt, lender, borrower } = await deployFixture();
      const vaultAddr = await vault.getAddress();

      await usdt.connect(lender).approve(vaultAddr, PRINCIPAL);
      await vault.connect(lender).fund();
      await vault.connect(borrower).draw();

      await expect(vault.connect(lender).markDefault()).to.be.revertedWith(
        "LoanVault: not yet due"
      );
    });
  });

  describe("Factory", function () {
    it("should track vaults by borrower and lender", async function () {
      const { factory, lender, borrower } = await deployFixture();

      expect(await factory.totalVaults()).to.equal(1);
      const borrowerVaults = await factory.getBorrowerVaults(borrower.address);
      expect(borrowerVaults.length).to.equal(1);
      const lenderVaults = await factory.getLenderVaults(lender.address);
      expect(lenderVaults.length).to.equal(1);
    });
  });
});
