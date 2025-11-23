// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract BountyBoard {

    struct Question {
        address asker;
        uint256 bounty;
        uint256 expires;
        address token; // address(0) = ETH
        bool active;
        address winner;
    }

    // --- STORAGE ---
    mapping(uint256 => Question) public questions;
    mapping(uint256 => address[]) public answers;

    // upvotes[questionId][answerer] = votes
    mapping(uint256 => mapping(address => uint256)) public upvotes;

    // prevents the same wallet from upvoting an answer multiple times
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasVoted;
    // hasVoted[questionId][voter][answerer] = true/false

    uint256 public nextQuestionId = 1;

    // --- EVENTS ---
    event QuestionPosted(
        uint256 indexed id,
        address indexed asker,
        uint256 bounty,
        address token,
        uint256 expires
    );

    event AnswerPosted(uint256 indexed questionId, address indexed answerer);

    event Upvoted(
        uint256 indexed questionId,
        address indexed answerer,
        uint256 count
    );

    event BountyClaimed(
        uint256 indexed questionId,
        address indexed winner,
        uint256 amount
    );

    // --- POST QUESTION ---
    function postQuestion(
        address token,
        uint256 bounty,
        uint256 expiresAfterSeconds
    ) external payable returns (uint256) {

        require(bounty > 0, "bounty required");
        require(expiresAfterSeconds >= 1 hours, "minimum 1h");

        uint256 id = nextQuestionId++;

        // ETH bounty
        if (token == address(0)) {
            require(msg.value == bounty, "incorrect ETH sent");
        }

        // ⚠ For ERC20 bounties you must add transferFrom here (not included in demo)

        questions[id] = Question({
            asker: msg.sender,
            bounty: bounty,
            expires: block.timestamp + expiresAfterSeconds,
            token: token,
            active: true,
            winner: address(0)
        });

        emit QuestionPosted(
            id,
            msg.sender,
            bounty,
            token,
            block.timestamp + expiresAfterSeconds
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

    // --- CLAIM BOUNTY ---
    function claimBounty(uint256 questionId) external {
        Question storage q = questions[questionId];
        require(q.asker != address(0), "question not found");
        require(block.timestamp >= q.expires, "not expired yet");
        require(q.active, "already claimed");

        address[] memory ansList = answers[questionId];
        require(ansList.length > 0, "no answers");

        // find highest voted answer
        uint256 maxVotes = 0;
        address winner = address(0);

        for (uint256 i = 0; i < ansList.length; i++) {
            address ans = ansList[i];
            uint256 v = upvotes[questionId][ans];

            if (v > maxVotes) {
                maxVotes = v;
                winner = ans;
            }
        }

        require(winner != address(0), "no upvotes");

        q.active = false;
        q.winner = winner;

        // payout ETH
        if (q.token == address(0)) {
            (bool ok, ) = winner.call{value: q.bounty}("");
            require(ok, "ETH transfer failed");
        }

        // ⚠ For ERC20 bounty payout add transfer logic

        emit BountyClaimed(questionId, winner, q.bounty);
    }

    receive() external payable {}
}
