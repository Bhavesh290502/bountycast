// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract BountyBoard {

    struct Question {
        address asker;
        uint256 bounty;
        uint256 deadline; // timestamp when auto-award becomes possible
        address token; // address(0) = ETH
        bool active;
        bool awarded;
        bool refunded;
        address winner;
        string metadataUri;
    }

    // --- STORAGE ---
    mapping(uint256 => Question) public questions;
    mapping(uint256 => address[]) public answers;

    // upvotes[questionId][answerer] = votes
    mapping(uint256 => mapping(address => uint256)) public upvotes;

    // prevents the same wallet from upvoting an answer multiple times
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasVoted;
    
    uint256 public nextQuestionId = 1;
    address public owner;

    // --- EVENTS ---
    event QuestionCreated(
        uint256 indexed id,
        address indexed asker,
        uint256 bounty,
        uint256 deadline,
        string metadataUri
    );

    event AnswerPosted(uint256 indexed questionId, address indexed answerer);

    event Upvoted(
        uint256 indexed questionId,
        address indexed answerer,
        uint256 count
    );

    event BountyAwarded(
        uint256 indexed questionId,
        address indexed winner,
        uint256 amount,
        address indexed awardedBy
    );

    event BountyRefunded(
        uint256 indexed questionId,
        address indexed asker,
        uint256 amount
    );

    constructor() {
        owner = msg.sender;
    }

    // --- POST QUESTION ---
    function createQuestion(
        string memory metadataUri,
        uint256 autoAwardAfterSeconds
    ) external payable returns (uint256) {
        require(msg.value > 0, "bounty required");
        require(autoAwardAfterSeconds >= 1 hours, "minimum 1h");

        uint256 id = nextQuestionId++;

        questions[id] = Question({
            asker: msg.sender,
            bounty: msg.value,
            deadline: block.timestamp + autoAwardAfterSeconds,
            token: address(0), // ETH only for now
            active: true,
            awarded: false,
            refunded: false,
            winner: address(0),
            metadataUri: metadataUri
        });

        emit QuestionCreated(
            id,
            msg.sender,
            msg.value,
            block.timestamp + autoAwardAfterSeconds,
            metadataUri
        );

        return id;
    }

    // --- ANSWER ---
    function answer(uint256 questionId) external {
        require(questions[questionId].asker != address(0), "question not found");
        answers[questionId].push(msg.sender);
        emit AnswerPosted(questionId, msg.sender);
    }

    // --- UPVOTE ---
    function upvote(uint256 questionId, address answerer) external {
        require(questions[questionId].asker != address(0), "question not found");
        require(!hasVoted[questionId][msg.sender][answerer], "already voted");

        hasVoted[questionId][msg.sender][answerer] = true;
        upvotes[questionId][answerer] += 1;

        emit Upvoted(questionId, answerer, upvotes[questionId][answerer]);
    }

    // --- AWARD BOUNTY (MANUAL & AUTO) ---
    function awardBounty(uint256 questionId, address winner) external {
        Question storage q = questions[questionId];
        require(q.active, "not active");
        require(!q.awarded && !q.refunded, "already resolved");
        require(winner != address(0), "invalid winner");

        // Logic:
        // 1. Asker can award ANY TIME.
        // 2. Owner (system) can award ONLY AFTER DEADLINE.
        if (msg.sender == q.asker) {
            // Asker: OK
        } else if (msg.sender == owner) {
            require(block.timestamp >= q.deadline, "too early for auto-award");
        } else {
            revert("Not allowed");
        }

        q.active = false;
        q.awarded = true;
        q.winner = winner;
        uint256 amount = q.bounty;
        q.bounty = 0;

        // Payout ETH
        (bool ok, ) = winner.call{value: amount}("");
        require(ok, "ETH transfer failed");

        emit BountyAwarded(questionId, winner, amount, msg.sender);
    }

    // --- REFUND ---
    function refund(uint256 questionId) external {
        Question storage q = questions[questionId];
        require(q.active, "not active");
        require(!q.awarded && !q.refunded, "already resolved");
        require(block.timestamp >= q.deadline, "too early");
        
        // Only asker or owner can trigger refund after deadline if no winner selected
        require(msg.sender == q.asker || msg.sender == owner, "not allowed");

        q.active = false;
        q.refunded = true;
        uint256 amount = q.bounty;
        q.bounty = 0;

        (bool ok, ) = q.asker.call{value: amount}("");
        require(ok, "ETH transfer failed");

        emit BountyRefunded(questionId, q.asker, amount);
    }

    receive() external payable {}
}
