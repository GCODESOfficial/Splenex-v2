// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

 /**
  * @title SplenexAdvancedSwapContract
  * @dev Advanced smart contract that handles swaps with automatic gas fee tax collection
  * @notice Integrates with multiple DEX aggregators and routers, charges 50% of gas fee as tax
  */
contract SplenexAdvancedSwapContract is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // LiFi contract address (BSC mainnet) - Updated to correct address
    address public constant LIFI_CONTRACT = 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE;

    // Revenue wallet address
    address public immutable revenueWallet;
    
    // Gas fee tax rate (50% = 5000 basis points)
    uint256 public constant GAS_FEE_TAX_RATE_BPS = 5000;
    
    // DEX Router addresses for different chains
    mapping(uint256 => mapping(string => address)) public dexRouters;
    
    // Supported DEX names
    string[] public supportedDEXes;
    
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
    
    event DEXRouterUpdated(uint256 chainId, string dexName, address router);
    
    // Errors
    error InvalidTokenAddress();
    error InvalidAmount();
    error SwapFailed();
    error InsufficientBalance();
    error TransferFailed();
    error UnsupportedDEX();
    error InvalidRouter();
    
    constructor(
        address _revenueWallet
    ) {
        if (_revenueWallet == address(0)) revert InvalidTokenAddress();
        
        revenueWallet = _revenueWallet;
        
        // Initialize supported DEXes
        supportedDEXes = [
            "pancakeSwapV2",
            "uniswapV2", 
            "sushiswap",
            "quickswap",
            "traderjoe",
            "spiritswap",
            "spookyswap",
            "apeswap",
            "biswap",
            "mdex"
        ];
    }
    
    /**
     * @dev Execute a token swap with automatic gas fee tax collection using specific DEX
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token  
     * @param amountIn Amount of input tokens to swap
     * @param minAmountOut Minimum amount of output tokens expected
     * @param dexName Name of the DEX to use
     * @param swapData Encoded swap data for the DEX
     */
    function swapWithDEX(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute the swap
        uint256 amountOut = _executeSwapWithDEX(tokenIn, tokenOut, amountIn, minAmountOut, dexName, swapData);
        
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
            amountOut,
            dexName
        );
    }
    
    /**
     * @dev Execute ETH swap with automatic gas fee tax collection using specific DEX
     * @param tokenOut Address of the output token
     * @param minAmountOut Minimum amount of output tokens expected
     * @param dexName Name of the DEX to use
     * @param swapData Encoded swap data for the DEX
     */
    function swapETHWithDEX(
        address tokenOut,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenOut == address(0)) revert InvalidTokenAddress();
        if (msg.value == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Execute the swap
        uint256 amountOut = _executeSwapETHWithDEX(tokenOut, msg.value, minAmountOut, dexName, swapData);
        
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
            address(0),
            tokenOut,
            msg.value,
            gasFeeTax,
            amountOut,
            dexName
        );
    }
    
    /**
     * @dev Execute token to ETH swap with automatic gas fee tax collection using specific DEX
     * @param tokenIn Address of the input token
     * @param amountIn Amount of input tokens to swap
     * @param minAmountOut Minimum amount of ETH expected
     * @param dexName Name of the DEX to use
     * @param swapData Encoded swap data for the DEX
     */
    function swapToETHWithDEX(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (tokenIn == address(0)) revert InvalidTokenAddress();
        if (amountIn == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute the swap
        uint256 amountOut = _executeSwapToETHWithDEX(tokenIn, amountIn, minAmountOut, dexName, swapData);
        
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
            address(0),
            amountIn,
            gasFeeTax,
            amountOut,
            dexName
        );
    }
    
    /**
     * @dev Internal function to execute token-to-token swap with specific DEX
     */
    function _executeSwapWithDEX(
        address tokenIn,
        address /* tokenOut */,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Get router address for current chain
        address router = dexRouters[block.chainid][dexName];
        if (router == address(0)) revert UnsupportedDEX();
        
        // Approve the DEX router to spend tokens
        IERC20(tokenIn).safeApprove(router, amountIn);
        
        // Execute swap via router
        (bool success, bytes memory returnData) = router.call(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Internal function to execute ETH-to-token swap with specific DEX
     */
    function _executeSwapETHWithDEX(
        address /* tokenOut */,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Get router address for current chain
        address router = dexRouters[block.chainid][dexName];
        if (router == address(0)) revert UnsupportedDEX();
        
        // Execute swap via router
        (bool success, bytes memory returnData) = router.call{value: amountIn}(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Internal function to execute token-to-ETH swap with specific DEX
     */
    function _executeSwapToETHWithDEX(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Get router address for current chain
        address router = dexRouters[block.chainid][dexName];
        if (router == address(0)) revert UnsupportedDEX();
        
        // Approve the DEX router to spend tokens
        IERC20(tokenIn).safeApprove(router, amountIn);
        
        // Execute swap via router
        (bool success, bytes memory returnData) = router.call(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Multi-hop swap with automatic gas fee tax collection
     * @param path Array of token addresses representing the swap path
     * @param amountIn Amount of input tokens to swap
     * @param minAmountOut Minimum amount of output tokens expected
     * @param dexName Name of the DEX to use
     * @param swapData Encoded swap data for the DEX
     */
    function multiHopSwap(
        address[] calldata path,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) external payable nonReentrant {
        if (path.length < 2) revert InvalidAmount();
        if (amountIn == 0) revert InvalidAmount();
        
        // Store gas price at start of transaction
        uint256 gasStart = gasleft();
        
        // Transfer tokens from user to this contract
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Execute the multi-hop swap
        uint256 amountOut = _executeMultiHopSwap(path, amountIn, minAmountOut, dexName, swapData);
        
        // Calculate gas fee tax (50% of gas used)
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasFeeTax = (gasUsed * tx.gasprice * GAS_FEE_TAX_RATE_BPS) / 10000;
        
        // Send gas fee tax to revenue wallet
        if (gasFeeTax > 0) {
            (bool success, ) = revenueWallet.call{value: gasFeeTax}("");
            if (!success) revert TransferFailed();
        }
        
        // Transfer output tokens to user
        IERC20(path[path.length - 1]).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(
            msg.sender,
            path[0],
            path[path.length - 1],
            amountIn,
            gasFeeTax,
            amountOut,
            dexName
        );
    }
    
    /**
     * @dev Internal function to execute multi-hop swap
     */
    function _executeMultiHopSwap(
        address[] calldata path,
        uint256 amountIn,
        uint256 minAmountOut,
        string calldata dexName,
        bytes calldata swapData
    ) internal returns (uint256 amountOut) {
        // Get router address for current chain
        address router = dexRouters[block.chainid][dexName];
        if (router == address(0)) revert UnsupportedDEX();
        
        // Approve the DEX router to spend tokens
        IERC20(path[0]).safeApprove(router, amountIn);
        
        // Execute multi-hop swap via router
        (bool success, bytes memory returnData) = router.call(swapData);
        if (!success) revert SwapFailed();
        
        // Get the actual amount out from the swap
        amountOut = abi.decode(returnData, (uint256));
        if (amountOut < minAmountOut) revert SwapFailed();
        
        return amountOut;
    }
    
    /**
     * @dev Add or update DEX router address (owner only)
     * @param chainId Chain ID
     * @param dexName Name of the DEX
     * @param routerAddress Router contract address
     */
    function updateDEXRouter(
        uint256 chainId,
        string calldata dexName,
        address routerAddress
    ) external onlyOwner {
        if (routerAddress == address(0)) revert InvalidRouter();
        
        dexRouters[chainId][dexName] = routerAddress;
        
        emit DEXRouterUpdated(chainId, dexName, routerAddress);
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
    
    /**
     * @dev Get supported DEXes for current chain
     * @return Array of supported DEX names
     */
    function getSupportedDEXes() external view returns (string[] memory) {
        return supportedDEXes;
    }
    
    /**
     * @dev Check if DEX is supported on current chain
     * @param dexName Name of the DEX
     * @return True if supported
     */
    function isDEXSupported(string calldata dexName) external view returns (bool) {
        return dexRouters[block.chainid][dexName] != address(0);
    }
    
    /**
     * @dev Get router address for specific DEX on current chain
     * @param dexName Name of the DEX
     * @return Router address
     */
    function getDEXRouter(string calldata dexName) external view returns (address) {
        return dexRouters[block.chainid][dexName];
    }
    
    /**
     * @dev Execute swap through LiFi with gas fee tax collection
     * Reads LiFi's expected amount, adds 50% as tax, sends exact amount to LiFi
     * @param liFiCalldata Encoded LiFi swap calldata
     * @param toToken Address of the output token
     * @param minAmountOut Minimum amount expected
     * @param lifiExpectedAmount The exact native amount LiFi expects (from frontend)
     */
    function swapViaLiFi(
        bytes calldata liFiCalldata,
        address toToken,
        uint256 minAmountOut,
        uint256 lifiExpectedAmount
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
     * @dev Execute token swap through LiFi with gas fee tax collection
     * @param tokenIn Input token address
     * @param amountIn Amount of input tokens
     * @param liFiCalldata Encoded LiFi swap calldata
     * @param toToken Output token address
     * @param minAmountOut Minimum amount expected
     * @param lifiExpectedAmount The exact native amount LiFi expects (from frontend)
     */
    function swapTokenViaLiFi(
        address tokenIn,
        uint256 amountIn,
        bytes calldata liFiCalldata,
        address toToken,
        uint256 minAmountOut,
        uint256 lifiExpectedAmount
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
    
    // Allow contract to receive ETH
    receive() external payable {}
}
