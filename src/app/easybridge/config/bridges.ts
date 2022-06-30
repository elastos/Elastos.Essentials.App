import { Bridge } from "../model/bridge";

// Refer to bridge token list for minTx on individual tokens
export const availableBridges: { [bridgeKey: string]: Bridge } = {
  '1_20': {
    native: {
      '1': {
        contract: '0xf127003ea39878EFeEE89aA4E22248CC6cb7728E',
        fee: 0,
      },
      '20': {
        contract: '0x314dfec1Fb4de1e0Be70F260d0a065E497f7E2eB', // 0x88723077663F9e24091D2c30c2a2cE213d9080C6',
        fee: 0,
      },
    },
    token: {
      '1': {
        contract: '0xfBec16ac396431162789FF4b5f65F47978988D7f',
        fee: 0,
      },
      '20': {
        contract: '0xe6fd75ff38Adca4B97FBCD938c86b98772431867', // 0x6Ae6B30F6bb361136b0cC47fEe25E44B7d58605c',
        fee: 0,
      },
    },
  },
  '20_1': {
    native: {
      '1': {
        contract: '0x88723077663F9e24091D2c30c2a2cE213d9080C6', // 0x314dfec1Fb4de1e0Be70F260d0a065E497f7E2eB',
        fee: 1,
      },
      '20': {
        contract: '0xE235CbC85e26824E4D855d4d0ac80f3A85A520E4',
        fee: 0,
      },
    },
    token: {
      '1': {
        contract: '0x6Ae6B30F6bb361136b0cC47fEe25E44B7d58605c', // 0xe6fd75ff38Adca4B97FBCD938c86b98772431867',
        fee: 1,
      },
      '20': {
        contract: '0x0054351c99288D37B96878EDC2319ca006c8B910',
        fee: 1,
      },
    },
  },
  '128_20': {
    native: {
      '20': {
        contract: '0x5e071258254c85B900Be01F6D7B3f8F34ab219e7', // token 0xa1ecFc2beC06E4b43dDd423b94Fef84d0dBc8F5c
        fee: 0.1,
      },
      '128': {
        contract: '0x4490ee96671855BD0a52Eb5074EC5569496c0162',
        fee: 0.1, // percent
      },
    },
    token: {
      '20': {
        contract: '0x6683268d72eeA063d8ee17639cC9B7C317d1734a',
        fee: 0,
      },
      '128': {
        contract: '0x323b5913dadd3e61e5242Fe44781cb7Dd4BE7EB8',
        fee: 0,
      },
    },
  },
  '20_128': {
    native: {
      '20': {
        contract: '0x74efe86928abe5bCD191f2e6C85b01861ea1C17d',
        fee: 0.1,
      },
      '128': {
        contract: '0x5acCF25F5722A6ed0606C02AA5d8cFe27F346e1B', // token 0xeceefC50f9aAcF0795586Ed90a8b9E24f55Ce3F3
        fee: 0.1,
      },
    },
    token: {
      '20': {
        contract: '0x59F65A3913F1FFcE7aB684bd8c24ba3790bD376B',
        fee: 0,
      },
      '128': {
        contract: '0x3394577F74B86b9FD4D6e1D8a66c668bC6188379',
        fee: 0,
      },
    },
  },
  '20_56': {
    native: {
      '20': {
        contract: '0x1135BB7CEc7980f0d65741Def1e8Ab054AB4d651',
        fee: 0.1,
      },
      '56': {
        contract: '0x6EA7481f1096E822574a54188578d1708F64C828',
        fee: 0.1,
      },
    },
    token: {
      '20': {
        contract: '0xfBeAFe09cC2C3B9A73A8bFDA46896D1302a90F0c',
        fee: 0.1,
      },
      '56': {
        contract: '0x4Ca8abd60D88a0C35071d535e26E1cB2928fC45C',
        fee: 0.1,
      },
    },
  },
  '56_20': {
    native: {
      '20': {
        contract: '0x680424c82208DB896EdC78DD79a0a352468dd3DF',
        fee: 0.1,
      },
      '56': {
        contract: '0x5a70075aC335c8e99BF8c27760dD1001190A8032',
        fee: 0,
      },
    },
    token: {
      '20': {
        contract: '0x11262aB418C2d2926F5afb1e3D6e88d86B3C9017',
        fee: 0,
      },
      '56': {
        contract: '0x3174937C38ba343faBAC64b51a9C91b3e261BBEd',
        fee: 0,
      },
    },
  }
}
