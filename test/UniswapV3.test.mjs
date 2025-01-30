// test/DeployedUniswap.test.js
import { expect } from "chai";
// import { ethers } from "hardhat";
import pkg from 'hardhat';
const { ethers } = pkg;
import fs from "fs";
const deployedData = JSON.parse(fs.readFileSync(new URL("../deployments/base-sepolia.json", import.meta.url)));
const deployedAddresses = deployedData.contracts;


//import '../contracts/token.sol';

// contracts/MockERC20.sol
// SPDX-License-Identifier: MIT
// pragma solidity ^0.7.6;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// console.log("1");

// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol) ERC20(name, symbol) {
//         console.log("2");
//         _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens
//     }

//     function mint(address to, uint256 amount) public {
//         _mint(to, amount);
//     }
// }
console.log("3");

describe("Deployed Uniswap V3 Tests", function() {
    let factory;
    let swapRouter;
    let nonfungiblePositionManager;
    let quoter;
    let tokenA;
    let tokenB;
    let owner;
    const FEE_TIER = 3000; // 0.3%

    before(async function() {
        console.log("Running before hook...");
        [owner] = await ethers.getSigners();

        // Get your deployed contracts addresses
        const deployedAddresses = deployedData.contracts;


        // Connect to existing contracts
        factory = await ethers.getContractAt("@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol:IUniswapV3Factory", deployedAddresses.factory);
        swapRouter = await ethers.getContractAt("ISwapRouter", deployedAddresses.swapRouter);
        nonfungiblePositionManager = await ethers.getContractAt("INonfungiblePositionManager", deployedAddresses.positionManager);
        quoter = await ethers.getContractAt("IQuoterV2", deployedAddresses.quoter);

        // Deploy test tokens for our tests
        // const MockERC20 = await ethers.getContractFactory("MockERC20");
        tokenA = await ethers.getContractAt("MockERC20", deployedAddresses.tokenA);
        tokenB = await ethers.getContractAt("MockERC20", deployedAddresses.tokenB);
        // console.log("Token A Address:", tokenA.address);
        // console.log("Token B Address:", tokenB.address);


        // Approve tokens
        await tokenA.approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
        await tokenB.approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
        await tokenA.approve(swapRouter.address, ethers.constants.MaxUint256);
        await tokenB.approve(swapRouter.address, ethers.constants.MaxUint256);

        // Sort tokens by address (required by Uniswap V3)
        if (tokenA.address.toLowerCase() > tokenB.address.toLowerCase()) {
            [tokenA, tokenB] = [tokenB, tokenA];
        }
    });

    // it("should verify factory is operational", async function() {
    //     // Verify factory exists and can create pools
    //     const x = await factory.functions.owner();
    //     console.log("Test started: Verifying factory", x);
    //     expect(await factory.callStatic.owner()).to.not.equal(ethers.constants.AddressZero);
    // });

    it("should verify factory is operational", async function() {
        try {
            // Check if we can connect to the contract
            console.log("Factory address:", factory.address);
            
            // Check if there's code at the address
            const code = await ethers.provider.getCode(factory.address);
            console.log("Contract code exists at address:", code !== "0x");
            
            // Check the signer
            console.log("Signer address:", owner.address);
            console.log("Connected to network:", await ethers.provider.getNetwork());
            
            // Try calling owner() directly
            const ownerResult = await factory.functions.owner();
            console.log("Owner result:", ownerResult);
            
        } catch (error) {
            console.log("Error details:", {
                message: error.message,
                code: error.code,
                data: error.data,
                transaction: error.transaction
            });
            throw error;
        }
    });

    it("should create pool and provide liquidity", async function() {
        // Create pool
        await factory.createPool(tokenA.address, tokenB.address, FEE_TIER);
        
        const poolAddress = await factory.getPool(tokenA.address, tokenB.address, FEE_TIER);
        expect(poolAddress).to.not.equal(ethers.constants.AddressZero);

        // Initialize pool
        const pool = await ethers.getContractAt("IUniswapV3Pool", poolAddress);
        await pool.initialize(encodePriceSqrt("1", "1")); // 1:1 price

        // Add liquidity
        const mintParams = {
            token0: tokenA.address,
            token1: tokenB.address,
            fee: FEE_TIER,
            tickLower: -887220, // Roughly price range 0.01 to 100
            tickUpper: 887220,
            amount0Desired: ethers.utils.parseEther("100"),
            amount1Desired: ethers.utils.parseEther("100"),
            amount0Min: 0,
            amount1Min: 0,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 10
        };

        const tx = await nonfungiblePositionManager.mint(mintParams);
        const receipt = await tx.wait();

        // Check if liquidity was added
        const mintEvent = receipt.events.find(event => event.event === "IncreaseLiquidity");
        expect(mintEvent).to.not.be.undefined;
    });

    it("should get quote from quoter", async function() {
        const amountIn = ethers.utils.parseEther("1");
        
        const params = {
            tokenIn: tokenA.address,
            tokenOut: tokenB.address,
            fee: FEE_TIER,
            amountIn: amountIn,
            sqrtPriceLimitX96: 0
        };

        const quote = await quoter.callStatic.quoteExactInputSingle(params);
        expect(quote.amountOut).to.be.gt(0);
    });

    it("should execute swap", async function() {
        const amountIn = ethers.utils.parseEther("1");
        
        const params = {
            tokenIn: tokenA.address,
            tokenOut: tokenB.address,
            fee: FEE_TIER,
            recipient: owner.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 10,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        };

        const balanceBefore = await tokenB.balanceOf(owner.address);
        await swapRouter.exactInputSingle(params);
        const balanceAfter = await tokenB.balanceOf(owner.address);

        expect(balanceAfter.sub(balanceBefore)).to.be.gt(0);
    });
});

// Helper function for price encoding
function encodePriceSqrt(reserve1, reserve0) {
    return ethers.BigNumber.from(
        Math.floor(
            Math.sqrt(parseInt(reserve1) / parseInt(reserve0)) * 2 ** 96
        )
    );
}