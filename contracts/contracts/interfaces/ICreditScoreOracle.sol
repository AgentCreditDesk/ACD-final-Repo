// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICreditScoreOracle {
    struct CreditProfile {
        uint256 score;
        uint256 loansTaken;
        uint256 loansRepaid;
        uint256 loansDefaulted;
    }

    event ScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore);
    event ProfileInitialized(address indexed borrower, uint256 initialScore);

    function scoreOf(address borrower) external view returns (uint256);
    function profileOf(address borrower) external view returns (CreditProfile memory);
    function bumpOnRepaid(address borrower) external;
    function bumpOnDefault(address borrower) external;
    function initializeProfile(address borrower, uint256 initialScore) external;
}
