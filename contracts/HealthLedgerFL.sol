// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./HealthLedger.sol";

/// @title HealthLedgerFL - Federated Learning extension with ZK-SNARK proof verification
/// @notice Extends HealthLedger with federated learning coordination and zero-knowledge proofs
contract HealthLedgerFL is HealthLedger {
    bytes32 public constant FL_PARTICIPANT_ROLE = keccak256("FL_PARTICIPANT_ROLE");
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct FLModel {
        bytes32 modelId;
        string disease;          // diabetes, cvd, cancer, pneumonia
        string modelType;        // logistic_regression, neural_network, cnn
        uint256 currentRound;
        string globalModelIPFS;  // Current global model CID
        uint256 accuracy;        // Scaled by 10000 (e.g., 9200 = 92.00%)
        uint256 loss;            // Scaled by 1000000
        uint256 totalParticipants;
        address createdBy;
        uint256 createdAt;
        bool isActive;
    }
    
    struct FLRound {
        uint256 roundId;
        bytes32 modelId;
        uint256 roundNumber;
        RoundStatus status;
        uint256 minParticipants;
        uint256 currentParticipants;
        string aggregatedModelIPFS;
        uint256 startTime;
        uint256 endTime;
        uint256 timeoutAt;
    }
    
    struct ModelContribution {
        address participant;
        string modelUpdateIPFS;
        bytes32 zkProofHash;
        bool verified;
        uint256 localAccuracy;   // Scaled by 10000
        uint256 localLoss;       // Scaled by 1000000
        uint256 samplesTrained;
        uint256 submittedAt;
    }
    
    struct FLParticipant {
        address walletAddress;
        string institutionName;
        uint256 totalContributions;
        uint256 totalRewards;
        uint256 reputationScore; // Scaled by 100 (e.g., 10000 = 100.00)
        bool isActive;
        uint256 registeredAt;
    }
    
    enum RoundStatus {
        Initiated,
        Training,
        Aggregating,
        Completed,
        Failed
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(bytes32 => FLModel) public flModels;
    mapping(uint256 => FLRound) public flRounds;
    mapping(uint256 => mapping(address => ModelContribution)) public contributions;
    mapping(address => FLParticipant) public flParticipants;
    mapping(bytes32 => bool) public verifiedProofs;
    
    bytes32[] public modelIds;
    uint256 public roundCounter;
    uint256 public minParticipantsGlobal = 1;
    uint256 public roundTimeout = 3600; // 1 hour in seconds
    
    // ============================================
    // EVENTS
    // ============================================
    
    event FLModelCreated(bytes32 indexed modelId, string disease, address indexed creator);
    event FLRoundInitiated(uint256 indexed roundId, bytes32 indexed modelId, uint256 roundNumber);
    event ModelUpdateSubmitted(uint256 indexed roundId, address indexed participant, string ipfsHash);
    event ZKProofVerified(bytes32 indexed proofHash, address indexed participant, bool result);
    event RoundAggregated(uint256 indexed roundId, string aggregatedModelIPFS, uint256 accuracy);
    event RoundCompleted(uint256 indexed roundId, bytes32 indexed modelId, uint256 finalAccuracy);
    event ParticipantRegistered(address indexed participant, string institutionName);
    event RewardDistributed(address indexed participant, uint256 amount);
    event ByzantineDetected(uint256 indexed roundId, address indexed participant, string reason);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address admin) HealthLedger(admin) {
        // Additional FL-specific initialization if needed
    }
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyFLParticipant() {
        require(
            hasRole(FL_PARTICIPANT_ROLE, msg.sender) || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not FL participant"
        );
        _;
    }
    
    modifier validModel(bytes32 modelId) {
        require(flModels[modelId].createdAt != 0, "Model does not exist");
        require(flModels[modelId].isActive, "Model is not active");
        _;
    }
    
    modifier validRound(uint256 roundId) {
        require(flRounds[roundId].startTime != 0, "Round does not exist");
        _;
    }
    
    // ============================================
    // FL PARTICIPANT MANAGEMENT
    // ============================================
    
    /// @notice Register as a federated learning participant
    /// @param institutionName Name of the hospital/diagnostic center
    function registerFLParticipant(string calldata institutionName) external {
        require(bytes(institutionName).length > 0, "Institution name required");
        require(flParticipants[msg.sender].registeredAt == 0, "Already registered");
        
        flParticipants[msg.sender] = FLParticipant({
            walletAddress: msg.sender,
            institutionName: institutionName,
            totalContributions: 0,
            totalRewards: 0,
            reputationScore: 10000, // 100.00%
            isActive: true,
            registeredAt: block.timestamp
        });
        
        _grantRole(FL_PARTICIPANT_ROLE, msg.sender);
        emit ParticipantRegistered(msg.sender, institutionName);
    }
    
    /// @notice Admin can register a participant
    function registerFLParticipantByAdmin(address participant, string calldata institutionName) 
        external 
        onlyAdmin 
    {
        require(participant != address(0), "Invalid address");
        require(bytes(institutionName).length > 0, "Institution name required");
        
        flParticipants[participant] = FLParticipant({
            walletAddress: participant,
            institutionName: institutionName,
            totalContributions: 0,
            totalRewards: 0,
            reputationScore: 10000,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        _grantRole(FL_PARTICIPANT_ROLE, participant);
        emit ParticipantRegistered(participant, institutionName);
    }
    
    // ============================================
    // FL MODEL MANAGEMENT
    // ============================================
    
    /// @notice Create a new federated learning model
    /// @param disease Disease type (diabetes, cvd, cancer, pneumonia)
    /// @param modelType Model architecture type
    function createFLModel(
        string calldata disease,
        string calldata modelType
    ) external onlyAdmin returns (bytes32) {
        bytes32 modelId = keccak256(abi.encodePacked(disease, modelType, block.timestamp));
        
        require(flModels[modelId].createdAt == 0, "Model already exists");
        
        flModels[modelId] = FLModel({
            modelId: modelId,
            disease: disease,
            modelType: modelType,
            currentRound: 0,
            globalModelIPFS: "",
            accuracy: 0,
            loss: 0,
            totalParticipants: 0,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });
        
        modelIds.push(modelId);
        emit FLModelCreated(modelId, disease, msg.sender);
        
        return modelId;
    }
    
    // ============================================
    // FL ROUND MANAGEMENT
    // ============================================
    
    /// @notice Initiate a new federated learning round
    /// @param modelId The model to train
    function initiateFLRound(bytes32 modelId) 
        external 
        onlyAdmin 
        validModel(modelId) 
        returns (uint256) 
    {
        FLModel storage model = flModels[modelId];
        uint256 newRoundNumber = model.currentRound + 1;
        
        roundCounter++;
        uint256 roundId = roundCounter;
        
        flRounds[roundId] = FLRound({
            roundId: roundId,
            modelId: modelId,
            roundNumber: newRoundNumber,
            status: RoundStatus.Initiated,
            minParticipants: minParticipantsGlobal,
            currentParticipants: 0,
            aggregatedModelIPFS: "",
            startTime: block.timestamp,
            endTime: 0,
            timeoutAt: block.timestamp + roundTimeout
        });
        
        model.currentRound = newRoundNumber;
        
        emit FLRoundInitiated(roundId, modelId, newRoundNumber);
        return roundId;
    }
    
    // ============================================
    // MODEL CONTRIBUTION \u0026 ZK PROOF VERIFICATION
    // ============================================
    
    /// @notice Submit a model update with ZK proof
    /// @param roundId The training round ID
    /// @param modelUpdateIPFS IPFS hash of encrypted model weights
    /// @param zkProofHash Hash of the ZK-SNARK proof
    /// @param localAccuracy Local model accuracy (scaled by 10000)
    /// @param localLoss Local model loss (scaled by 1000000)
    /// @param samplesTrained Number of samples used for training
    function submitModelUpdate(
        uint256 roundId,
        string calldata modelUpdateIPFS,
        bytes32 zkProofHash,
        uint256 localAccuracy,
        uint256 localLoss,
        uint256 samplesTrained
    ) external onlyFLParticipant validRound(roundId) {
        FLRound storage round = flRounds[roundId];
        require(round.status == RoundStatus.Initiated || round.status == RoundStatus.Training, "Round not accepting submissions");
        require(block.timestamp < round.timeoutAt, "Round timeout exceeded");
        require(contributions[roundId][msg.sender].submittedAt == 0, "Already submitted");
        
        contributions[roundId][msg.sender] = ModelContribution({
            participant: msg.sender,
            modelUpdateIPFS: modelUpdateIPFS,
            zkProofHash: zkProofHash,
            verified: false,
            localAccuracy: localAccuracy,
            localLoss: localLoss,
            samplesTrained: samplesTrained,
            submittedAt: block.timestamp
        });
        
        round.currentParticipants++;
        round.status = RoundStatus.Training;
        
        emit ModelUpdateSubmitted(roundId, msg.sender, modelUpdateIPFS);
    }
    
    /// @notice Verify a ZK-SNARK proof (simplified on-chain verification)
    /// @dev In production, this would use a Groth16 verifier contract
    /// @param roundId The round ID
    /// @param participant The participant address
    /// @param proofHash Hash of the proof to verify
    function verifyZKProof(
        uint256 roundId,
        address participant,
        bytes32 proofHash
    ) external onlyAdmin validRound(roundId) returns (bool) {
        ModelContribution storage contribution = contributions[roundId][participant];
        require(contribution.submittedAt != 0, "No contribution found");
        require(contribution.zkProofHash == proofHash, "Proof hash mismatch");
        
        // In production, call Groth16 verifier contract:
        // address verifier = modelVerifierMapping[roundToModel[roundId]];
        // bool isValid = IVerifier(verifier).verifyProof(a, b, c, input);
        
        bool isValid = true; // Placeholder for prototype
        
        contribution.verified = isValid;
        verifiedProofs[proofHash] = isValid;
        
        emit ZKProofVerified(proofHash, participant, isValid);
        return isValid;
    }
    
    // ============================================
    // MODEL AGGREGATION
    // ============================================
    
    /// @notice Aggregate model updates using FedAvg
    /// @param roundId The round to aggregate
    /// @param aggregatedModelIPFS IPFS hash of the aggregated global model
    /// @param newAccuracy Global model accuracy after aggregation
    /// @param newLoss Global model loss after aggregation
    function aggregateModels(
        uint256 roundId,
        string calldata aggregatedModelIPFS,
        uint256 newAccuracy,
        uint256 newLoss
    ) external onlyAdmin validRound(roundId) {
        FLRound storage round = flRounds[roundId];
        require(round.status == RoundStatus.Training, "Round not ready for aggregation");
        require(round.currentParticipants >= round.minParticipants, "Not enough participants");
        
        // Verify all contributions have valid proofs
        // (In production, this check would be more thorough)
        
        round.status = RoundStatus.Aggregating;
        round.aggregatedModelIPFS = aggregatedModelIPFS;
        
        FLModel storage model = flModels[round.modelId];
        model.globalModelIPFS = aggregatedModelIPFS;
        model.accuracy = newAccuracy;
        model.loss = newLoss;
        
        emit RoundAggregated(roundId, aggregatedModelIPFS, newAccuracy);
    }
    
    /// @notice Finalize a training round
    /// @param roundId The round to finalize
    function finalizeRound(uint256 roundId) external onlyAdmin validRound(roundId) {
        FLRound storage round = flRounds[roundId];
        require(round.status == RoundStatus.Aggregating, "Round not aggregated");
        
        round.status = RoundStatus.Completed;
        round.endTime = block.timestamp;
        
        FLModel storage model = flModels[round.modelId];
        
        emit RoundCompleted(roundId, round.modelId, model.accuracy);
    }
    
    // ============================================
    // BYZANTINE ATTACK DETECTION
    // ============================================
    
    /// @notice Report a Byzantine attack (malicious contribution)
    /// @param roundId The round ID
    /// @param participant The malicious participant
    /// @param reason Reason for flagging
    function reportByzantineAttack(
        uint256 roundId,
        address participant,
        string calldata reason
    ) external onlyAdmin validRound(roundId) {
        FLParticipant storage flParticipant = flParticipants[participant];
        
        // Reduce reputation score
        if (flParticipant.reputationScore > 1000) {
            flParticipant.reputationScore -= 1000; // -10%
        }
        
        // Invalidate contribution
        contributions[roundId][participant].verified = false;
        
        emit ByzantineDetected(roundId, participant, reason);
    }
    
    // ============================================
    // REWARD DISTRIBUTION
    // ============================================
    
    /// @notice Distribute rewards to participants (placeholder for token rewards)
    /// @param roundId The completed round
    /// @param participant The participant to reward
    /// @param amount Reward amount
    function distributeReward(
        uint256 roundId,
        address participant,
        uint256 amount
    ) external onlyAdmin validRound(roundId) {
        require(flRounds[roundId].status == RoundStatus.Completed, "Round not completed");
        require(contributions[roundId][participant].verified, "Contribution not verified");
        
        FLParticipant storage flParticipant = flParticipants[participant];
        flParticipant.totalRewards += amount;
        flParticipant.totalContributions++;
        
        // In production, transfer actual tokens here
        emit RewardDistributed(participant, amount);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getModel(bytes32 modelId) external view returns (FLModel memory) {
        return flModels[modelId];
    }
    
    function getRound(uint256 roundId) external view returns (FLRound memory) {
        return flRounds[roundId];
    }
    
    function getContribution(uint256 roundId, address participant) 
        external 
        view 
        returns (ModelContribution memory) 
    {
        return contributions[roundId][participant];
    }
    
    function getParticipant(address participant) external view returns (FLParticipant memory) {
        return flParticipants[participant];
    }
    
    function getAllModels() external view returns (bytes32[] memory) {
        return modelIds;
    }
    
    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function setMinParticipants(uint256 _minParticipants) external onlyAdmin {
        minParticipantsGlobal = _minParticipants;
    }
    
    function setRoundMinParticipants(uint256 roundId, uint256 _min) external onlyAdmin validRound(roundId) {
        flRounds[roundId].minParticipants = _min;
    }
    
    function setRoundTimeout(uint256 _timeout) external onlyAdmin {
        roundTimeout = _timeout;
    }
    
    function pauseModel(bytes32 modelId) external onlyAdmin validModel(modelId) {
        flModels[modelId].isActive = false;
    }
    
    function resumeModel(bytes32 modelId) external onlyAdmin {
        require(flModels[modelId].createdAt != 0, "Model does not exist");
        flModels[modelId].isActive = true;
    }
}
