const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Store all deployed addresses
    const deployedContracts = {};

    // 1. Deploy UniswapV3Factory
    // This is the core contract that creates and stores Uniswap V3 pools
    console.log("\nDeploying UniswapV3Factory...");
    const UniswapV3Factory = await ethers.getContractFactory("UniswapV3Factory");
    const factory = await UniswapV3Factory.deploy();
    await factory.deployed();
    deployedContracts.factory = factory.address;
    console.log("UniswapV3Factory deployed to:", factory.address);

    // 2. Deploy UniswapV3PoolDeployer
    // Required for pool deployment logic
    console.log("\nDeploying UniswapV3PoolDeployer...");
    const UniswapV3PoolDeployer = await ethers.getContractFactory("UniswapV3PoolDeployer");
    const poolDeployer = await UniswapV3PoolDeployer.deploy();
    await poolDeployer.deployed();
    deployedContracts.poolDeployer = poolDeployer.address;
    console.log("UniswapV3PoolDeployer deployed to:", poolDeployer.address);

    // 3. Reference the WETH9 contract
    // Base Sepolia's WETH contract is pre-deployed
    const WETH9 = '0x4200000000000000000000000000000000000006';
    deployedContracts.WETH9 = WETH9;
    console.log("\nUsing WETH9 at:", WETH9);

    console.log("\nDeploying NFTDescriptor Library...");
    const NFTDescriptor = await ethers.getContractFactory("NFTDescriptor");
    const nftDescriptor = await NFTDescriptor.deploy();
    await nftDescriptor.deployed();
    console.log("NFTDescriptor lib deployed to:", nftDescriptor.address);

    // 4. Deploy NonfungibleTokenPositionDescriptor
    // This contract handles the NFT metadata for liquidity positions
    console.log("\nDeploying NonfungibleTokenPositionDescriptor...");
    const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory(
        "NonfungibleTokenPositionDescriptor",
        {
            libraries: {
                NFTDescriptor: nftDescriptor.address, // Linking the deployed library
            },
        }
    );
    const positionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(
        WETH9,
        // Native currency symbol (ETH for Base)
        ethers.utils.formatBytes32String("ETH")
    );
    await positionDescriptor.deployed();
    deployedContracts.positionDescriptor = positionDescriptor.address;
    console.log("NonfungibleTokenPositionDescriptor deployed to:", positionDescriptor.address);

    // 5. Deploy NonfungiblePositionManager
    // This contract handles the creation and management of liquidity positions
    console.log("\nDeploying NonfungiblePositionManager...");
    const NonfungiblePositionManager = await ethers.getContractFactory(
        "NonfungiblePositionManager"
    );
    const positionManager = await NonfungiblePositionManager.deploy(
        factory.address,
        WETH9,
        positionDescriptor.address
    );
    await positionManager.deployed();
    deployedContracts.positionManager = positionManager.address;
    console.log("NonfungiblePositionManager deployed to:", positionManager.address);

    // 6. Deploy SwapRouter
    // This contract handles all swap-related functions
    console.log("\nDeploying SwapRouter...");
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy(
        factory.address,
        WETH9
    );
    await swapRouter.deployed();
    deployedContracts.swapRouter = swapRouter.address;
    console.log("SwapRouter deployed to:", swapRouter.address);

    // 7. Deploy Quoter
    // This contract is used to get quotes for trades
    // console.log("\nDeploying QuoterV2...");
    // const Quoter = await ethers.getContractFactory("QuoterV2");
    // const quoter = await Quoter.deploy(
    //     factory.address,
    //     WETH9
    // );
    // await quoter.deployed();
    // deployedContracts.quoter = quoter.address;
    // console.log("QuoterV2 deployed to:", quoter.address);

    // 8. Deploy TickLens
    // This contract is used to read tick data from pools
    console.log("\nDeploying TickLens...");
    const TickLens = await ethers.getContractFactory("TickLens");
    const tickLens = await TickLens.deploy();
    await tickLens.deployed();
    deployedContracts.tickLens = tickLens.address;
    console.log("TickLens deployed to:", tickLens.address);

    // Save deployment addresses
    const fs = require('fs');
    const deploymentPath = './deployments';
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath);
    }

    fs.writeFileSync(
        'deployments/base-sepolia.json',
        JSON.stringify({
            networkName: "Base Sepolia",
            chainId: 84532,
            deploymentDate: new Date().toISOString(),
            contracts: deployedContracts
        }, null, 2)
    );

    console.log("\nDeployment Complete! Contract addresses saved to deployments/base-sepolia.json");
    
    // Verify contract deployment by checking initialization
    console.log("\nVerifying deployments...");
    
    // Check if factory owner is set correctly
    const factoryOwner = await factory.owner();
    console.log("Factory owner:", factoryOwner);
    
    // Check if position manager is properly initialized
    const factoryFromManager = await positionManager.factory();
    console.log("Factory address in PositionManager:", factoryFromManager);
    
    // Check if router is properly initialized
    const factoryFromRouter = await swapRouter.factory();
    console.log("Factory address in SwapRouter:", factoryFromRouter);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });