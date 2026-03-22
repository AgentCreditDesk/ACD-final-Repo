// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ICreditScoreOracle.sol";

/**
 * @title CreditScoreOracle
 * @notice On-chain credit score (0-1000) for each borrower address.
 *         Updated by a designated updater (treasury wallet) based on loan outcomes.
 */
contract CreditScoreOracle is ICreditScoreOracle {
    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant DEFAULT_INITIAL_SCORE = 500;
    uint256 public constant REPAID_BUMP = 10;
    uint256 public constant DEFAULT_PENALTY = 50;

    address public owner;
    address public updater;

    mapping(address => CreditProfile) private _profiles;
    mapping(address => bool) private _initialized;

    modifier onlyUpdater() {
        require(msg.sender == updater || msg.sender == owner, "CreditScoreOracle: not authorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "CreditScoreOracle: not owner");
        _;
    }

    constructor(address _updater) {
        require(_updater != address(0), "CreditScoreOracle: zero updater");
        owner = msg.sender;
        updater = _updater;
    }

    /**
     * @notice Set a new updater address (e.g., new treasury wallet).
     */
    function setUpdater(address _updater) external onlyOwner {
        require(_updater != address(0), "CreditScoreOracle: zero updater");
        updater = _updater;
    }

    /**
     * @notice Transfer ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CreditScoreOracle: zero owner");
        owner = newOwner;
    }

    /**
     * @notice Initialize a borrower's profile with a custom starting score.
     * @dev Can only be called once per address. If not called, first interaction sets DEFAULT_INITIAL_SCORE.
     */
    function initializeProfile(address borrower, uint256 initialScore) external onlyUpdater {
        require(!_initialized[borrower], "CreditScoreOracle: already initialized");
        require(initialScore <= MAX_SCORE, "CreditScoreOracle: score exceeds max");

        _initialized[borrower] = true;
        _profiles[borrower].score = initialScore;

        emit ProfileInitialized(borrower, initialScore);
    }

    /**
     * @notice Get the credit score for a borrower.
     * @return Score value (0-1000). Returns DEFAULT_INITIAL_SCORE if not yet initialized.
     */
    function scoreOf(address borrower) external view returns (uint256) {
        if (!_initialized[borrower]) return DEFAULT_INITIAL_SCORE;
        return _profiles[borrower].score;
    }

    /**
     * @notice Get the full credit profile for a borrower.
     */
    function profileOf(address borrower) external view returns (CreditProfile memory) {
        if (!_initialized[borrower]) {
            return CreditProfile({
                score: DEFAULT_INITIAL_SCORE,
                loansTaken: 0,
                loansRepaid: 0,
                loansDefaulted: 0
            });
        }
        return _profiles[borrower];
    }

    /**
     * @notice Bump score on successful repayment.
     *         Increments loansTaken, loansRepaid, and increases score by REPAID_BUMP (capped at MAX_SCORE).
     */
    function bumpOnRepaid(address borrower) external onlyUpdater {
        _ensureInitialized(borrower);

        CreditProfile storage profile = _profiles[borrower];
        uint256 oldScore = profile.score;

        profile.loansTaken += 1;
        profile.loansRepaid += 1;

        uint256 newScore = oldScore + REPAID_BUMP;
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        profile.score = newScore;

        emit ScoreUpdated(borrower, oldScore, newScore);
    }

    /**
     * @notice Penalize score on loan default.
     *         Increments loansTaken, loansDefaulted, and decreases score by DEFAULT_PENALTY (floor at 0).
     */
    function bumpOnDefault(address borrower) external onlyUpdater {
        _ensureInitialized(borrower);

        CreditProfile storage profile = _profiles[borrower];
        uint256 oldScore = profile.score;

        profile.loansTaken += 1;
        profile.loansDefaulted += 1;

        uint256 newScore;
        if (oldScore >= DEFAULT_PENALTY) {
            newScore = oldScore - DEFAULT_PENALTY;
        } else {
            newScore = 0;
        }
        profile.score = newScore;

        emit ScoreUpdated(borrower, oldScore, newScore);
    }

    /**
     * @dev Initialize a borrower with default score if not yet done.
     */
    function _ensureInitialized(address borrower) internal {
        if (!_initialized[borrower]) {
            _initialized[borrower] = true;
            _profiles[borrower].score = DEFAULT_INITIAL_SCORE;
            emit ProfileInitialized(borrower, DEFAULT_INITIAL_SCORE);
        }
    }
}
