// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILoanVault.sol";

/**
 * @title LoanVault
 * @notice Per-loan escrow contract that holds USDT principal, tracks terms,
 *         and provides fund, draw, and repay functions.
 * @dev One vault is deployed per approved loan. Interest is calculated linearly
 *      using simple APR in basis points: interest = principal * aprBps * elapsed / (365 days * 10000)
 */
contract LoanVault is ILoanVault {
    using SafeERC20 for IERC20;

    address public immutable lender;
    address public immutable borrower;
    IERC20 public immutable asset;
    uint256 public immutable principal;
    uint256 public immutable aprBps;
    uint256 public immutable durationSeconds;
    uint256 public immutable createdAt;

    uint256 public startTimestamp;
    uint256 public dueTimestamp;
    LoanState private _state;

    modifier onlyLender() {
        require(msg.sender == lender, "LoanVault: caller is not lender");
        _;
    }

    modifier onlyBorrower() {
        require(msg.sender == borrower, "LoanVault: caller is not borrower");
        _;
    }

    modifier inState(LoanState expected) {
        require(_state == expected, "LoanVault: invalid state");
        _;
    }

    constructor(
        address _lender,
        address _borrower,
        address _asset,
        uint256 _principal,
        uint256 _aprBps,
        uint256 _durationSeconds
    ) {
        require(_lender != address(0), "LoanVault: zero lender");
        require(_borrower != address(0), "LoanVault: zero borrower");
        require(_asset != address(0), "LoanVault: zero asset");
        require(_principal > 0, "LoanVault: zero principal");
        require(_aprBps > 0 && _aprBps <= 10000, "LoanVault: invalid APR");
        require(_durationSeconds > 0, "LoanVault: zero duration");

        lender = _lender;
        borrower = _borrower;
        asset = IERC20(_asset);
        principal = _principal;
        aprBps = _aprBps;
        durationSeconds = _durationSeconds;
        createdAt = block.timestamp;
        _state = LoanState.Created;
    }

    /**
     * @notice Lender funds the vault by transferring principal amount of asset.
     * @dev The lender must have approved this contract to spend `principal` tokens.
     */
    function fund() external onlyLender inState(LoanState.Created) {
        _state = LoanState.Funded;
        startTimestamp = block.timestamp;
        dueTimestamp = block.timestamp + durationSeconds;

        asset.safeTransferFrom(lender, address(this), principal);

        emit LoanFunded(lender, borrower, principal);
    }

    /**
     * @notice Borrower draws the full principal from the vault.
     */
    function draw() external onlyBorrower inState(LoanState.Funded) {
        _state = LoanState.Drawn;

        asset.safeTransfer(borrower, principal);

        emit LoanDrawn(borrower, principal);
    }

    /**
     * @notice Borrower repays principal + accrued interest.
     * @dev The borrower must have approved this contract to spend totalOwed() tokens.
     *      Funds are sent directly to the lender.
     */
    function repay() external onlyBorrower inState(LoanState.Drawn) {
        uint256 total = totalOwed();
        _state = LoanState.Repaid;

        asset.safeTransferFrom(borrower, lender, total);

        emit LoanRepaid(borrower, principal, total - principal);
    }

    /**
     * @notice Lender marks the loan as defaulted after the due date passes.
     * @dev Can only be called after dueTimestamp when the loan is still in Drawn state.
     */
    function markDefault() external onlyLender inState(LoanState.Drawn) {
        require(block.timestamp > dueTimestamp, "LoanVault: not yet due");
        _state = LoanState.Defaulted;

        // Transfer any remaining balance in the vault back to lender
        uint256 remaining = asset.balanceOf(address(this));
        if (remaining > 0) {
            asset.safeTransfer(lender, remaining);
        }

        emit LoanDefaulted(borrower, totalOwed());
    }

    /**
     * @notice Calculate interest owed based on elapsed time, capped at due date.
     * @return Interest amount in asset decimals.
     */
    function interestOwed() public view returns (uint256) {
        if (startTimestamp == 0) return 0;

        uint256 elapsed;
        if (block.timestamp >= dueTimestamp) {
            elapsed = durationSeconds;
        } else {
            elapsed = block.timestamp - startTimestamp;
        }

        // interest = principal * aprBps * elapsed / (365 days * 10000)
        return (principal * aprBps * elapsed) / (365 days * 10000);
    }

    /**
     * @notice Total amount owed: principal + interest.
     */
    function totalOwed() public view returns (uint256) {
        return principal + interestOwed();
    }

    /**
     * @notice Current loan state.
     */
    function state() external view returns (LoanState) {
        return _state;
    }
}
