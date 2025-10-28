// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SplenexRevenueCollector
 * @dev Simple contract that receives ETH and automatically splits it between swap and tax
 * @notice This contract receives the total value and automatically sends tax to revenue wallet
 */
contract SplenexRevenueCollector {
    address public immutable revenueWallet;
    address public immutable owner;
    
    event RevenueCollected(address indexed user, uint256 taxAmount, uint256 swapAmount);
    
    constructor(address _revenueWallet) {
        require(_revenueWallet != address(0), "Invalid revenue wallet");
        revenueWallet = _revenueWallet;
        owner = msg.sender;
    }
    
    /**
     * @dev Receive ETH and automatically split between tax and swap
     * @notice This function is called when ETH is sent to this contract
     */
    receive() external payable {
        // Calculate tax as 5% of the total value (simplified)
        uint256 taxAmount = msg.value / 20; // 5%
        uint256 swapAmount = msg.value - taxAmount;
        
        // Send tax to revenue wallet
        if (taxAmount > 0) {
            (bool success, ) = revenueWallet.call{value: taxAmount}("");
            require(success, "Failed to send tax to revenue wallet");
        }
        
        // Forward remaining amount back to sender (this completes the swap)
        if (swapAmount > 0) {
            (bool success, ) = msg.sender.call{value: swapAmount}("");
            require(success, "Failed to forward swap amount");
        }
        
        emit RevenueCollected(msg.sender, taxAmount, swapAmount);
    }
    
    /**
     * @dev Function to withdraw stuck funds (owner only)
     */
    function withdrawStuckFunds() external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Failed to withdraw funds");
    }
}