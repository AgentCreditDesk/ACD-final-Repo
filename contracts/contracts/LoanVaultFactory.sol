// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./LoanVault.sol";

/**
 * @title LoanVaultFactory
 * @notice Deploys LoanVault instances for approved loans.
 *         Keeps a registry of all vaults for easy enumeration.
 */
contract LoanVaultFactory {
    event VaultCreated(
        address indexed vault,
        address indexed lender,
        address indexed borrower,
        uint256 principal,
        uint256 aprBps,
        uint256 durationSeconds
    );

    address[] public allVaults;
    mapping(address => address[]) public vaultsByBorrower;
    mapping(address => address[]) public vaultsByLender;

    function createVault(
        address _lender,
        address _borrower,
        address _asset,
        uint256 _principal,
        uint256 _aprBps,
        uint256 _durationSeconds
    ) external returns (address vault) {
        LoanVault v = new LoanVault(
            _lender,
            _borrower,
            _asset,
            _principal,
            _aprBps,
            _durationSeconds
        );
        vault = address(v);

        allVaults.push(vault);
        vaultsByBorrower[_borrower].push(vault);
        vaultsByLender[_lender].push(vault);

        emit VaultCreated(vault, _lender, _borrower, _principal, _aprBps, _durationSeconds);
    }

    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    function getBorrowerVaults(address _borrower) external view returns (address[] memory) {
        return vaultsByBorrower[_borrower];
    }

    function getLenderVaults(address _lender) external view returns (address[] memory) {
        return vaultsByLender[_lender];
    }
}
