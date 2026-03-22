import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditScoreOracle } from "../typechain-types";

describe("CreditScoreOracle", function () {
  async function deployFixture() {
    const [owner, updater, borrower1, borrower2, other] = await ethers.getSigners();

    const Oracle = await ethers.getContractFactory("CreditScoreOracle");
    const oracle = await Oracle.deploy(updater.address);

    return { oracle, owner, updater, borrower1, borrower2, other };
  }

  describe("Deployment", function () {
    it("should set owner and updater correctly", async function () {
      const { oracle, owner, updater } = await deployFixture();
      expect(await oracle.owner()).to.equal(owner.address);
      expect(await oracle.updater()).to.equal(updater.address);
    });
  });

  describe("Default Scores", function () {
    it("should return 500 for uninitialized addresses", async function () {
      const { oracle, borrower1 } = await deployFixture();
      expect(await oracle.scoreOf(borrower1.address)).to.equal(500);
    });

    it("should return default profile for uninitialized addresses", async function () {
      const { oracle, borrower1 } = await deployFixture();
      const profile = await oracle.profileOf(borrower1.address);
      expect(profile.score).to.equal(500);
      expect(profile.loansTaken).to.equal(0);
      expect(profile.loansRepaid).to.equal(0);
      expect(profile.loansDefaulted).to.equal(0);
    });
  });

  describe("Initialize Profile", function () {
    it("should allow updater to initialize with custom score", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();

      await expect(oracle.connect(updater).initializeProfile(borrower1.address, 750))
        .to.emit(oracle, "ProfileInitialized")
        .withArgs(borrower1.address, 750);

      expect(await oracle.scoreOf(borrower1.address)).to.equal(750);
    });

    it("should reject double initialization", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();
      await oracle.connect(updater).initializeProfile(borrower1.address, 750);

      await expect(
        oracle.connect(updater).initializeProfile(borrower1.address, 800)
      ).to.be.revertedWith("CreditScoreOracle: already initialized");
    });

    it("should reject score above MAX_SCORE", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();
      await expect(
        oracle.connect(updater).initializeProfile(borrower1.address, 1001)
      ).to.be.revertedWith("CreditScoreOracle: score exceeds max");
    });

    it("should reject unauthorized callers", async function () {
      const { oracle, other, borrower1 } = await deployFixture();
      await expect(
        oracle.connect(other).initializeProfile(borrower1.address, 500)
      ).to.be.revertedWith("CreditScoreOracle: not authorized");
    });
  });

  describe("Bump on Repaid", function () {
    it("should increase score by REPAID_BUMP and update stats", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();

      await oracle.connect(updater).bumpOnRepaid(borrower1.address);

      const profile = await oracle.profileOf(borrower1.address);
      expect(profile.score).to.equal(510); // 500 + 10
      expect(profile.loansTaken).to.equal(1);
      expect(profile.loansRepaid).to.equal(1);
      expect(profile.loansDefaulted).to.equal(0);
    });

    it("should cap score at MAX_SCORE (1000)", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();
      await oracle.connect(updater).initializeProfile(borrower1.address, 995);

      await oracle.connect(updater).bumpOnRepaid(borrower1.address);
      expect(await oracle.scoreOf(borrower1.address)).to.equal(1000);
    });

    it("should accumulate over multiple repayments", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();

      for (let i = 0; i < 5; i++) {
        await oracle.connect(updater).bumpOnRepaid(borrower1.address);
      }

      const profile = await oracle.profileOf(borrower1.address);
      expect(profile.score).to.equal(550); // 500 + 5*10
      expect(profile.loansTaken).to.equal(5);
      expect(profile.loansRepaid).to.equal(5);
    });
  });

  describe("Bump on Default", function () {
    it("should decrease score by DEFAULT_PENALTY and update stats", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();

      await oracle.connect(updater).bumpOnDefault(borrower1.address);

      const profile = await oracle.profileOf(borrower1.address);
      expect(profile.score).to.equal(450); // 500 - 50
      expect(profile.loansTaken).to.equal(1);
      expect(profile.loansRepaid).to.equal(0);
      expect(profile.loansDefaulted).to.equal(1);
    });

    it("should floor score at 0", async function () {
      const { oracle, updater, borrower1 } = await deployFixture();
      await oracle.connect(updater).initializeProfile(borrower1.address, 30);

      await oracle.connect(updater).bumpOnDefault(borrower1.address);
      expect(await oracle.scoreOf(borrower1.address)).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("should allow owner to change updater", async function () {
      const { oracle, owner, other } = await deployFixture();
      await oracle.connect(owner).setUpdater(other.address);
      expect(await oracle.updater()).to.equal(other.address);
    });

    it("should allow owner to transfer ownership", async function () {
      const { oracle, owner, other } = await deployFixture();
      await oracle.connect(owner).transferOwnership(other.address);
      expect(await oracle.owner()).to.equal(other.address);
    });

    it("should allow owner to call updater functions", async function () {
      const { oracle, owner, borrower1 } = await deployFixture();
      await oracle.connect(owner).bumpOnRepaid(borrower1.address);
      expect(await oracle.scoreOf(borrower1.address)).to.equal(510);
    });
  });
});
