// require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-ethers");
// require('dotenv').config();

// module.exports = {
//   solidity: {
//     version: "0.7.6",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200
//       }
//     }
//   },
  
//   networks: {
//     "base-sepolia": {
//       url: process.env.BASE_SEPOLIA_RPC_URL,
//       accounts: [process.env.PRIVATE_KEY],
//       gasPrice: 'auto',
//       chainId: 84532
//     }
//   }
// };

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
};