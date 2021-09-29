import { channelsBaseProvider } from "../../../earn/baseproviders/channels.provider";
import { fildaBaseProvider } from "../../../earn/baseproviders/filda.provider";
import { EarnProvider } from "../../../earn/earnprovider";

// https://docs.filda.io/zhong-wen/xiang-mu-jie-shao/ftoken-zeng-yi-zi-chan/jian-jie-intro
export const hecoMainnetFildaEarnProvider = new EarnProvider(fildaBaseProvider,
  // compound coins
  [
    { cContract: "0x824151251B38056d54A15E56B73c54ba44811aF8" }, // fHT
    { cContract: "0x043aFB65e93500CE5BCbf5Bbb41FC1fDcE2B7518", underlyingERC20Contract: "0xae3a768f9ab104c69a7cd6041fe16ffa235d1810" }, // fHFIL
    { cContract: "0xB16Df14C53C4bcfF220F4314ebCe70183dD804c0", underlyingERC20Contract: "0x0298c2b32eae4da002a15f36fdf7615bea3da047" }, // fHUSD
    { cContract: "0xF2a308d3Aea9bD16799A5984E20FDBfEf6c3F595", underlyingERC20Contract: "0x66a79d23e58475d2738179ca52cd0b41d73f0bea" }, // fHBTC
    { cContract: "0x033f8c30bb17b47f6f1f46f3a42cc9771ccbcaae", underlyingERC20Contract: "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd" }, // fETH
    { cContract: "0x749E0198f12559E7606987F8e7bD3AA1DE6d236E", underlyingERC20Contract: "0xe499ef4616993730ced0f31fa2703b92b50bb536" }, // fHPT
    { cContract: "0xCca471B0d49c0d4835a5172Fd97ddDEA5C979100", underlyingERC20Contract: "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3" }, // fHDOT
    { cContract: "0x09e3d97A7CFbB116B416Dae284f119c1eC3Bd5ea", underlyingERC20Contract: "0xef3cebd77e0c52cb6f60875d9306397b5caca375" }, // fHBCH
    { cContract: "0x4937A83Dc1Fa982e435aeB0dB33C90937d54E424", underlyingERC20Contract: "0xecb56cf772b5c9a6907fb7d32387da2fcbfb63b4" }, // fHLTC
    { cContract: "0xAab0C9561D5703e84867670Ac78f6b5b4b40A7c1", underlyingERC20Contract: "0xa71edc38d189767582c38a3145b5873052c3e47a" }, // fUSDT
    { cContract: "0x74f8d9b701bd4d8ee4ec812af82c71eb67b9ec75", underlyingERC20Contract: "0xc2cb6b5357ccce1b99cd22232942d9a225ea4eb1" }, // fHBSV
    { cContract: "0xfea846a1284554036ac3191b5dfd786c0f4db611", underlyingERC20Contract: "0x45e97dad828ad735af1df0473fc2735f0fd5330c" }, // fHXTZ
    { cContract: "0x73Fa2931e060F7d43eE554fd1De7F61115fE1751", underlyingERC20Contract: "0x202b4936fe1a82a4965220860ae46d7d3939bb25" }, // fAAVE
    { cContract: "0xAc9E3AE0C188eb583785246Fef37AEF9ea159fb7", underlyingERC20Contract: "0x22c54ce8321a4015740ee1109d9cbc25815c46e6" }, // fUNI
    { cContract: "0x88962975FDE8C7805fE0f38b7c91C18f4d55bb40", underlyingERC20Contract: "0x777850281719d5a96c29812ab72f822e0e09f3da" }, // fSNX
    { cContract: "0x5788c014d41ca706de03969e283ee7b93827b7b1", underlyingERC20Contract: "0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c" }, // fMDX
    { cContract: "0x92701DA6A28Ca70aA5Dfca2B8Ae2b4B8a22a0C11", underlyingERC20Contract: "0x6514a5ebff7944099591ae3e8a5c0979c83b2571" }, // fNEO
  ],
  // additional coins
  [
    "0xe36ffd17b2661eb57144ceaef942d95295e637f0" // Filda token itself - can be staked, but not as compound, just in DAO
  ]
);

// https://channelsofficial.gitbook.io/channels-finance-english/overview/introduction-1/ctoken-smart-contract-address
export const hecoMainnetChannelsEarnProvider = new EarnProvider(channelsBaseProvider,
  // compound coins
  [
    { cContract: "0x397c6D1723360CC1c317CdC9B2E926Ae29626Ff3" }, // cHT
    { cContract: "0x9a57eAB16d371048c56cbE0c4D608096aEC5b405", underlyingERC20Contract: "0x0298c2b32eae4da002a15f36fdf7615bea3da047" }, // cHUSD
    { cContract: "0x01371C08E2AE6F78D42c9796FA20DDb245Df3885", underlyingERC20Contract: "0x64ff637fb478863b7468bc97d30a5bf3a428a1fd" }, // cETH
    { cContract: "0x8feFb583e077de36F68444a14E68172b01e27dD7", underlyingERC20Contract: "0x66a79d23e58475d2738179ca52cd0b41d73f0bea" }, // cHTBC
    { cContract: "0x3465BCF382A41cf90FF4eadC593a053f71062f91", underlyingERC20Contract: "0xe499ef4616993730ced0f31fa2703b92b50bb536" }, // cHPT
    { cContract: "0x3dA74C09ccb8faBa3153b7f6189dDA9d7F28156A", underlyingERC20Contract: "0xa71edc38d189767582c38a3145b5873052c3e47a" }, // cUSDT
    { cContract: "0x656bc55088A29C99ad7A340EdB5B9C89BDC7ecEc", underlyingERC20Contract: "0xa2c49cee16a5e5bdefde931107dc1fae9f7773e3" }, // cHDOT
    { cContract: "0x2482aE8baA55d36033c1900dA5979a85c527684c", underlyingERC20Contract: "0xef3cebd77e0c52cb6f60875d9306397b5caca375" }, // cHBCH
    { cContract: "0xC90cd094A5Abbd77C5FF14f374f103024D435022", underlyingERC20Contract: "0xecb56cf772b5c9a6907fb7d32387da2fcbfb63b4" }, // cHLTC
    { cContract: "0xF0D21c5c5Da662307195ac667d53f2aA28e7755F", underlyingERC20Contract: "0xae3a768f9ab104c69a7cd6041fe16ffa235d1810" }, // cHFIL
    { cContract: "0x9A0d6C2fc560F796c3889DE89f0a9C6fA1aa41b2", underlyingERC20Contract: "0x25d2e80cb6b86881fd7e07dd263fb79f4abe033c" }, // cMDX
    { cContract: "0x0BE09466b6381dd0aBe83F92f580A7f70D6443aC", underlyingERC20Contract: "0xb6f4c418514dd4680f76d5caa3bb42db4a893acb" }, // cBETH
    { cContract: "0x3bBA2f019F48FcEa617a990154e2D1B7bebc1f7b", underlyingERC20Contract: "0x22c54ce8321a4015740ee1109d9cbc25815c46e6" }, // cUNI"
    { cContract: "0xAfe9fA588121Cd370E6c3FCa6c3D83Ca5AD438D8", underlyingERC20Contract: "0x9e004545c59d359f6b7bfb06a26390b087717b42" }, // cLINK"
    { cContract: "0xd11eEbE1eEAC6933fdc5b7124A3153030153Cd4c", underlyingERC20Contract: "0xb4f019beac758abbee2f906033aaa2f0f6dacb35" }, // cYFI
    { cContract: "0xE573302fbe7b9EA8473cfC240E2AFb9fAf13d7CA", underlyingERC20Contract: "0x9362bbef4b8313a8aa9f0c9808b80577aa26b73b" }, // cUSDC
    { cContract: "0xF674C32AC68057f3C54a212599F9d9fc822A5644", underlyingERC20Contract: "0x3d760a45d0887dfd89a2f5385a236b29cb46ed2a" }, // cDAI
    { cContract: "0xf89aB83BE833270C1c5eec42BFC8D38Eb9AC1f48", underlyingERC20Contract: "0x843af718ef25708765a8e0942f89edeae1d88df0" }, // cADA
    { cContract: "0x8d6e77138CCEe664669A46d9a1E9780E37e2E4f9", underlyingERC20Contract: "0xa2f3c2446a3e20049708838a779ff8782ce6645a" }, // cXRP
    { cContract: "0xE022Bed0A19e5930296739069Fcd65434F8c41e8", underlyingERC20Contract: "0x5ee41ab6edd38cdfb9f6b4e6cf7f75c87e170d98" }, // cTUSD
  ],
  // additional coins
  [
    "0xd5F9bdc2e6c8EE0484a6293ce7FA97d96a5e1012" // CAN token itself
  ],
  "https://app.channels.finance"
);