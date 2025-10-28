// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SplenexSwapContract
 * @dev Smart contract that handles swaps with automatic tax collection
 * @notice Users sign and pay their own gas, contract automatically sends 50% of gas fee to revenue wallet
 */
contract SplenexSwapContract is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Revenue wallet address
    address public immutable revenueWallet;
    
    // Gas fee tax rate (50% = 5000 basis points)
    uint256 public constant GAS_FEE_TAX_RATE_BPS = 5000;
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 gasFeeTax,
        uint256 amountOut
    );
    
    event RevenueWalletUpdated(address oldWallet, address newWallet);
    
    // Errors
    error InvalidTokenAddress();
    error InvalidAmount();
    error SwapFailed();
    error InsufficientBalance();
    error TransferFailed();
    
    constructor(
        address _revenueWallet
    ) {
        if (_revenueWallet == address(0)) revert InvalidTokenAddress();
        
        revenueWallet = _revenueWallet;
    }
    
    /**
     * @dev Execute a token swap with automatic gas fee tax collection
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token  
     * @param amountIn Amount of input tokens to swap
     * @param minAmountOut Minimum amount of output tokens expected
     * @param swapData Encoded swap data for the DEX
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute the swap
        uint256 amountOut = _executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, swapData);
        
        // Calculate gas fee tax (50% of gas used)
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasFeeTax = (gasUsed * tx.gasprice * GAS_FEE_TAX_RATE_BPS) / 10000;
        
        // Send gas fee tax to revenue wallet
        if (gasFeeTax > 0) {
            (bool success, ) = revenueWallet.call{value: gasFeeTax}("");
            if (!success) revert TransferFailed();
        }
        
        // Transfer output tokens to user
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            gasFeeTax,
            amountOut
        );
    }
    
    /**
     * @dev Execute ETH swap with automatic gas fee tax collection
     * @param tokenOut Address of the output token
     * @param minAmountOut Minimum amount of output tokens expected
     * @param swapData Encoded swap data for the DEX
     */
    function swapETH(
        address tokenOut,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenOut == address(0)) revert InvalidTokenAddress();
        if (msg.value == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Execute the swap
        uint256 amountOut = _executeSwapETH(tokenOut, msg.value, minAmountOut, swapData);
        
        // Calculate gas fee tax (50% of gas used)
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasFeeTax = (gasUsed * tx.gasprice * GAS_FEE_TAX_RATE_BPS) / 10000;
        
        // Send gas fee tax to revenue wallet
        if (gasFeeTax > 0) {
            (bool success, ) = revenueWallet.call{value: gasFeeTax}("");
            if (!success) revert TransferFailed();
        }
        
        // Transfer output tokens to user
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(
            msg.sender,
            address(0), // ETH
            tokenOut,
            msg.value,
            gasFeeTax,
            amountOut
        );
    }
    
    /**
     * @dev Execute token to ETH swap with automatic gas fee tax collection
     * @param tokenIn Address of the input token
     * @param minAmountOut Minimum amount of ETH expected
     * @param swapData Encoded swap data for the DEX
     */
    function swapToETH(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenIn == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute the swap
        uint256 amountOut = _executeSwapToETH(tokenIn, amountIn, minAmountOut, swapData);
        
        // Calculate gas fee tax (50% of gas used)
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasFeeTax = (gasUsed * tx.gasprice * GAS_FEE_TAX_RATE_BPS) / 10000;
        
        // Send gas fee tax to revenue wallet
        if (gasFeeTax > 0) {
            (bool success, ) = revenueWallet.call{value: gasFeeTax}("");
            if (!success) revert TransferFailed();
        }
        
        // Transfer ETH to user
        (bool success, ) = msg.sender.call{value: amountOut}("");
        if (!success) revert TransferFailed();
        
        emit SwapExecuted(
            msg.sender,
            tokenIn,
            address(0), // ETH
            amountIn,
            gasFeeTax,
            amountOut
        );
    }
    
    /**
     * @dev Internal function to execute token-to-token swap
     */
    function _executeSwap(
        address tokenIn,
        address /* tokenOut */,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Approve the DEX router to spend tokens
        IERC20(tokenIn).safeApprove(address(this), amountIn);
        
        // Execute swap via external call (this would integrate with your DEX aggregator)
        (bool success, bytes memory returnData) = address(this).call(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Internal function to execute ETH-to-token swap
     */
    function _executeSwapETH(
        address /* tokenOut */,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Execute swap via external call
        (bool success, bytes memory returnData) = address(this).call{value: amountIn}(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Internal function to execute token-to-ETH swap
     */
    function _executeSwapToETH(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Approve the DEX router to spend tokens
        IERC20(tokenIn).safeApprove(address(this), amountIn);
        
        // Execute swap via external call
        (bool success, bytes memory returnData) = address(this).call(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Emergency function to withdraw stuck tokens (owner only)
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Withdraw ETH
            (bool success, ) = owner().call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Withdraw ERC20 tokens
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
    
    /**
     * @dev Calculate gas fee tax for a given gas usage
     * @param gasUsed Gas used in the transaction
     * @return gasFeeTax Gas fee tax amount
     */
    function calculateGasFeeTax(uint256 gasUsed) external view returns (uint256 gasFeeTax) {
        gasFeeTax = (gasUsed * tx.gasprice * GAS_FEE_TAX_RATE_BPS) / 10000;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
