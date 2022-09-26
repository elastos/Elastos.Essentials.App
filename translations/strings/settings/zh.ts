export const zh = {

     'settings': {
          /********** Generic **********/
          'change-pw-success': '密码重置成功',
          'change-pw-fail': '密码重置失败，请稍后再试',

          /********** Language Page **********/
          // Titles
          'capsule-setting': '胶囊管理',
          'about-setting': '关于Essentials',
          'developer-setting': '开发者选项',
          'passwordmanager-setting': '密码管理器',
          'wallet-setting': '我的钱包',
          'display-setting': '主题',
          'dev-mode': '开发者模式',
          'wallet-connect-sessions-setting': '钱包连接会话',
          'privacy-setting': '隐私',
          'startupscreen-setting': '启动页面',
          'startupscreen-intro-setting': '选择启动Essentials后显示的页面',

          // Subtitles
          'advanced-setting': '高级设置',
          'change-lang': '更改全局语言',
          'change-pw': '更改密码',
          'manage-pw': '管理您的密码',
          'about-elastos': 'Elastos Essentials 详情',
          'wallet-connect-sessions-intro-setting': '管理活跃的会话',
          'privacy-intro-setting': '自定义您的隐私级别',

          // Other
          'light-mode-on': '浅色主题',
          'dark-mode-on': '深色主题',
          'dark': '深',
          'light': '浅',
          'log-out': '注销',
          'help': '帮助',

          /********** About Page **********/
          'version': '版本号',
          'developer': '开发者',
          'see-also': '另请参阅',
          'visit': '访问',
          'join': '加入',
          'build': '开发',
          'contact': '联系',
          'new-version-available-notif-title': '发现新版本！',
          'new-version-available-notif-info': 'Elastos Essentials 有新的版本 ({{ latestVersion }})，请尽快更新以获取最新的功能和问题修复！',
          'checking-updates': '正在检查更新...',
          'version-up-to-date': '已是最新版本',
          'check-version-error': '无法获取最新版本信息，请稍后再试',
          'new-version-available': '发现新版本 v{{ version }}，点击更新',

          /********** Developer Page **********/
          'developer-options': '开发者选项',
          'background-services-enabled': '启用后台服务',
          'background-services-disabled': '禁用后台服务',
          'configure-network': '配置网络',
          'on': '开',
          'off': '关',
          'developer-tools': '开发者工具',
          'developer-screen-capture': '允许屏幕截图',
          'developer-logs': '捕获日志',
          'developer-export-logs': '导出捕获的日志',

          /********** Select-net Page **********/
          'choose-network': '选择网络',
          'test-net': 'Test Net',
          'main-net': 'Main Net',
          'reg-net': 'Regression net',
          'priv-net': 'Private Net',
          'lrw-net': 'LongRunWeather Net',
          'restart-prompt-info': '此操作需要重启应用',
          'restart-app': '重启应用',
          'restart-later': '稍后重启',

          /********** Wallet Connect Page **********/
          'wallet-connect-request': '应用连接请求',
          'wallet-connect-sessions': '钱包连接会话',
          'wallet-connect-prepare-to-connect': '启动钱包连接',
          'wallet-connect-popup': '操作完成，请返回原应用。',
          'wallet-connect-session-disconnected': '钱包连接会话断开',
          'wallet-connect-error': '一个外部应用程序试图发送一个 Elastos Essentials 无法理解的请求。',
          'raw-request': '原始请求: ',
          'wallet-connect-request-loading': '准备使用 Wallet Connect 连接到外部应用程序',
          'wallet-connect-request-error1': '似乎无法建立与应用程序的链接。 请从调用的应用程序',
          'get-a-new-qr-code': '获取新的二维码',
          'wallet-connect-request-error2': '并再次扫描它。',
          'wallet-connect-request-error3': '连接长时间无响应，您可以点击取消并从原应用程序重试。',
          'scan-again': '重新扫描',
          'wallet-connect-request-title': '钱包连接请求',
          'wallet-connect-request-des': '您想使用以下外部应用程序打开会话吗？',
          'app-info': '应用信息',
          'name': '名称',
          'description': '描述',
          'url': '网址',
          'wallet-accounts': '钱包账户',
          'connect': '连接',
          'wallet-connect-no-session': '没有活跃的会话',
          'wallet-connect-no-session-info': '当前没有通过 Wallet Connect 与第三方应用程序的会话。请在外部应用程序上找到 Wallet Connect 按钮，然后使用 Elastos Essentials 的扫描仪扫描此二维码以建立会话连接。',
          'wallet-connect-no-address': '没有活跃的钱包，或者活跃的网络与以太坊不兼容。这不是错误，但请确保您在预期的网络上。 否则，某些 dApp 可能会断开您的 Wallet Connect 会话。',

          /********** Startup Screen Page **********/
          'startupscreen': '启动页面',
          'startupscreen-home-title': 'Essentials主页面',
          'startupscreen-home-description': '显示所有功能和小工具的默认主屏幕',
          'startupscreen-wallets-title': '钱包',
          'startupscreen-wallets-description': '默认显示您的活动钱包，如果您特别关心资产',
          'startupscreen-dapps-title': 'DApps入口',
          'startupscreen-dapps-description': '您需要整天浏览 dApp 吗？那这种模式适合您',

          /*********** Privacy page **********/
          'privacy': '隐私',

          'privacy-built-in-browser-title': '内置浏览器',
          'privacy-use-builtin-browser': '将用 Essentials 内置浏览器打开 dApp',
          'privacy-use-external-browser': '将在外部浏览器中打开 dApp',
          'hive-data-sync': 'Data synchronization',
          'privacy-use-hive-data-sync': 'Use my Elastos Hive vault storage to save and restore personal data such as DID credentials or contacts list',
          'privacy-dont-use-hive-data-sync': 'Don\'t use my Elastos Hive vault storage to save and restore personal data',

          'identity-publishing': '发布身份',
          'publish-identity-medium-assist': '使用名为 ASSIST 的第三方服务快速发布身份',
          'publish-identity-medium-wallet': '使用您的钱包自行发布身份',

          'elastos-api-provider': 'Elastos API 提供商',
          'elastos-api-provider-des': '为所有 Elastos 相关服务选择您的首选提供商',
          'elastos-io-des': 'Gelaxy团队（即Elastos区块链团队）部署和维护的一组Elastos API。',
          'trinity-tech-io-des': '由Trinity技术团队部署和维护的一套Elastos API，Trinity技术团队负责Elastos SDK和Essentials的开发。',

          'privacy-toolbox-stats': '凭证统计信息',
          'privacy-send-credential-toolbox-stats': '将有关DID使用情况的匿名信息发送到凭证工具箱(开发人员工具)。DID本身永远不会发送。',
          'privacy-dont-send-credential-toolbox-stats': '不要将有关DID使用情况的匿名信息发送到凭证工具箱(开发人员工具)。',

          /*********** Elastos API provider page ***********/
          'elastosapiprovider': 'Elastos API'
     }

};
