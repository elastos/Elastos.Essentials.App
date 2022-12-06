export const zh = {

    'wallet': {
        /******************
        * Generic Actions *
        *******************/
        "send-to": "发送到",
        "enter-name": "输入名称",
        "enter-amount": "输入金额",
        "total-amount": "总额",
        "advanced-options": "高级选项",
        "recharge": "侧链充值",
        "withdraw": "主链提现",
        "send": "发送",
        "from": "从",
        "to": "至",
        "amount": "金额",
        "exit": "退出",
        'click-to-load-more': "点击加载更多",
        'transaction-fail': '交易失败',
        "confirmTitle": "确定？",
        "refresh-pulling-text": "更新钱包",
        "refresh-refreshing-text": "正在更新...",
        "intent-select-wallet": "请选择钱包",
        "personal-wallets-with": "含有 {{ subwalletSymbol }} 的个人钱包",
        "find-new-token": "有新的代币",
        "find-new-token-msg": "在 {{ network }} 上发现新的代币 {{ token }}",
        "find-new-tokens-msg": "在 {{ network }} 上发现 {{ count }} 个新的代币 ",
        "nft-name": "名称",
        "nft-description": "描述",

        /*******************
        * Generic Messages *
        ********************/
        "copied": "已复制到剪切板！",
        'text-did-balance-not-enough': '在链上写入DID信息需要少量的ELA来支付费用。请先从主钱包中将ELA（例如：0.1 ELA）充值到EID侧链！',
        'amount-null': "请输入交易金额",
        "amount-invalid": "请输入正确的金额",
        'eth-insuff-balance': '您必须有足够的 {{ coinName }} 来支付gas费，才能发送ERC20代币',
        "sync-completed": "已完成同步",
        "not-a-valid-address": "地址无效",
        "transaction-pending": "前一个交易正在确认中，请等待此交易确认后再执行",
        "transaction-invalid": "交易无效，请重试",
        "share-erc20-token": "查看这个ERC20币种",
        "privatekey": "EVM 私钥",

        /************
        * Home Page *
        *************/
        "wallet-home-title": "钱包主页",
        "wallet-overview": "钱包总览",
        "you-have-n-wallets": "您有 {{walletsCount}} 个币种",
        "synced": "已同步",
        "syncing": "同步中",
        "synchronized": "{{progress}}% 完成",
        "sync-progress": "同步中 {{progress}}%",
        "ela-erc20": "ELASTOS ERC20 币种",
        "coin-list": "币列表",
        "staking-assets": "质押资产",
        "staking-assets-refresh": "刷新",
        "staking-assets-refreshing": "正在拼命刷新...",
        "activate-hive-vault": "激活 Hive Vault",
        "pull-down-to-refresh": "下拉屏幕刷新",
        "hive-not-configured-title": "Hive未配置",
        "hive-not-configured-text": "您的Hive存储空间未配置。 您现在要配置吗？",
        "hive-not-configured-not-now": "暂不",
        "hive-not-configured-configure": "配置",
        "collectibles": "收藏品",
        "networks": "网络",
        "choose-active-network": "选择网络",
        "change-wallet": "切换钱包",
        "wallets": "您的钱包",
        "explore-your-wallets": "探索您的钱包",
        "wallet-unsupported-on-network": "此钱包不支持 {{ network }} 网络",
        "wallet-connect-to-ledger": '请连接 Ledger Nano X',

        /********************************************** General Settings Screen ***********************************************/

        /****************
        * Settings Page *
        *****************/
        "settings-title": "设置",
        "settings-general": "通用",
        "settings-add-wallet": "添加钱包",
        "settings-add-wallet-subtitle": "创建或导入新钱包",
        "settings-my-wallets": "我的钱包",
        "settings-my-wallets-subtitle": "管理、备份钱包及相关设置",
        "settings-currency": "货币",
        "settings-currency-subtitle": "选择默认的货币",
        "settings-custom-networks": "自定义网络",
        "settings-custom-networks-subtitle": "在此添加或编辑自定义网络",
        "settings-manage-networks": "管理网络",
        "settings-manage-networks-subtitle": "显示和隐藏网络，添加自定义网络",
        "settings-add-wallet-standard-wallet": "标准钱包",
        "settings-add-wallet-multi-sig-wallet": "多签钱包",
        "settings-add-wallet-hardware-wallet": "硬件钱包",
        "settings-add-wallet-new-wallet": "新钱包",
        "settings-add-wallet-mnemonic": "助记词",

        /***********************
        * Select-Currency Page *
        ************************/
        "select-currency-title": "选择货币",
        "available-currencies": "支持的货币",
        "united-states-dollar": "美元",
        "chinese-yuan": "人民币",
        "czk-koruna": "捷克克朗",
        "euro": "欧元",
        "british-pound": "英镑",
        "japanese-yen": "日元",
        "bitcoin": "比特币",

        /**********************
        * Wallet Manager Page *
        ***********************/
        "wallet-manager-intro": "每个钱包都有单独的设置，您可以检查每个钱包里的选项。",
        "wallet-manager-add-wallet": "添加钱包",

        /********************************************** Coin Screens ***********************************************/

        /*****************
        * Coin Home Page *
        ******************/
        "coin-new-transactions-today": "今天有 {{ todaysTransactions }} 笔交易",
        "coin-balance": "金额",
        "coin-action-recharge": "侧链充值",
        "coin-action-withdraw": "主链提现",
        "coin-action-send": "发送",
        "coin-action-receive": "接收",
        "coin-transactions": "交易",
        "coin-internal-transactions": "内部交易",
        "coin-no-transactions": "没有交易",
        "coin-op-received-token": "接收",
        "coin-op-sent-token": "发送",
        "coin-op-transfered-token": "钱包内部转账",
        "coin-op-vote": "投票",
        "coin-op-dpos-vote": "DPoS投票",
        "coin-op-crc-vote": "CR委员投票",
        "coin-op-cr-proposal-against": "CR提案反对票",
        "coin-op-crc-impeachment": "CR委员弹劾",
        "coin-op-identity": "发布 DID",
        "coin-op-contract-create": "创建合约",
        "coin-op-contract-token-transfer": "ERC20币种转账",
        "coin-op-contract-call": "执行合约",
        "coin-op-contract-destroy": "无效交易",
        "coin-op-producer-register": "DPoS参选",
        "coin-op-producer-cancel": "取消DPoS参选",
        "coin-op-producer-update": "DPoS节点更新",
        "coin-op-producer-return": "提取 DPoS 质押金",
        "coin-op-cr-register": "注册CR委员",
        "coin-op-cr-cancel": "取消CR委员",
        "coin-op-cr-update": "CR委员更新",
        "coin-op-cr-return": "提取CR委员质押金",
        "coin-op-cr-claim-node": "绑定DPoS节点",
        "coin-op-proposal": "发起提案",
        "coin-op-proposal-review": "评审提案",
        "coin-op-proposal-tracking": "提案反馈",
        "coin-op-proposal-withdraw": "提取提案资金",
        "coin-op-crc-claim": "CR委员节点交易",
        "coin-op-stake": "质押",
        "coin-op-dpos2-voting": "DPoS 2 投票",
        "coin-op-dpos2-voting-update": "更新 DPoS 2 投票",
        "coin-op-unstake": "取回质押",
        "coin-op-unstake-withdraw": "质押提现",
        "coin-op-dpos2-claim-reward": "DPoS 2 领取奖励",
        "coin-op-dpos2-reward-withdraw": "DPoS 2 奖励提现",
        "coin-op-dpos2-node-claim-reward": "领取DPoS节点奖励",
        "coin-op-dpos2-node-reward-withdraw": "DPoS节点奖励提现",
        "coin-op-voting-cancel": "取消投票",
        "coin-op-coin-base": "创币交易",
        "coin-dir-from-mainchain": "ELA 主链充值",
        "coin-dir-from-idchain": "EID 侧链提现",
        "coin-dir-from-ethsc": "ESC 侧链提现",
        "coin-dir-to-mainchain": "主链提现",
        "coin-dir-to-idchain": "EID 侧链充值",
        "coin-dir-to-ethsc": "ESC 侧链充值",
        "coin-transaction-status-confirmed": "已确认",
        "coin-transaction-status-pending": "确认中",
        "coin-transaction-status-unconfirmed": "未确认",
        "coin-transaction-status-not-published": "未发布",
        "text-coin-close-warning": "此币种将从列表中删除",

        /*******************
        * Coin Select Page *
        ********************/
        "coin-select-title": "选择币种",

        /*********************
        * Coin Transfer Page *
        **********************/
        "coin-transfer-send-title": "发送代币",
        "coin-transfer-recharge-title": "{{coinName}} 代币充值",
        "coin-transfer-withdraw-title": "{{coinName}} 代币提现",
        "payment-title": '支付',
        "transfer-from": "来自",
        "transfer-to": "转账到",
        "transfer-amount": "转账金额",
        "transfer-receiver-address": "接收地址",
        "transfer-receiver-address-placeholder": "请输入接收地址",
        "transfer-custum-address": "自定义接收地址",
        "transfer-send-ela": "发送ELA",
        "balance": "余额",
        "balance-remaining": "余额:",
        "insufficient-balance": "余额不足",
        "transfer-all": "全部",
        "max": "全部",
        "touch-to-select-a-personal-wallet": "轻触选择个人钱包",
        "withdraw-note": "提现最小金额为0.0002ELA，且必须是0.00000001的整数倍",
        'crosschain-note': "Elastos跨链转账一般需要15到25分钟。在此期间，您将无法看到这笔资金，请耐心等待",
        "balance-locked": "( {{ locked }} 确认中 )",
        "ela-coinbase-warning": "请确保不要将 Elastos Smart Chain 的 ELA 发送到 Coinbase 地址，因为 Coinbase 上的 ELA 是基于以太坊网络的 ERC20 ELA。",
        "nft-transaction-creation-error": "似乎无法对此 NFT 进行转让操作。一些 NFT 被锁定，需要特殊条件才能转让。请咨询原始 NFT 市场或 NFT 创建者。",

        /********************
        * Coin Receive Page *
        *********************/
        "coin-receive-title": "接收 {{coinName}}",
        "coin-receive-ela-address": "您的{{coinName}}地址",
        "coin-receive-tap-to-copy": "点击地址即可复制",
        "coin-address-copied": "{{coinName}} 地址已复制！",
        "coin-receive-address-list": "地址列表",

        /********************
        * Coin Address Page *
        *********************/
        "coin-address-msg": "可用地址",
        'coin-address-load-more': '正在努力加载',
        "coin-address-load-finish": '已显示所有地址',

        /*********************
        * Contacts Component *
        **********************/
        "select-address": "选择地址",
        "cryptonames": "加密名称",
        "delete-contact-confirm-title": "删除加密名称",

        /*******************************
        * Confirm Transaction Component *
        ********************************/
        "confirm-transaction-title": "确认交易",
        "transfer-transaction-type": "充值交易",
        "send-transaction-type": "转账交易",

        /***********************************
        * Transaction Successful Component *
        ************************************/
        'tx-success': "交易成功",

        /***********************************
        * Options Component *
        ************************************/
        'paste': "粘贴",
        'contacts': "联系人",
        'scan': "扫描",

        /***********************************
        * Network Switch Component *
        ************************************/
        'network-switch-component-title': '网络切换',
        'network-switch-component-intro': '需要先切换当前网络，才能执行后续操作',
        'network-switch-component-confirm': '切换网络',

        /************************
        * Transaction Info Page *
        *************************/
        "tx-info-title": "交易详情",
        "tx-info-confirmations": "确认数",
        "tx-info-transaction-time": "交易时间",
        "tx-info-memo": "备注",
        "tx-info-receiver-address": "接收地址",
        "tx-info-sender-address": "发送地址",
        "tx-info-transaction-fees": "交易手续费",
        "tx-info-cost": "总花费",
        "tx-info-transaction-id": "交易ID",
        "tx-info-block-id": "区块ID",
        "tx-info-type-received": "收到",
        "tx-info-type-sent": "发送",
        "tx-info-type-transferred": "转移",
        "tx-info-token-address": "币种地址",
        "tx-info-erc20-amount": "ERC20转账金额",

        /***********************************
        * ETH Transaction Component *
        ************************************/
        "eth-sending-transaction": "交易发送中",
        "eth-transaction-wait": "请稍候...",
        "eth-transaction-fail": "交易失败",
        "eth-transaction-pending": "交易确认中...",
        "eth-transaction-speedup-prompt": "您可以通过增加燃料价格对交易进行加速",
        "eth-transaction-speedup": "加速交易",
        "eth-gasprice": "燃料价格(GWEI)",
        "eth-gaslimit": "燃料限制",

        /**************************
        * Token chooser component *
        ***************************/

        'select-a-token': '选择代币',
        'select-token-intro': '您下一步要使用哪个代币?',

        /**************************
        * Wallet chooser component *
        ***************************/

        'unsupported-on-network': '不支持 {{network}} 网络',

        /*********************
         * Ledger Sign Component *
         **********************/
        "ledger-sign": "使用 Ledger 签名",
        "ledger-connecting": "正在搜索 Ledger 钱包",
        "ledger-prompt": "请开启 Ledger Nano X，保持解锁，并打开 {{appname}} 应用程序",
        "ledger-connected-device": "已连接设备",
        "ledger-confirm-on-ledger-prompt": "点击 继续 后，请在 Ledger 上查看交易并确认！",

        /*******************
        * Ledger scan page *
        ********************/
        "ledger-scan": "搜索Ledger设备",
        "ledger-scan-available-devices": "可用设备",
        "ledger-scan-paired-devices": "已配对设备",
        "ledger-scan-scan-again": "重新搜索",
        "ledger-scan-ledger-scanning": "正在搜索设备",
        "ledger-scan-bluetooth-not-enable": "蓝牙未开启，请先开启蓝牙",
        "ledger-scan-open-bluetooth-setting": "打开蓝牙设置",

        /**********************
        * Ledger connect page *
        ***********************/
        "ledger-connect": "Ledger 账号",
        "ledger-device": "设备",
        "ledger-connect-error": "连接失败",
        "ledger-connecting-to-device": "正在连接设备",
        "ledger-addresses": "地址",
        "ledger-address-type": "地址类型",
        "ledger-pick-network": "选择网络",
        "ledger-connect-ledger-sucess": "成功连接 Ledger 硬件钱包",
        "ledger-getting-addresses": "正在获取地址",
        "ledger-get-addresses": "获取地址",
        "ledger-choose-address-type": "选择地址类型",
        "ledger-reconnect": "点击以重新连接",

        /**********************
        * Ledger error *
        ***********************/
        "ledger-error-app-not-start": "请在 Ledger Nano X 上启动 {{appname}} 应用程序",
        "ledger-error-operation-cancelled": "操作已取消",
        "ledger-error-unknown": "未知错误",
        "ledger-error-contractdata": "请在 Ethereum 应用程序的设置中启用盲签名或合约数据",

        /********************************************** Wallet Settings Screens ***********************************************/

        /***********************
        * Wallet Settings Page *
        ************************/
        "wallet-settings-title": "钱包设置",
        "wallet-settings-backup-wallet": "备份钱包",
        "wallet-settings-backup-wallet-subtitle": "查看要导出和备份的助记词及 EVM 私钥",
        "wallet-settings-backup-wallet-export": "导出助记词及 EVM 私钥",
        "wallet-settings-backup-wallet-keystore": "导出 Keystore",
        "wallet-settings-change-name": "更改名称",
        "wallet-settings-change-name-subtitle": "自定义钱包名称",
        "wallet-settings-change-theme": "更换主题",
        "wallet-settings-change-theme-subtitle": "自定义钱包主题风格",
        "wallet-settings-manage-coin-list": "管理币种",
        "wallet-settings-manage-coin-list-subtitle": "设置要显示的币种",
        "wallet-settings-delete-wallet": "删除钱包",
        "wallet-settings-delete-wallet-subtitle": "此操作不会删除您的资产，您可以随时再次导入此钱包",
        "wallet-settings-migrate-did1": "转移 DID 1.0 资金",
        "wallet-settings-migrate-did1-subtitle": "将剩余的 ELA 从已弃用的 1.0 DID 侧链转移回主链",
        "wallet-settings-migrate-did1-intro": "这是一次性操作。 此次转账会将您所有剩余的资金从现已弃用的 DID 1.0 亦来云侧链迁移到亦来云主链。 之后，DID 1.0 子钱包将从您的钱包中消失。",
        "delete-wallet-confirm-title": "删除钱包",
        "delete-wallet-confirm-subtitle": "您的钱包将从此设备上删除。 您可以重新导入此钱包，请确保已经备份好钱包助记词。",
        "wallet-settings-consolidate-utxos": "零钱换整",
        "wallet-settings-consolidate-utxos-subtitle": "UTXO 数量过多会增加创建交易的时间",
        "wallet-settings-consolidate-no-need": "无需执行零钱换整",
        "wallet-settings-extended-public-keys-title": "扩展公钥",
        "wallet-settings-extended-public-keys-subtitle": "创建多签钱包所需的特殊密钥",

        /************************
        * Wallet Edit Name Page *
        *************************/
        "wallet-edit-name-title": "更改钱包名称",
        "wallet-edit-name-new-name": "输入新的名称",

        /***************************
        * Wallet Change Theme Page *
        ****************************/
        "change-wallet-theme-title": "更换钱包主题",

        /************************
        * Wallet Coin List Page *
        *************************/
        "coin-list-title": "管理币种",
        "coin-list-enable-disable-coins": "开启/关闭 币种",
        "coin-list-enable-disable-coins-intro": "选择要在钱包主页面显示的币种。",
        "erc-20-token": "ERC20 币种",
        "new-coins": "新币种",
        "all-coins": "全部币种",
        "search-coin": "搜索币种",

        /***********************
        * Export Mnemonic Page *
        ************************/
        'text-export-mnemonic': '导出助记词',

        /***********************
        * ERC20 Details Page *
        ************************/
        'coin-erc20-details-address': '合约地址',
        'coin-erc20-details-share': '分享',
        'coin-erc20-details-delete': '删除',
        'delete-coin-confirm-title': '删除币种',
        'delete-coin-confirm-subtitle': '该币种将从您的钱包中删除，但您的币种余额是安全的。 要使用和查看您的币种余额，您必须再次添加此币种。',

        /*****************
        * Add ERC20 Page *
        ******************/
        "coin-adderc20-title": "添加 ERC20 币种",
        "coin-adderc20-intro": '手动输入令牌地址',
        "coin-adderc20-intro2": '或扫描其QR码。',
        "coin-adderc20-enteraddress": '输入币种地址',
        "coin-adderc20-add": '添加币种',
        "coin-adderc20-search": '搜索币种',
        "coin-adderc20-name": '币种名称',
        "coin-adderc20-symbol": '币种符号',
        "coin-adderc20-not-a-erc20-contract": "不是有效的 ERC20 币种地址",
        "coin-adderc20-invalid-contract-or-network-error": "不是有效的 ERC20 币种地址 或 网络错误",
        'coin-adderc20-alreadyadded': '币种已经添加',
        'coin-adderc20-not-found': '此币种地址未注册，请检查您输入的币种地址',

        /***********************
        * Manage networks Page *
        ************************/
        'manage-networks-title': '管理网络',
        'manage-networks-intro': '在“网络”列表中选择要查看的网络。隐藏您不使用的网络。您还可以点击上面的“+”图标来添加与以太坊兼容的自定义网络。',

        /***********************
        * Custom networks Page *
        ************************/
        'custom-networks-title': '自定义网络',
        'add-custom-network-title': '添加自定义网络',
        'edit-custom-network-title': '编辑自定义网络',
        'custom-networks-intro': '管理兼容EVM的网络',
        'add-custom-network': '+ 添加自定义网络',
        'network-name': '名称',
        'network-rpc-url': 'RPC URL',
        'network-account-rpc-url': 'Account RPC URL (可选)',
        'network-chain-id': '链 ID',
        'network-token-symbol': '代币符号 (可选)',
        'checking-rpc-url': '正在检查 RPC URL',
        'checking-account-rpc-url': '正在检查 Account RPC URL',
        'wrong-rpc-url': 'RPC URL 无法访问，请检查！',
        'wrong-account-rpc-url': 'Account RPC URL 无法访问，请检查！',
        'cant-delete-active-network': '不能删除当前活动网络， 如需删除，请先切换到其他网络！',
        'delete-network-prompt-title': '删除网络?',
        'delete-network-prompt-text': '确定需要删除此网络?',

        /***********************
        * Asset Overview Page *
        ************************/
        'wallet-asset-title': '资产总览',
        "wallet-asset-networks-count": "{{ networksCount }} 个网络",
        'staked-assets-info-by': '质押资产数据提供商',

        /************
        * NFT pages *
        *************/
        'nft-overview': 'NFT 概览',
        'nft-assets': '资产',
        'nft-token-id': 'Token ID',
        'nft-collectibles-cant-be-listed': '无法列出此 NFT 类型的收藏品',
        'nft-unnamed-asset': '未命名资产',
        'nft-asset-with-type': '{{ type }} NFT 资产',
        'nft-properties': '属性',
        'nft-no-properties-yet': '属性显示尚不支持，即将推出',
        'nft-assets-owned': '项资产',
        'nft-attributes': '属性',

        /********************************************** Intent Screens ***********************************************/

        /************************
        * Select Subwallet Page *
        *************************/
        'select-subwallet': '选择子钱包',
        'select-wallet': '选择钱包',

        /**************
        * Access Page *
        ***************/
        "access-title": "钱包访问请求",
        "access-subtitle-wallet-access-from": "数据请求来自于：",
        "access-subtitle-access-mnemonic-from": "请求助记词来自于：",
        "access-request-for-info": "此请求需要从您的钱包获取如下信息",
        "access-reason": "说明",
        "access-data-access": "请求的数据",
        'access-mnemonic': '获取助记词',
        'elaaddress': 'ELA钱包地址',
        'elaamount': 'ELA 金额',
        'ethaddress': 'ESC侧链钱包地址',
        'requester': '请求授权应用',
        'text-allow': '允许',
        'text-warning': '警告',
        'text-share-mnemonic-warning': '助记词是区块链资产的唯一凭证，分享前请确认不会有泄露风险！',

        /***********************
        * DID Transaction Page *
        ************************/
        "didtransaction-title": "发布身份",
        "didtransaction-publish-identity": "发布身份",
        "didtransaction-transaction-fee": "只需要花费很少的交易费",
        "didtransaction-intro": "您正在将最新的身份更改发布到EID侧链",

        /*******************
        * Voting Common *
        ********************/
        "vote-you-are-voting": "正在投票!",
        "vote-transaction-fees": "大约需要0.0001 ELA的交易费",
        "vote-revote": "当您从ELA钱包中消费任意ELA后，请记得重新投票",

        /*******************
        * DPoS Voting Page *
        ********************/
        "dposvote-title": "超级节点投票",

        "dposvote-voting-for": "您正在投票给：",
        "dposvote-with": "使用:",

        /***********************
        * CRCrouncil Voting Transaction Page *
        ************************/
        "crcouncilvote-title": "CR委员投票",
        "crcouncilvote-voting-with": "用于投票的 ELA 金额：",

        /***********************
        * ESC Transaction Page *
        ************************/
        "esctransaction-title": "交易",
        "esctransaction-smart-contract": "智能合约",
        "esctransaction-intro": "您将签署并运行智能合约",
        "esctransaction-approve-token": "批准代币",
        "esctransaction-approve-token-intro": "此应用程序或网站将被允许代表您提取和使用您的 {{token}} 代币",
        "esctransaction-you-are-using": "您正在花费：",
        "esctransaction-value": "金额:",
        "esctransaction-fees": "预估手续费（最多）:",

        /***********************
        * Sign Typed Data Page *
        ************************/
        "signtypeddata-title": "数据签名",
        "signtypeddata-subtitle": "数据签名",
        "signtypeddata-intro": "调用应用程序需要您使用钱包签署一些数据才能继续。请确认",
        "signtypeddata-danger": "对此数据签名可能会很危险。此签名可能代表您的帐户执行任何操作，包括将您的帐户及其所有资产的完全控制权授予请求站点。只有在你知道自己在做什么或完全信任请求网站的情况下，才能签署此消息。",

        /***********************
        * No Wallet *
        ************************/
        "intent-no-wallet-title": "没有钱包",
        "intent-no-wallet-msg": "您还没有钱包，现在要创建吗？",

        /********************************************** Create Wallet Screens ***********************************************/

        /****************
        * Launcher Page *
        *****************/
        'wallet-prompt1': '安全的',
        'wallet-prompt2': '数字钱包',
        'get-started': '开始',
        'import-wallet-msg': '已经有钱包? 点击这里导入钱包',
        'launcher-create-wallet': '创建钱包',
        'new-standard-wallet': '新建标准钱包',
        'import-standard-wallet': '导入标准钱包',
        'multi-sig-wallet': '多签钱包',
        'ledger-hardware-wallet': 'Ledger Nano X 硬件钱包',

        /*********************
        * Wallet Create Page *
        **********************/
        'enter-wallet-name': '请输入钱包名称',
        'single-address': '单地址钱包',
        'multiple-address': '多地址钱包',
        'use-passphrase': '使用助记词密码',
        'not-use-passphrase': '不使用助记词密码',
        'launcher-backup-import': '导入钱包',
        "text-wallet-name-validator-enter-name": "请给您的钱包设置名称",
        "text-wallet-name-validator-not-valid-name": "抱歉，这个钱包名称无效",
        "text-wallet-name-validator-already-exists": "此钱包名称已经存在",
        "text-wallet-passphrase-validator-repeat": "两次输入的助记词密码不一致",
        "text-wallet-passphrase-validator-min-length": "助记词密码最少8位",
        "import-wallet-by-mnemonic": "通过助记词导入钱包",
        "import-wallet-by-privatekey": "通过 EVM 私钥导入钱包",

        /*****************
        * Mnemonic Pages *
        *****************/
        'mnemonic-prompt1': '这是您的12个安全字（助记词）。丢失这些，您将丢失钱包，因此必须将它们',
        'mnemonic-prompt2': '按顺序',
        'mnemonic-prompt3': '写下来，并且安全地保存。',
        'back-to-setting': '返回',
        'view-mnemonic': "查看助记词",
        'mnemonic-warning1': '保密,',
        'mnemonic-warning2': '安全保存!',
        'mnemonic-warning3': '切勿与任何人分享您的助记词，并始终保持安全！确保没有人在看着您再继续',
        'type-menmonic-verify': '请输入您的12个助记词进行验证',
        'type-menmonic-import': '请按顺序输入钱包的12个助记词',
        'import-text-word-sucess': '已通过助记词成功导入钱包',
        'next-four-words': '后四个词',
        'create-wallet': '创建钱包',
        'import-wallet': '导入钱包',
        "mnemonic-import-missing-words": "请输入所有的助记词",
        "mnemonic-check-title": '验证助记词',
        "memory-written-down": "已经记下了",
        "mnemonic-verify-sucess": '助记词验证成功',
        "mnemonic-verify-fail": '助记词验证失败，请重新输入助记词',
        "mnemonic-input-passphrase": "输入助记词密码（最少8位）",
        "mnemonic-reinput-passphrase": "再次输入助记词密码",
        "help:create-password": "助记词密码是可选的，但它为您的钱包提供了更高的安全性。您可以将其视为自定义的第13个助记词。请注意，如果忘记了该密码，将无法恢复钱包。在恢复您的钱包时输入错误的助记词密码不会产生任何错误，但恢复的将是另一个钱包。",
        "help:import-password": "助记词密码是与助记词绑定的自定义密码。 如果您在创建钱包时使用了助记词密码，则导入时必须使用相同的助记词密码，反之，则无需助记词密码，否则恢复的将是另一个钱包。",
        "privatekey-tap-to-copy": "点击私钥即可复制",
        "export-private-key-intro": "或者，您也可以在某些钱包中使用以下私钥。点击私钥即可复制。",
        "import-paste-from-keypad": "备注：您可以从键盘上粘贴完整的助记词",

        /***********************
        * Export Keystore Page *
        ************************/
        "keystore-title": "导出 Keystore",
        "keystore-export-intro": "点击Keystore即可复制",
        "keystore-input-password": "设置Keystore密码（最少8位）",
        "keystore-reinput-password": "再次输入Keystore密码",
        "keystore-export": "导出",
        "keystore-password-validator-repeat": "两次输入的密码不一致",
        "keystore-password-validator-min-length": "密码最少8位",

        /********************************
        * Import Wallet by private key Page *
        *********************************/
        'import-wallet-by-privatekey-info': '私钥:只支持兼容 EVM 的钱包私钥',
        'import-wallet-by-keystore-info': 'Keystore: 只支持 ELA Keystore',
        'paste-privatekey': '请粘贴或输入私钥',
        'wrong-privatekey-msg': '请输入正确的私钥',
        'import-private-key-sucess': '已通过私钥成功导入钱包',
        'import-keystore-sucess': '已通过Keystore成功导入钱包',
        'keystore-backup-password': '请输入 Keystore 密码',

        /***************************
        * Earn, Swap, Bridge pages *
        ****************************/
        'view-transactions': '交易和转账',
        'earn': 'Earn',
        'swap': 'Swap',
        'bridge': 'Bridge',
        'wallet-coin-earn-title': 'Earn 供应商',
        'wallet-coin-swap-title': 'Swap 供应商',
        'wallet-coin-bridge-title': 'Bridge 供应商',
        'providers-disclaimer': '此页面列出的是<b>与 Essentials 无关的第三方服务</b>。在信任任何平台之前请自行验证。',
        'finance-platforms': '金融平台',
        'finance-platforms-intro': '以下平台可以管理代币，让您赚取利息。',
        'get-more-tokens': '获得更多代币',
        'get-more-tokens-intro': '以下第三方兑换服务可用于兑换<b> {{coinName}} 代币</b>:',
        'bridge-tokens': '桥接您的代币',
        'bridge-tokens-intro': '以下第三方桥接服务可用于 {{networkName}} 上<b>交易 {{coinName}}</b> 代币:',
        'to-networks': '支持的网络:',

        /********************************
        * Multisig standard wallet page *
        *********************************/

        'multi-sig-wallet-name': '钱包名称',
        'multi-sig-my-signing-wallet': '我的签名钱包',
        'multi-sig-pick-a-wallet': '选择钱包',
        'multi-sig-other-co-signers': '其他联合签名人',
        'multi-sig-input-xpub-key-prompt': '输入扩展密钥',
        'multi-sig-add-cosigner': '添加签名人',
        'multi-sig-total-signers': '签名人总数',
        'multi-sig-required-signers': '所需签名数',
        'multi-sig-new-wallet-title': '创建多签钱包',
        'multi-sig-error-no-signing-wallet': "请选择您的签名钱包",
        'multi-sig-error-invalid-xpub': '请输入有效的扩展密钥',
        'multi-sig-error-xpub-in-user': '此密钥已在列表中',

        /********************************
        * Multisig tx details component *
        *********************************/
        'multi-signature-status': '多签状态',
        'multi-signature-my-signature': '我的签名',
        'multi-signature-sign': '签名',
        'multi-signature-signed': '已签名',
        'multi-signature-not-signed': '未签名',
        'multi-signature-publish': '发布',
        'multi-signature-transaction-link': '联合签署人链接',
        'multi-signature-transaction-link-copy-info': '复制此链接以让其他联合签名者查找并签署此交易',
        'multi-signature-transaction-link-copied': '交易链接已复制',

        /***************************
        * Multisig tx intent page  *
        ****************************/
        'multi-sig-tx-title': '多签交易',
        'multi-sig-tx-fetching': '正在获取交易信息，请稍候。',
        'multi-sig-tx-no-tx-found': '抱歉，找不到匹配的交易。',
        'multi-sig-tx-unknown-network': '抱歉，您的 Essentials 版本中不存在此交易适用的网络。',
        'multi-sig-tx-pick-wallet': '请选择正确的多签钱包',
        'multi-sig-tx-select-wallet': '选择多签钱包',
        'multi-sig-tx-selected-wallet': '已选的钱包',
        'multi-sig-tx-switched-to-network': '切换到 {{ network }}',

        /***************************
        * Multisig extended public key page  *
        ****************************/
        'multi-sig-extended-public-key-title': '扩展公钥',
        'multi-sig-extended-public-key-copied': '已复制',
        'multi-sig-extended-public-key-info': '这是您的扩展公钥。您可以将此密钥用作多签钱包的联合签名者密钥。',
        'multi-sig-extended-public-key-copy': '点击即可复制',
        'multi-sig-extended-public-key-note': '技术说明',
        'multi-sig-extended-public-key-note-info': '此扩展公钥是使用BIP45派生的，以便在多签钱包中使用，而由于历史原因，您的 Elastos 主链钱包使用BIP44。',

        /************************
        * Offline transactions  *
        *************************/

        'offline-tx-pending-multisig': '未确认的多签交易',
        'offline-tx-unknown-tx': "未知交易",

        /*****************************
        * Extended transaction info  *
        ******************************/
        'ext-tx-info-type-send-nft': '发送 NFT',
        'ext-tx-info-type-send-nft-name': '发送 {{ name }}',
        'ext-tx-info-type-send-erc20': '发送 {{ symbol }}',
        'ext-tx-info-type-send-tokens': '发送代币',
        'ext-tx-info-type-swap-erc20': '{{ fromSymbol }} → {{ toSymbol }}',
        'ext-tx-info-type-swap-tokens': '交换代币',
        'ext-tx-info-type-approve-token': '批准代币',
        'ext-tx-info-type-approve-erc20': '批准 {{ symbol }}',
        'ext-tx-info-type-bridge-tokens': '桥接代币',
        'ext-tx-info-type-bridge-erc20': '桥接 {{ symbol }}',
        'ext-tx-info-type-liquidity-deposit': '流动性存款',
        'ext-tx-info-type-add-liquidity-with-symbols': '添加 {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-add-liquidity-with-one-symbols': '添加 {{ symbolA }} LP',
        'ext-tx-info-type-remove-liquidity': '移除流动性',
        'ext-tx-info-type-remove-liquidity-with-symbols': '移除 {{ symbolA }} + {{ symbolB }} LP',
        'ext-tx-info-type-withdraw': '提现',
        'ext-tx-info-type-get-rewards': '获得奖励',
        'ext-tx-info-type-get-booster-rewards': '获得助推器奖励',
        'ext-tx-info-type-deposit': '充值',
        'ext-tx-info-type-stake': '质押',
        'ext-tx-info-type-mint': '创建',
        'ext-tx-info-type-redeem': '赎回',
        'ext-tx-info-type-lock': '锁币',
        'ext-tx-info-type-claim-tokens': '申请代币',
        'ext-tx-info-type-withdraw-to-mainchain': '主链提现',
        'ext-tx-info-type-harvest': '收获',

        /***************************
        * Migrator *
        ****************************/
        'migrator-title': '需要更新',
        'migrator-info': '在您继续之前，我们需要更新一些内容。',
        'migrator-ongoing': '更新中...',
        'migrator-success': '一切正常，请点击继续！',
        'migrator-fail': '很遗憾，更新失败。请联系开发团队！',
        'migrator-start': '开始',

        /********************************************** Error ***********************************************/

        // Consolidate
        'text-consolidate-prompt': '是否零钱换整？',
        'text-consolidate-UTXO-counts': 'UTXO 个数已达到：{{ count }}',
        'text-consolidate-note': 'UTXO 数量过多可能会导致一些交易失败，执行零钱换整后不影响已有的超级节点投票',
        'reasons-failure': '失败原因',
        "notification-too-many-utxos": "钱包 {{ walletname }} 的ELA 主链中的 UTXO 个数已达到 {{ count }}，建议您重新执行 DPoS 投票，或执行零钱换整！",

        // Error codes
        'Error-10000': 'Action参数JSON格式错误',
        'Error-10001': 'Action参数错误',
        'Error-10002': '无效主钱包',
        'Error-10003': '无效子钱包',
        'Error-10004': '创建主钱包错误',
        'Error-10005': '创建子钱包错误',
        'Error-10006': '恢复子钱包错误',
        'Error-10007': '无效的钱包管理器',
        'Error-10008': 'Keystore导入钱包错误',
        'Error-10009': '助记词导入钱包错误',
        'Error-10010': '子钱包实例错误',
        'Error-10011': '无效DID管理器',
        'Error-10012': '无效DID',
        'Error-10013': 'Action无效',
        'Error-20000': 'SPV未收集异常',
        'Error-20001': '无效参数',
        'Error-20002': '无效密码',
        'Error-20003': '密码错误',
        'Error-20004': '无效ID',
        'Error-20005': '创建主钱包失败，该钱包已经存在',
        'Error-20006': '创建子钱包失败',
        'Error-20007': '解析JSON数组错误',
        'Error-20008': '助记词无效',
        'Error-20009': '公钥格式错误',
        'Error-20010': '公钥长度错误',
        'Error-20011': '侧链充值参数错误',
        'Error-20012': '侧链提现参数错误',
        'Error-20013': '交易数据过大',
        'Error-20014': '创建交易错误',
        'Error-20015': '交易错误',
        'Error-20016': '目录不存在',
        'Error-20017': '注册ID payload错误',
        'Error-20018': '数据库操作错误',
        'Error-20019': '衍生purpose错误',
        'Error-20020': '错误账户类型',
        'Error-20021': '错误网络类型',
        'Error-20022': '无效币种',
        'Error-20023': '无当前多签账户',
        'Error-20024': '多签参与者数量错误',
        'Error-20025': '多签错误',
        'Error-20026': 'keystore错误',
        'Error-20027': 'limit gap错误',
        'Error-20028': '钱包错误',
        'Error-20029': '私钥错误',
        'Error-20030': '二进制转字符串错误',
        'Error-20031': '签名类型错误',
        'Error-20032': '地址错误',
        'Error-20033': '签名错误',
        'Error-20034': 'Keystore 需要密码',
        'Error-20035': '余额不足',
        'Error-20036': 'JSON格式错误',
        'Error-20037': '无效投票数',
        'Error-20038': '无效输入',
        'Error-20039': '无效交易',
        'Error-20040': '获取内部地址失败',
        'Error-20041': '账户不支持投票',
        'Error-20042': '本地交易不属于钱包',
        'Error-20043': '参选质押金不足',
        'Error-20044': '缺少私钥',
        'Error-20045': '赎回脚本错误',
        'Error-20046': '已签名',
        'Error-20047': '加密错误',
        'Error-20048': '校验错误',
        'Error-20049': '前一个交易正在确认中，请等待此交易确认后再执行',
        'Error-20050': '助记词个数错误',
        'Error-20051': '无效数据',
        'Error-20052': '主钱包不存在',
        'Error-20053': '无效资产',
        'Error-20054': '读取配置文件时错误',
        'Error-20055': '无效的 ID 链',
        'Error-20056': '不支持的旧交易',
        'Error-20057': '此操作不支持',
        'Error-20058': 'BigInt',
        'Error-20059': '未发现质押金',
        'Error-20060': '输入太多',
        'Error-20061': '上一个投票交易正在确认中',
        'Error-20062': '提案内容超过限制',
        'Error-20063': '提案Hash 不匹配',
        'Error-29999': '其它错误',
        'Error-30000': 'JSON转换错误',
        'Error-31000': '单位类型错误',
        'Error-32000': ' ETH地址错误',
        'transaction-type-0': '创币交易',
        'transaction-type-1': '注册资产',
        'transaction-type-2': '普通转账',
        'transaction-type-3': '记录',
        'transaction-type-4': '部署',
        'transaction-type-5': '侧链挖矿',
        'transaction-type-6': '侧链充值',
        'transaction-type-7': '侧链提现',
        'transaction-type-8': '跨链转账',
        'transaction-type-9': '注册参选交易',
        'transaction-type-10': '取消参选交易',
        'transaction-type-11': '更新参选交易',
        'transaction-type-12': '取回参选质押资产',
        'transaction-type-13': '未知交易类型',
        'transaction-type-vote': '投票交易',
        'transaction-type-did': 'DID交易',
        'transaction-type': '交易类型',
        'transaction-deleted': '已删除',
        'txPublished-0': '交易成功',
        'txPublished-1': '交易格式错误',
        'txPublished-16': '无效交易',
        'txPublished-17': '过时的交易',
        'txPublished-18': '交易成功',
        'txPublished-22': '交易未签名',
        'txPublished-64': '非标准交易',
        'txPublished-65': '粉尘交易',
        'txPublished-66': '交易费不足',
        'txPublished-67': '检查点错误',
        'did-oversize': 'DID数据过大',
    },
};
