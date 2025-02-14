// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NewsFeedOracle is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    // News analysis data structure
    struct NewsAnalysis {
        string sentiment;
        string riskLevel;
        string[] keyInsights;
        uint256 timestamp;
        bool exists;
    }

    // Mapping from counterparty address to their news analysis
    mapping(address => NewsAnalysis) public counterpartyAnalysis;
    
    // Chainlink variables
    bytes32 private jobId;
    uint256 private fee;
    
    // Events
    event NewsAnalysisUpdated(
        address indexed counterparty,
        string sentiment,
        string riskLevel,
        uint256 timestamp
    );
    
    constructor(address _link, address _oracle, bytes32 _jobId) ConfirmedOwner(msg.sender) {
        setChainlinkToken(_link);
        setChainlinkOracle(_oracle);
        jobId = _jobId;
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    }
    
    function requestNewsAnalysis(
        address counterparty,
        string memory counterpartyName
    ) public returns (bytes32 requestId) {
        Chainlink.Request memory request = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );
        
        // Set the URL to perform the GET request on
        request.add("get", string(abi.encodePacked(
            "https://api.example.com/news?counterparty=",
            counterpartyName
        )));
        
        // Specify the keys to fetch from the API response
        request.add("path", "newsAnalysis");
        
        // Add the counterparty address as custom args
        request.addBytes("counterparty", abi.encodePacked(counterparty));
        
        // Send the request
        return sendChainlinkRequest(request, fee);
    }
    
    function fulfill(
        bytes32 _requestId,
        address counterparty,
        string memory sentiment,
        string memory riskLevel,
        string[] memory insights
    ) public recordChainlinkFulfillment(_requestId) {
        // Update the news analysis for the counterparty
        counterpartyAnalysis[counterparty] = NewsAnalysis({
            sentiment: sentiment,
            riskLevel: riskLevel,
            keyInsights: insights,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit NewsAnalysisUpdated(
            counterparty,
            sentiment,
            riskLevel,
            block.timestamp
        );
    }
    
    function getNewsAnalysis(address counterparty) 
        public 
        view 
        returns (
            string memory sentiment,
            string memory riskLevel,
            string[] memory keyInsights,
            uint256 timestamp,
            bool exists
        ) 
    {
        NewsAnalysis memory analysis = counterpartyAnalysis[counterparty];
        require(analysis.exists, "No analysis found for this counterparty");
        
        return (
            analysis.sentiment,
            analysis.riskLevel,
            analysis.keyInsights,
            analysis.timestamp,
            analysis.exists
        );
    }
    
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }
    
    function setOracle(address _oracle) public onlyOwner {
        setChainlinkOracle(_oracle);
    }
    
    function setJobId(bytes32 _jobId) public onlyOwner {
        jobId = _jobId;
    }
    
    function setFee(uint256 _fee) public onlyOwner {
        fee = _fee;
    }
}
