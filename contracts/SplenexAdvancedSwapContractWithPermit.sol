// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SplenexAdvancedSwapContractWithPermit
 * @dev Advanced smart contract that handles swaps with automatic gas fee tax collection
 * @notice Integrates with multiple DEX aggregators and routers, charges 50% of gas fee as tax
 * @notice SUPPORTS SINGLE SIGNATURE via ERC-2612 Permit
 */
contract SplenexAdvancedSwapContractWithPermit is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // LiFi contract address (BSC mainnet) - Updated to correct address
    address public constant LIFI_CONTRACT = 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE;

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
        uint256 amountOut,
        string dexUsed
    );
    
    // Errors
    error InvalidTokenAddress();
    error InvalidAmount();
    error SwapFailed();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidSignature();
    
    constructor(
        address _revenueWallet
    ) {
        if (_revenueWallet == address(0)) revert InvalidTokenAddress();
        
        revenueWallet = _revenueWallet;
    }
    
    /**
     * @dev Execute swap through LiFi with gas fee tax collection - SINGLE SIGNATURE
     * Uses ERC-2612 Permit for token approval
     * @param liFiCalldata Encoded LiFi swap calldata
     * @param toToken Address of the output token
     * @param minAmountOut Minimum amount expected
     * @param lifiExpectedAmount The exact native amount LiFi expects (from frontend)
     * @param permitData ERC-2612 permit data for token approval
     */
    function swapViaLiFiWithPermit(
        bytes calldata liFiCalldata,
        address toToken,
        uint256 minAmountOut,
        uint256 lifiExpectedAmount,
        PermitData calldata permitData
    ) external payable nonReentrant {
        if (toToken == address(0)) revert InvalidTokenAddress();
        
        // Read LiFi's expected amount (passed from frontend)
        uint256 lifiAmount = lifiExpectedAmount;
        
        // Calculate tax: 50% of what LiFi expects
        uint256 taxAmount = lifiAmount / 2;
        
        // Total amount user should send = LiFi amount + tax
        uint256 expectedTotal = lifiAmount + taxAmount;
        
        // Verify user sent enough
        if (msg.value < expectedTotal) revert InsufficientBalance();
        
        // Handle token permit if provided
        if (permitData.token != address(0)) {
            _handlePermit(permitData);
        }
        
        // Send exact amount to LiFi (do NOT modify their expected amount)
        (bool lifiSuccess, ) = LIFI_CONTRACT.call{value: lifiAmount}(liFiCalldata);
        if (!lifiSuccess) revert SwapFailed();
        
        // Send tax to revenue wallet
        (bool taxSuccess, ) = revenueWallet.call{value: taxAmount}("");
        if (!taxSuccess) revert TransferFailed();
        
        // Refund any excess
        uint256 excess = msg.value - expectedTotal;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            if (!refundSuccess) revert TransferFailed();
        }
        
        emit SwapExecuted(
            msg.sender,
            address(0),
            toToken,
            0,
            taxAmount,
            0,
            "lifi"
        );
    }
    
    /**
     * @dev Execute token swap through LiFi with gas fee tax collection - SINGLE SIGNATURE
     * Uses ERC-2612 Permit for token approval
     * @param tokenIn Input token address
     * @param amountIn Amount of input tokens
     * @param liFiCalldata Encoded LiFi swap calldata
     * @param toToken Output token address
     * @param minAmountOut Minimum amount expected
     * @param lifiExpectedAmount The exact native amount LiFi expects (from frontend)
     * @param permitData ERC-2612 permit data for token approval
     */
    function swapTokenViaLiFiWithPermit(
        address tokenIn,
        uint256 amountIn,
        bytes calldata liFiCalldata,
        address toToken,
        uint256 minAmountOut,
        uint256 lifiExpectedAmount,
        PermitData calldata permitData
    ) external payable nonReentrant {
        if (tokenIn == address(0) || toToken == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        // Read LiFi's expected amount (passed from frontend)
        uint256 lifiAmount = lifiExpectedAmount;
        
        // Calculate tax: 50% of what LiFi expects
        uint256 taxAmount = lifiAmount / 2;
        
        // Total amount user should send = LiFi amount + tax
        uint256 expectedTotal = lifiAmount + taxAmount;
        
        // Verify user sent enough
        if (msg.value < expectedTotal) revert InsufficientBalance();
        
        // Handle token permit for approval
        _handlePermit(permitData);
        
        // Transfer input tokens to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve LiFi to spend tokens
        IERC20(tokenIn).safeApprove(LIFI_CONTRACT, amountIn);
        
        // Send exact amount to LiFi (do NOT modify their expected amount)
        (bool lifiSuccess, ) = LIFI_CONTRACT.call{value: lifiAmount}(liFiCalldata);
        if (!lifiSuccess) revert SwapFailed();
        
        // Send tax to revenue wallet
        (bool taxSuccess, ) = revenueWallet.call{value: taxAmount}("");
        if (!taxSuccess) revert TransferFailed();
        
        // Refund any excess
        uint256 excess = msg.value - expectedTotal;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            if (!refundSuccess) revert TransferFailed();
        }
        
        emit SwapExecuted(
            msg.sender,
            tokenIn,
            toToken,
            amountIn,
            taxAmount,
            0,
            "lifi"
        );
    }
    
    /**
     * @dev Handle ERC-2612 permit for token approval
     * @param permitData The permit data including signature
     */
    function _handlePermit(PermitData calldata permitData) internal {
        if (permitData.token == address(0)) return;
        
        // Call permit function on token contract
        (bool success, bytes memory returnData) = permitData.token.call(
            abi.encodeWithSelector(
                0xd505accf, // permit(address,address,uint256,uint256,uint8,bytes32,bytes32)
                msg.sender,           // owner
                address(this),        // spender
                permitData.value,     // value
                permitData.deadline,  // deadline
                permitData.v,         // v
                permitData.r,         // r
                permitData.s          // s
            )
        );
        
        if (!success) {
            // If permit fails, revert with the return data
            assembly {
                let returnDataSize := mload(returnData)
                revert(add(32, returnData), returnDataSize)
            }
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}

// Struct for ERC-2612 permit data
struct PermitData {
    address token;
    uint256 value;
    uint256 deadline;
    uint8 v;
    bytes32 r;
    bytes32 s;
}

