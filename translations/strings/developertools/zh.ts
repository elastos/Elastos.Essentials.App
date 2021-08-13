export const zh = {

    'developertools': {
        // Pages
        'dev-toolbox': '开发者工具箱',
        'my-apps': '我的应用',
        'no-apps': '没有应用',
        'no-apps-available': '没有可用的应用程序',
        'new-app': '新建应用',
        'provide-name': '请提供您的应用名称',
        'provide-mnemonic': '请提供现有的应用程序 DID 助记词，否则请创建新的助记词',
        'create-new-app': '创建新的应用',
        'create-app-message': '创建一个新的应用程序意味着为其创建一个新的永久 DID。必须仔细保存此 DID，因为这是将来升级应用程序的唯一方法。要了解如何构建应用程序，请访问https://developer.elastos.org',
        'app-name': '应用名称',
        'create-did': '创建一个新的 DID',
        'import-did': ' 导入已有的 DID',
        'existing-app-did-mnemonic': '现有的应用程序 DID 助记词',
        'mnemonic-passphrase': '助记词密码',
        'if-any': '（如果有的话）',
        'create-app': '创建应用',
        'app-created': '应用已创建！',
        'save-mnemonic': '请仔细保存您的助记词：',
        'manage-app': '管理应用',
        'generic-app-info': '通用的应用程序信息',
        'app-identity-status': '应用程序身份状态',
        'app-did-published?': '应用 DID 是否已经发布？',
        'dev-did-published?': '开发者 DID 是否已经发布？',
        'app-did-copied': '应用程序 DID 已经复制到剪切板',
        'checking': '正在检查...',
        'yes-published': '是的 - 已经发布成功',
        'no-published': '请发布',
        'app-attached-to-dev': '您的应用程序是否已经绑定到您的开发者？',
        'dev-did': '开发者 DID',
        'native-redirect-url': '本地重定向 URL',
        'native-callback-url': ' 本地回调 URL',
        'native-scheme': '本地 Scheme',
        'publish-app-did': '发布应用的 DID',
        'up-to-date': '已更新到最新，无需发布',
        'different-did': '与当前登录的用户不同-请发布以进行更新',
        'uploading-icon': '正在将应用图标上传到开发人员的 Hive Vault，请稍候...',

        // Placeholders
        'redirecturl-placeholder': '在此处设置您的 Intent 重定向 URL（如果有）',
        'nativecustomscheme-placeholder': '在此处设置您自定义 Scheme（如果有）',
        'nativecallbackurl-placeholder': '在此处设置您的 Intent 回调 URL（如果有）',

        // Components
        'appIdentityHelpMessage': '您在 Elastos DID 链上的应用程序标识符独立于任何出版物或平台，例如 Elastos Essentials 或原生 Android / iOS。这只是证明所有权的一种方法，但也是必须执行的步骤。',
        'nativeRedirectUrlHelpMessage': '原生应用需要将它们的 Scheme 基础 URL 保存在它们的公共 DID 文档中，以便保护应用间通信。例如：https://elastosapp.mysite.org. 重定向 URL 在移动设备上发送本地 Intent。由原生移动应用程序使用。',
        'nativeCustomSchemeHelpMessage': '原生应用程序（Android）应该提供一个简短的自定义 Scheme（例如：myapp），例如由 trinity 原生应用程序用来发送 Intent 响应。对于 trinity 原生应用，此自定义名称必须与 trinitynative.json 中配置的名称匹配。',
        'nativeCallbackUrlHelpMessage': '原生应用程序需要将 Intent Scheme 基础 URL 保存在其公共 DID 文档中，以确保应用程序间通信的安全。例如：https://elastosapp.mysite.org。回调 URL 将 HTTP POST 请求发送到远程 HTTP 服务器。由网站使用。',
        'help-message': '应用程序 DID 存储密码是用于访问创建的应用程序配置文件的普通密码。确保安全保存此密码',
        'help-message2': '如果您已经创建了一个应用程序，则可以使用其现有的 DID 助记词来创建另一个应用程序配置文件',
        'help-message3': '仅用于高级用途，仅当您要使用钱包的密码短语以增强安全性时才需要此助记词',
        'delete-app-msg': '为了恢复此应用程序以供将来访问和更新，您必须创建一个具有相同助记词的新应用程序'
    }

};
