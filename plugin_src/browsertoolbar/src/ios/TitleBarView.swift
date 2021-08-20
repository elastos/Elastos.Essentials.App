//
//  TestView.swift
//  elastOS
//
//  Created by Benjamin Piette on 16/02/2020.
//

import Foundation
import UIKit

public enum TitleBarActivityType: Int {
    /** There is an on going download. */
    case DOWNLOAD = 0
    /** There is an on going upload. */
    case UPLOAD = 1
    /** There is on going application launch. */
    case LAUNCH = 2
    /** There is another on going operation of an indeterminate type. */
    case OTHER = 3
}

public enum TitleBarForegroundMode: Int {
    case LIGHT = 0
    case DARK = 1
}

public enum TitleBarNavigationMode: Int {
    case HOME = 0
    case CLOSE = 1
    case ACCOUNT = 2
}

public enum TitleBarIconSlot: Int {
    /** Icon on title bar's left edge. */
    case OUTER_LEFT = 0
    /** Icon between the outer left icon and the title. */
    case INNER_LEFT = 1
    /** Icon between the title and the outer right icon. */
    case INNER_RIGHT = 2
    /** Icon on title bar's right edge. */
    case OUTER_RIGHT = 3
}

enum BuiltInIcon: String {
    case BACK = "back"
    case CLOSE = "close"
    case SCAN = "scan"
    case ADD = "add"
    case DELETE = "delete"
    case SETTINGS = "settings"
    case HELP = "help"
    case HORIZONTAL_MENU = "horizontal_menu"
    case VERTICAL_MENU = "vertical_menu"
    case EDIT = "edit"
    case FAVORITE = "favorite"
}

public class TitleBarIcon {
    var key: String = ""
    var iconPath: String? = nil
    var builtInIcon: BuiltInIcon? = nil

    init() {}

    init(key: String, iconPath: String) {
        self.key = key
        self.iconPath = iconPath
    }

    public static func fromJSONObject(jsonObject: NSDictionary?) -> TitleBarIcon? {
        if (jsonObject == nil) {
            return nil
        }

        let icon = TitleBarIcon()

        do {
            try icon.fillFromJSONObject(jsonObject!)
            return icon
        }
        catch (let error) {
            print(error)
            return nil
        }
    }

    func fillFromJSONObject(_ jsonObject: NSDictionary) throws {
        key = jsonObject["key"] as! String
        iconPath = jsonObject["iconPath"] as? String ?? BuiltInIcon.ADD.rawValue

        // Try to convert it to a built in icon
        builtInIcon = BuiltInIcon(rawValue: iconPath!)
    }

    public func toJSONObject() throws -> NSDictionary {
        let jsonObject = NSMutableDictionary()
        try fillJSONObject(jsonObject)
        return jsonObject
    }

    func fillJSONObject(_ jsonObject: NSMutableDictionary) throws {
        jsonObject["key"] = key
        jsonObject["iconPath"] = iconPath
    }

    public func isBuiltInIcon() -> Bool {
        return builtInIcon != nil
    }
}

public class TitleBarMenuItem : TitleBarIcon {
    var title: String = ""

    override init() {
        super.init()
    }

    init(key: String, iconPath: String, title: String) {
        super.init(key: key, iconPath: iconPath)
        self.title = title
    }

    public static func fromMenuItemJSONObject(jsonObject: NSDictionary?) -> TitleBarMenuItem? {
        if (jsonObject == nil) {
            return nil
        }

        let icon = TitleBarMenuItem()

        do {
            try icon.fillFromJSONObject(jsonObject!)
            return icon
        }
        catch (let error) {
            print(error)
            return nil
        }
    }

    override func fillJSONObject(_ jsonObject: NSMutableDictionary) throws {
        try super.fillJSONObject(jsonObject)
        jsonObject["title"] = title
    }

    override func fillFromJSONObject(_ jsonObject: NSDictionary) throws {
        try super.fillFromJSONObject(jsonObject)
        title = jsonObject["title"] as! String
    }
}

public enum TitleBarVisibility: Int {
    /** The internal title bar is visible (default) */
    case visible = 0
    /** The internal title bar is totally hidden. */
    case hidden = 1
}

public enum NativeStatusBarVisibility: Int {
    /** The native platform status bar is visible (default) */
    case visible = 0
    /** The native platform status bar is totally hidden (elastOS is over it). */
    case hidden = 1
}

typealias OnIconClickedListener = ((TitleBarIcon)->Void)

public protocol TitleBarColorChangedListener: NSObject {
    func onTitleBarColorChangedListener(backgroundColor: String, useLightContent: Bool)->Void
}

private class WeakListener {
    weak var listener: TitleBarColorChangedListener?
    init (_ listener: TitleBarColorChangedListener) {
     self.listener = listener
    }
}

class TitleBarView: UIView, PreferenceChangedListener {
    // Model
    weak var viewController: TrinityViewController?
    var appId: String?
    var isLauncher = false
    var activityCounters = Dictionary<TitleBarActivityType, Int>()
    var activityHintTexts = Dictionary<TitleBarActivityType, String?>()
    var customBackgroundUsed = false
    var menuItems: [TitleBarMenuItem] = []
    // var onIconClickedListener : ((TitleBarIcon)->Void)? = nil
    var onIconClickedListenerMap : [String: OnIconClickedListener] = [:]
    var currentNavigationIconIsVisible: Bool = true
    var currentNavigationMode = TitleBarNavigationMode.HOME
    var outerLeftIcon: TitleBarIcon? = nil
    var innerLeftIcon: TitleBarIcon? = nil
    var innerRightIcon: TitleBarIcon? = nil
    var outerRightIcon: TitleBarIcon? = nil
    var currentBackgroundColor: String = ""
    var currentForegroundMode = TitleBarForegroundMode.LIGHT
    private var colorChangedListeners: [WeakListener]? = [] // List of listeners for color (background, foreground) changed events

    // UI
    @IBOutlet var rootView: UIView!

    @IBOutlet weak var btnOuterLeft: TitleBarIconView!
    @IBOutlet weak var btnInnerLeft: TitleBarIconView!
    @IBOutlet weak var btnInnerRight: TitleBarIconView!
    @IBOutlet weak var btnOuterRight: TitleBarIconView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var animationHintLabel: UILabel!

    @IBOutlet weak var progressBarBackground: UIView!
    @IBOutlet weak var progressBar: UIView!

    var gradientLayer: CAGradientLayer? = nil

    init(_ viewController: TrinityViewController, _ frame: CGRect, _ isLauncher: Bool, _ appId: String) {
        super.init(frame: frame)

        self.viewController = viewController;
        self.isLauncher = isLauncher;
        self.appId = appId

        let view = loadViewFromNib();

        addSubview(view)
        self.addMatchChildConstraints(child: view)

        btnOuterLeft.setOnClickListener() {
            self.handleOuterLeftClicked()
        }

        btnInnerLeft.setOnClickListener() {
            self.handleInnerLeftClicked()
        }

        btnInnerRight.setOnClickListener() {
            self.handleInnerRightClicked()
        }

        btnOuterRight.setOnClickListener() {
            self.handleOuterRightClicked()
        }

        activityCounters[.LAUNCH] = 0
        activityCounters[.DOWNLOAD] = 0
        activityCounters[.UPLOAD] = 0
        activityCounters[.OTHER] = 0

        activityHintTexts[.LAUNCH] = nil
        activityHintTexts[.DOWNLOAD] = nil
        activityHintTexts[.UPLOAD] = nil
        activityHintTexts[.OTHER] = nil

        if darkModeUsed() {
            _ = setBackgroundColor("#191a2f")
            setForegroundMode(.LIGHT)
        }
        else {
            _ = setBackgroundColor("#f8f8ff")
            setForegroundMode(.DARK)
        }
                
        // Hide the navigation mode icon in native mode, but only for the root user app. Built-in hidden apps like the qr code scanner can have a close icon
        updateIdentityAccountIcon()

        PreferenceManager.getShareInstance().addPreferenceChangedListener(self)

        setAnimationHintText(nil)

        updateIcons()
    }

    override init(frame: CGRect) {
        self.viewController = nil
        self.appId = ""
        self.isLauncher = false
        super.init(frame: frame)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func onPreferenceChangedListener(_ key: String, _ value: Any?) {
        if key == "internalidentity.inuse" {
            updateIdentityAccountIcon()
        }
    }
    
    private func updateIdentityAccountIcon() {
        if weAreInTrinityNativeMainDApp() {
            if temporaryDIDInUse() {
                setNavigationMode(TitleBarNavigationMode.ACCOUNT)
                setNavigationIconVisibility(visible: true)
            }
            else {
                setNavigationIconVisibility(visible: false)
            }
        }
    }
    
    private func weAreInTrinityNativeMainDApp() -> Bool {
        return ConfigManager.getShareInstance().isNativeBuild() && appId == ConfigManager.getShareInstance().getStringValue("native.startup.dapppackage", nil)
    }
    
    private func temporaryDIDInUse() -> Bool {
        return PreferenceManager.getShareInstance().getBoolValue("internalidentity.inuse", false)
    }
    
    private func darkModeUsed() -> Bool {
        return PreferenceManager.getShareInstance().getBoolValue("ui.darkmode", true)
    }
    
    public func addColorChangedListener(_ listener: TitleBarColorChangedListener) {
        self.colorChangedListeners?.append(WeakListener(listener))
        notifyColorChangedListeners() // Notify immediatelly for initial refresh with current values.
    }

    public func removeColorChangedListener(_ listener: TitleBarColorChangedListener) {
        self.colorChangedListeners = self.colorChangedListeners?.filter({ $0 as AnyObject !== listener as AnyObject })
    }
    
    private func notifyColorChangedListeners() {
        // Notify listeners
        self.colorChangedListeners?.forEach { listener in
            listener.listener?.onTitleBarColorChangedListener(backgroundColor: self.currentBackgroundColor, useLightContent: (self.currentForegroundMode == TitleBarForegroundMode.LIGHT))
        }
    }

    /*func setHorizontalGradientBackground(from: String, to: String) {
        if gradientLayer == nil {
            gradientLayer = CAGradientLayer()
            layer.insertSublayer(gradientLayer!, at: 0)
        }

        let fromColor = UIColor(hex: from)!
        let toColor = UIColor(hex: to)!

        gradientLayer!.colors = [fromColor.cgColor, toColor.cgColor]
        gradientLayer!.startPoint = CGPoint(x: 0.0, y: 0.5)
        gradientLayer!.endPoint = CGPoint(x: 1.0, y: 0.5)
        gradientLayer!.locations = [0, 1]
        gradientLayer!.frame = bounds
    }*/

    private func closeApp() {
        try? AppManager.getShareInstance().close(self.appId!, AppManager.STARTUP_APP, nil)
    }
    
    private func showTemporaryIdentityToManageAccount() {
        do {
            // DIRTY CODE - NEED HELPER METHODS IN INTENT MANAGER FOR THIS...
            let action = "https://myfirstidentity.elastos.net/manageidentity"
            let info = IntentInfo(action, nil, appId!, nil, false)
            let filters = try IntentManager.getShareInstance().getInternalIntentFilter(info)
            if (filters.count > 0) {
                info.filter = filters[0]
                try IntentManager.getShareInstance().sendIntent(info)
            }
        }
        catch (let error) {
            print(error)
        }
    }
    
    private func goToLauncher() {
        do {
            if (!isLauncher) {
                try AppManager.getShareInstance().loadLauncher()
                try AppManager.getShareInstance().sendLauncherMessageMinimize(appId!)
            }
        }
        catch {
            print(error)
        }
    }

    private func toggleMenu() {
        let menuView = TitleBarMenuView(titleBar: self, frame: CGRect.null, appId: appId!, menuItems: menuItems)

        menuView.setOnMenuItemClickedListened() { menuItem in
            self.handleIconClicked(icon: menuItem)
        }

        menuView.show(inRootView: self.viewController!.view)
    }

    private func sendMessageToLauncher(message: String) {
        do {
            try AppManager.getShareInstance().sendLauncherMessage(AppManager.MSG_TYPE_INTERNAL, message, appId!)
        }
        catch {
            print("Send message: '\(message)' error!")
        }
    }

    public func showActivityIndicator(activityType: TitleBarActivityType, hintText: String?) {
        // Don't show activity indicators on ios/itunes
        if ConfigManager.getShareInstance().getStringValue("build.variant", "") == "itunesappstore" {
            return
        }
        
        // Don't show activity indicators in native builds.
        if ConfigManager.getShareInstance().isNativeBuild() {
            return
        }

        // Increase reference count for this progress animation type
        activityCounters[activityType] = activityCounters[activityType]! + 1
        activityHintTexts[activityType] = hintText
        updateAnimation(activityType: activityType)
    }

    public func hideActivityIndicator(activityType: TitleBarActivityType) {
        // Decrease reference count for this progress animation type
        activityCounters[activityType] = max(0, activityCounters[activityType]! - 1)
        updateAnimation(activityType: activityType)
    }

    public func setTitle(_ title: String?) {
        if title != nil {
            titleLabel.text = title!//.uppercased()
        }
        else {
            titleLabel.text = AppManager.getShareInstance().getAppInfo(appId!)?.name//.uppercased()
        }
    }

    public func setBackgroundColor(_ hexColor: String) -> Bool {
        if let color = UIColor.init(hex: hexColor) {
            // Remove default gradient layer if any
            if gradientLayer != nil {
                gradientLayer!.removeFromSuperlayer()
                gradientLayer = nil
            }
            
            self.currentBackgroundColor = hexColor

            // Set custom background color
            rootView.backgroundColor = color

            customBackgroundUsed = true
            
            notifyColorChangedListeners()

            return true
        }
        else {
            return false
        }
    }

    public func setForegroundMode(_ mode: TitleBarForegroundMode) {
        var color: UIColor
        
        self.currentForegroundMode = mode

        if (mode == .DARK) {
            color = UIColor.init(hex: "#000000")!
        }
        else {
            color = UIColor.init(hex: "#FFFFFF")!
        }

        titleLabel.textColor = color
        animationHintLabel.textColor = color

        btnOuterLeft.iconView.leftImageColor = color
        btnInnerLeft.iconView.leftImageColor = color
        btnInnerRight.iconView.leftImageColor = color
        btnOuterRight.iconView.leftImageColor = color
        
        notifyColorChangedListeners()
    }
    
    public func setNavigationMode(_ navigationMode: TitleBarNavigationMode) {
        // Don't try to change to HOME navigation in trinity native. Some apps could call that but we don't allow it as this would overwrite the temporary DID account icon.
        if weAreInTrinityNativeMainDApp() && navigationMode == TitleBarNavigationMode.HOME {
            return
        }
        
        currentNavigationMode = navigationMode
        updateIcons()
    }
    
    public func setNavigationIconVisibility(visible: Bool) {
        currentNavigationIconIsVisible = visible
        setNavigationMode(currentNavigationMode)
    }

    public func setIcon(iconSlot: TitleBarIconSlot, icon: TitleBarIcon?) {
        switch (iconSlot) {
        case .OUTER_LEFT:
            outerLeftIcon = icon
            break
        case .INNER_LEFT:
            innerLeftIcon = icon
            break
        case .INNER_RIGHT:
            innerRightIcon = icon
            break
        case .OUTER_RIGHT:
            outerRightIcon = icon
            break
        default:
            // Nothing to do, wrong info received
            break
        }

        updateIcons()
    }

    public func setBadgeCount(iconSlot: TitleBarIconSlot, badgeCount: Int) {
        switch (iconSlot) {
        case .OUTER_LEFT:
            if !currentNavigationIconIsVisible {
                btnOuterLeft.setBadgeCount(badgeCount)
            }
            break;
        case .INNER_LEFT:
            btnInnerLeft.setBadgeCount(badgeCount);
            break;
        case .INNER_RIGHT:
            btnInnerRight.setBadgeCount(badgeCount);
            break;
        case .OUTER_RIGHT:
            if emptyMenuItems() {
                btnOuterRight.setBadgeCount(badgeCount)
            }
            break;
        default:
            // Nothing to do, wrong info received
            break
        }
    }

    public func addOnItemClickedListener(functionString: String, _ listener: @escaping OnIconClickedListener) {
        self.onIconClickedListenerMap[functionString] = listener
    }


    public func removeOnItemClickedListener(functionString: String) {
        self.onIconClickedListenerMap[functionString] = nil
    }

    public func setupMenuItems(menuItems: [TitleBarMenuItem]) {
        self.menuItems = menuItems
        updateIcons()
    }

    /**
     * Updates all icons according to the overall configuration
     */
    private func updateIcons() {
        // Adjust icon sizes
        btnOuterLeft.iconView.leftImageWidth = 20
        btnOuterLeft.iconView.leftImageHeight = 20
        btnOuterLeft.iconView.spacingLeading = 10
        btnInnerLeft.iconView.leftImageWidth = 20
        btnInnerLeft.iconView.leftImageHeight = 20
        btnInnerLeft.iconView.spacingLeading = 10
        btnInnerRight.iconView.leftImageWidth = 20
        btnInnerRight.iconView.leftImageHeight = 20
        btnInnerRight.iconView.spacingLeading = 10
        btnOuterRight.iconView.leftImageWidth = 20
        btnOuterRight.iconView.leftImageHeight = 20
        btnOuterRight.iconView.spacingLeading = 10

        // Navigation icon / Outer left
        if (currentNavigationIconIsVisible) {
            btnOuterLeft.isHidden = false
            if (currentNavigationMode == TitleBarNavigationMode.CLOSE) {
                btnOuterLeft.iconView.leftImageSrc = UIImage(named: "ic_close")
            }
            else if (currentNavigationMode == TitleBarNavigationMode.ACCOUNT) {
                btnOuterLeft.iconView.leftImageSrc = UIImage(named: "ic_account")
            } else {
                // Default = HOME
                btnOuterLeft.iconView.leftImageSrc = UIImage(named: "ic_elastos_home")
            }
        }
        else {
            // Navigation icon not visible - check if there is a configured outer icon
            if (outerLeftIcon != nil) {
                btnOuterLeft.isHidden = false
                setImageViewFromIcon(iv: btnOuterLeft, icon: outerLeftIcon!)
            }
            else {
                btnOuterLeft.isHidden = true
            }
        }

        // Inner left
        if (innerLeftIcon != nil) {
            btnInnerLeft.isHidden = false
            setImageViewFromIcon(iv: btnInnerLeft, icon: innerLeftIcon!)
        }
        else {
            btnInnerLeft.isHidden = true
        }

        // Inner right
        if (innerRightIcon != nil) {
            btnInnerRight.isHidden = false
            setImageViewFromIcon(iv: btnInnerRight, icon: innerRightIcon!)
        }
        else {
            btnInnerRight.isHidden = true
        }

        // Menu icon / Outer right
        if (!emptyMenuItems()) {
            btnOuterRight.isHidden = false
            btnOuterRight.iconView.leftImageSrc = UIImage(named: "ic_menu")
        }
        else {
            if (outerRightIcon != nil) {
                btnOuterRight.isHidden = false
                setImageViewFromIcon(iv: btnOuterRight, icon: outerRightIcon!)
            }
            else {
                btnOuterRight.isHidden = true
            }
        }
    }

    /** Tells if the progress bar has to be animated or not. */
    private func stillHasOnGoingProgressActivity() -> Bool {
        return
            activityCounters[.LAUNCH]! > 0 ||
            activityCounters[.DOWNLOAD]! > 0 ||
            activityCounters[.UPLOAD]! > 0 ||
            activityCounters[.OTHER]! > 0
    }

    private func onGoingProgressActivityCount() -> Int {
        return
            activityCounters[.LAUNCH]! +
                activityCounters[.DOWNLOAD]! +
                activityCounters[.UPLOAD]! +
                activityCounters[.OTHER]!
    }

    /**
        * Ths icon path can be a capsule-relative path such as "assets/icons/pic.png", or a built-in icon string
        * such as "close" or "settings".
     */
    public func setImageViewFromIcon(iv: TitleBarIconView, icon: TitleBarIcon) {
        guard icon.iconPath != nil else {
            return
        }

        if icon.isBuiltInIcon() {
            // Use a built-in app icon
            switch icon.builtInIcon! {
            case .BACK :
                iv.iconView.leftImageSrc = UIImage(named: "ic_back")
                break;
            case .SCAN:
                iv.iconView.leftImageSrc = UIImage(named: "ic_scan")
                break;
            case .ADD:
                iv.iconView.leftImageSrc = UIImage(named: "ic_add")
                break;
            case .DELETE:
                iv.iconView.leftImageSrc = UIImage(named: "ic_delete")
                break;
            case .SETTINGS:
                iv.iconView.leftImageSrc = UIImage(named: "ic_settings")
                break;
            case .HELP:
                iv.iconView.leftImageSrc = UIImage(named: "ic_help")
                break;
            case .HORIZONTAL_MENU:
                iv.iconView.leftImageSrc = UIImage(named: "ic_menu")
                break;
            case .VERTICAL_MENU:
                iv.iconView.leftImageSrc = UIImage(named: "ic_menu") // TODO: ic_vertical_menu
                break;
            case .EDIT:
                iv.iconView.leftImageSrc = UIImage(named: "ic_edit")
                break;
            case .FAVORITE:
                iv.iconView.leftImageSrc = UIImage(named: "ic_fav")
                break;
            case .CLOSE:
                iv.iconView.leftImageSrc = UIImage(named: "ic_close")
            default:
                iv.iconView.leftImageSrc = UIImage(named: "ic_close")
            }
        }
        else {
            // Custom app image, try to load it
            let appInfo = AppManager.getShareInstance().getAppInfo(appId!)!

            let remotebackup = appInfo.remote;
            appInfo.remote = false // TODO - DIRTY! FIND A BETTER WAY TO GET THE REAL IMAGE PATH FROM JS PATH !
            let iconPath = AppManager.getShareInstance().getAppPath(appInfo) + icon.iconPath!
            appInfo.remote = remotebackup;

            // Icon
            if let image = UIImage(contentsOfFile: iconPath) {
                iv.iconView.leftImageSrc = image
            }
        }
    }

    private func handleIconClicked(icon: TitleBarIcon) {
        for onIconClickedListener in onIconClickedListenerMap.values {
            onIconClickedListener(icon)
        }
    }
    
    private func handleOuterLeftClicked() {
        if (currentNavigationIconIsVisible) {
            // Action handled by runtime: minimize, or close
            if (currentNavigationMode == .CLOSE) {
                closeApp()
            }
            else if (currentNavigationMode == TitleBarNavigationMode.ACCOUNT) {
                showTemporaryIdentityToManageAccount()
            }
            else {
                // Default: HOME
                goToLauncher()
            }
        }
        else {
            // Action handled by the app
            handleIconClicked(icon: outerLeftIcon!)
        }
    }

    private func handleInnerLeftClicked() {
        handleIconClicked(icon: innerLeftIcon!)
    }

    private func handleInnerRightClicked() {
        handleIconClicked(icon: innerRightIcon!)
    }

    private func handleOuterRightClicked() {
        if (!emptyMenuItems()) {
            // Title bar has menu items, so we open the menu
            toggleMenu()
        }
        else {
            // No menu items: this is a custom icon
            handleIconClicked(icon: outerRightIcon!)
        }
    }

    private func emptyMenuItems() -> Bool {
        return menuItems.count == 0
    }
    
    public func changeVisibility(titleBarVisibility: TitleBarVisibility, nativeStatusBarVisibility: NativeStatusBarVisibility) {
        // Trinity title bar
        viewController!.setTitleBarVisibility(titleBarVisibility)

        // Native status bar
        if nativeStatusBarVisibility == .visible {
            AppManager.getShareInstance().mainViewController.setNormalScreenMode()
        }
        else {
            AppManager.getShareInstance().mainViewController.setImmersiveScreenMode()
        }
    }

    private func setAnimationHintText(_ text: String?) {
        if (text == nil) {
            animationHintLabel.isHidden = true
        }
        else {
            animationHintLabel.isHidden = false
            animationHintLabel.text = text
        }
    }

    /**
     * Based on the counters for each activity, determines which activity type has the priority and plays the appropriate animation.
     * If no more animation, the animation is stopped
     */
    private func updateAnimation(activityType: TitleBarActivityType) {
        // Check if an animation should be launched, and which one
        var backgroundColor: String? = nil
        if (activityCounters[.LAUNCH] ?? 0) > 0 {
            if darkModeUsed() {
                backgroundColor = "#FFFFFF"
            }
            else {
                backgroundColor = "#444444"
            }
            setAnimationHintText(activityHintTexts[.LAUNCH, default: ""])
        }
        else if (activityCounters[.DOWNLOAD] ?? 0) > 0
            || (activityCounters[.UPLOAD] ?? 0) > 0 {
            backgroundColor = "#ffde6e"
            if (activityCounters[.DOWNLOAD] ?? 0) > 0 {
                setAnimationHintText(activityHintTexts[.DOWNLOAD, default: ""])
            }
            else {
                setAnimationHintText(activityHintTexts[.UPLOAD, default: ""])
            }
        }
        else if (activityCounters[.OTHER] ?? 0) > 0 {
            backgroundColor = "#20e3d2"
            setAnimationHintText(activityHintTexts[.OTHER, default: ""])
        }
        else {
            setAnimationHintText(nil)
        }

        if (backgroundColor != nil) {
            progressBar.isHidden = false
            progressBar.backgroundColor = UIColor.init(hex: backgroundColor!)

            // Only start a new animation if we are the first animation to start.
            if onGoingProgressActivityCount() == 1 {
                animateProgressBarIn()
            }
        }
        else {
            progressBar.isHidden = true
        }
    }

    private func animateProgressBarIn() {
        let onGoingProgressAnimation = UIViewPropertyAnimator(duration: 0.3, curve: .easeOut, animations: {
            self.progressBar.alpha = 1.0
        })
        onGoingProgressAnimation.addCompletion { _ in
            if self.stillHasOnGoingProgressActivity() {
                self.animateProgressBarOut()
            }
        }
        onGoingProgressAnimation.startAnimation()
    }

    private func animateProgressBarOut() {
        let onGoingProgressAnimation = UIViewPropertyAnimator(duration: 1.0, curve: .easeOut, animations: {
            self.progressBar.alpha = 0.0
        })

        onGoingProgressAnimation.addCompletion { _ in
            if self.stillHasOnGoingProgressActivity() {
                self.animateProgressBarIn()
            }
        }
        onGoingProgressAnimation.startAnimation()
    }
}
