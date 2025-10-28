// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RevenueSplitter
 * @dev Contract that splits swap transactions between the original recipient and revenue wallet
 */
contract RevenueSplitter {
    address public constant REVENUE_WALLET = 0xD9BD71AA48872430c54730a2D412918aB01cB1cC;
    uint256 public constant REVENUE_PERCENTAGE = 50; // 50% of gas fee goes to revenue wallet
    
    event RevenueSplit(
        address indexed user,
        address indexed originalRecipient,
        uint256 originalAmount,
        uint256 revenueAmount,
        uint256 totalAmount
    );
    
    /**
     * @dev Fallback function to receive ETH and split it
     */
    receive() external payable {
        require(msg.value > 0, "No value sent");
        
        // Calculate revenue split (50% of the amount)
        uint256 revenueAmount = (msg.value * REVENUE_PERCENTAGE) / 100;
        uint256 originalAmount = msg.value - revenueAmount;
        
        // Send revenue to revenue wallet
        if (revenueAmount > 0) {
            (bool success, ) = REVENUE_WALLET.call{value: revenueAmount}("");
            require(success, "Revenue transfer failed");
        }
        
        // Send original amount back to sender (this would be the swap amount)
        if (originalAmount > 0) {
            (bool success, ) = msg.sender.call{value: originalAmount}("");
            require(success, "Original amount transfer failed");
        }
        
        emit RevenueSplit(
            msg.sender,
            REVENUE_WALLET,
            originalAmount,
            revenueAmount,
            msg.value
        );
    }
    
    /**
     * @dev Function to split a specific amount
     * @param recipient The original recipient of the funds
     */
    function splitRevenue(address recipient) external payable {
        require(msg.value > 0, "No value sent");
        require(recipient != address(0), "Invalid recipient");
        
        // Calculate revenue split (50% of the amount)
        uint256 revenueAmount = (msg.value * REVENUE_PERCENTAGE) / 100;
        uint256 originalAmount = msg.value - revenueAmount;
        
        // Send revenue to revenue wallet
        if (revenueAmount > 0) {
            (bool success, ) = REVENUE_WALLET.call{value: revenueAmount}("");
            require(success, "Revenue transfer failed");
        }
        
        // Send original amount to recipient
        if (originalAmount > 0) {
            (bool success, ) = recipient.call{value: originalAmount}("");
            require(success, "Original amount transfer failed");
        }
        
        emit RevenueSplit(
            msg.sender,
            recipient,
            originalAmount,
            revenueAmount,
            msg.value
        );
    }
    
    /**
     * @dev Get the revenue wallet address
     */
    function getRevenueWallet() external pure returns (address) {
        return REVENUE_WALLET;
    }
    
    /**
     * @dev Get the revenue percentage
     */
    function getRevenuePercentage() external pure returns (uint256) {
        return REVENUE_PERCENTAGE;
    }
}
