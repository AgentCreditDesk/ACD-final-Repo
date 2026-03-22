// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILoanVault {
    enum LoanState { Created, Funded, Drawn, Repaid, Defaulted }

    event LoanFunded(address indexed lender, address indexed borrower, uint256 principal);
    event LoanDrawn(address indexed borrower, uint256 amount);
    event LoanRepaid(address indexed borrower, uint256 principal, uint256 interest);
    event LoanDefaulted(address indexed borrower, uint256 outstanding);

    function fund() external;
    function draw() external;
    function repay() external;
    function markDefault() external;
    function interestOwed() external view returns (uint256);
    function totalOwed() external view returns (uint256);
    function state() external view returns (LoanState);
}
