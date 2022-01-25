export const zh = {
  'redpackets': {
    /**********
    * Generic *
    ***********/
    'red-packets': '红包',
    'red-packet': '红包',
    'view-all': '查看所有',
    'continue': '继续',

    /*************
    * Components *
    **************/
    'expired': '过期',
    'few-minutes-left': "剩余几分钟",
    'n-hours-left': "剩余 {{ hours }} 小时",
    'n-days-left': "剩余 {{ days }} 天",
    'enter-captcha-placeholder': '输入验证码以打开红包',
    'wrong-captcha': '验证码错误，请重试',
    'error-captcha-is-required': '请输入验证码以继续',
    'not-active-yet': '未激活',
    'ip-rate-limitation': '抢红包过于频繁，请稍等几分钟',

    /*******
    * Home *
    ********/
    'public-packets': '公共红包',
    'no-public-packet': '当前没有公共红包',
    'my-packets': '我的红包',
    'create-new-packet': '创建新的红包',
    'no-my-packet': '您还没有创建任何红包',
    'opened-packets': '已打开红包',
    'about-red-packets': '关于红包',
    'about-red-packets-part-1': '红包在中国传统文化中用于庆祝特殊场合，以及在朋友之间分享快乐。Elastos Essentials 红包正是基于此想法而衍生出来的，不仅是为了庆祝，也是为了给加密社区创造娱乐。',
    'about-red-packets-part-2': '与“空投”相比，红包带来了更多的乐趣，因为这牵涉到运气和反应能力。',

    /*************
    * New packet *
    **************/
    'new-red-packet-title': '新的红包',
    'unsupported-network-intro': '此网络不支持红包，请选择另一个网络',
    'quantity': '数量',
    'quantity-hint': '红包数量',
    'token': '代币',
    'token-hint': '用户打开红包时获得的代币类型',
    'amount': '金额',
    'amount-hint': '将随机或平均分配的代币总数',
    'distribution': '分配',
    'distribution-hint': '选择平均或随机分配',
    'distribution-fixed': '所有红包金额相同',
    'distribution-random': '红包金额随机',
    'distribution-random-info': '* 获奖用户将获得随机数量的 {{ token }}',
    'distribution-fixed-info': '* 所有获奖用户将获得 {{ value }} {{ token }}',
    'probability': '概率',
    'probability-hint': '如果还有红包，那有可能抢到一个。失败后，不能重试。',
    'visibility': '可见性',
    'visibility-hint': '选择只让有链接的用户抢红包，或者公开你的红包。公开红包会出现在 Essentials 主屏幕上，可用于推广项目，但成本略高。',
    'visibility-link-only': '通过链接抢红包',
    'visibility-public': '公共红包',
    'duration': '有效期',
    'duration-hint': '有效期结束后，未被抢的红包资金将退还给您，有效期最长7天',
    'expiration-days': '天',
    'about-you': '关于你',
    'profile-hint': '如果发布，您的头像和姓名将被其他人看到',
    'message': '消息',
    'packet-message-placeholder': '祝您新春快乐',
    'theme': '主题',
    'theme-hint': '选择自定义的红包主题',
    'theme-default': '默认',
    'theme-christmas': '圣诞节',
    'theme-summer_holidays': '暑假',
    'theme-cny': '中国春节',
    'error-invalid-number-of-packets': '红包数量无效',
    'error-invalid-number-of-tokens': "红包金额无效",
    'error-invalid-probability': "概率错误，请使用 0-100 ",
    'error-invalid-expiration-time': "有效期错误，请使用 1-7 天",
    'error-no-message': "善待你的好友，给他们一个问候!",
    'error-packet-creation-failed': "无法创建红包，请稍后再试。",
    'technical-preview-title': '备注: 技术预览版',
    'technical-preview-info': '红包服务是最近推出的服务，目前仍然是技术预览版。请确保只创建小额代币的红包。',

    /***********
    * Settings *
    ************/
    'settings-title': '设置',
    'profile-visibility': '个人资料可见性',
    'profile-visibility-hint': '抢红包时发送我的 Elastos DID 档案',

    /*****************
    * Packet details *
    ******************/
    'grabbing-packet': '正在抢红包...请稍候',
    'packet-is-live': '您的红包已激活!',
    'packet-is-not-live': '您的红包还未激活!',
    'this-packet-is-not-live': '此红包尚未激活',
    'packet-is-expired': '此红包已过期',
    'error-retrieve-packet': '无法获取红包信息，请稍后重试',
    'grab-me': '抢!',
    'grab-packet': '抢红包',
    'anonymous-offering': '一位慷慨的匿名朋友正在提供一些',
    'anonymous-offered-you': 'A generous anonymous friend just offered you',
    'creator-offering': '<b>{{ creator }}</b> 提供一些',
    'grab-lost': '祝您下次好运!',
    'grab-too-late': '太慢了，红包已被抢光...',
    'grab-too-late-2': '太晚了，没有红包了...',
    'information': '信息',
    'distributed-packets': '已发布红包',
    'n-packets': '{{ packets }} 红包',
    'distributed-tokens': '已发布代币',
    'n-tokens': '{{ tokens }} {{ symbol }}',
    'distribution-model': '发布模式',
    'probability-to-win': '获胜概率',
    'most-recent-winners': '最近抢到红包者',
    'fetching-winners': '获取抢到红包者',
    'no-winner': '显示所有抢到红包者',
    'complete-payment': '完成支付',
    'date-time-at': '',
    'creator-sent-you': '{{ creator }} 发给你',
    'you-grabbed': 'Congratulations, you grabbed',
    'random': '随机',
    'fixed-amounts': '固定金额',
    'anonymous': "匿名",
    'packet-url-copied': "红包 URL 已复制，您现在可以分享此红包!",
    'packet-share-title': "送您一个红包!",
    'got-it': '您已抢到一个红包，代币很快就会送到您的钱包',
    'copy-link': '复制链接',
    'share-link': '分享链接',
    'no-user-wallet': 'You currently don\'t have any wallet. Please create or import a wallet in Essentials in order to grab packets or to create your own packets.',

    /******
    * Pay *
    *******/
    'payment-title': '支付',
    'getting-packet-info': '正在获取红包信息，请稍候',
    'balance-not-enough': '当前的余额 {{ currentTokens }} {{ symbol }} 不足以支付 {{ targetTokens }} {{ symbol }}',
    'process': '进度',
    'step-n': '步骤 {{ step }}',
    'send-n-tokens': '发送 {{ amount }} {{ symbol }}',
    'n-tokens-sent': '{{ amount }} {{ symbol }} 已发送!',
    'payment-confirmation-error': '无法确认付款。此红包将被取消并退款，请尝试再创建一个红包。原因: ',
    'balance-n-tokens': '金额: {{ amount }} {{ symbol }}',
    'packet-is-live-pay': '红包生效',
    'total-symbol': '总共 {{ symbol }}',
    'transaction-fees': '交易手续费',
    'service-fees': '服务费',
    'public-option-fees': '选项: 公共红包',
    'note': '备注',
    'unspent-tokens-refunded': '未使用的代币和预置费用在红包到期时会退还',
    'view-packet': '查看红包',
    'base-service-fee-info': 'Base service fee of ${{ baseFee }}, paid in {{ symbol }}.',
    'public-service-fee-info': 'Additional public packet option at ${{ publicFee }}, paid in {{ symbol }}, plus {{ publicFeePercentage }}% of the total {{ packetSymbol }} in the packet.',
    'transaction-fees-info': 'Transaction fees are estimated based on the number of packets the service will send to winners.'
  }
}