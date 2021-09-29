package org.elastos.essentials.plugins.dappbrowser;

import android.app.Activity;
import android.content.Context;

import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;

import org.elastos.essentials.app.R;

import java.util.ArrayList;
import java.util.HashMap;

public class TitleBar extends FrameLayout {
    public interface OnIconClickedListener {
        void onIconCLicked(TitleBarIcon icon);
    }

    public interface OnMenuItemSelection {
        void onMenuItemSelected(TitleBarMenuItem menuItem);
    }

    // UI
    public ProgressBar progressBar;
    public TitleBarIconView btnOuterLeft = null;
    public TitleBarIconView btnInnerLeft = null;
    TitleBarIconView btnInnerRight = null;
    public TitleBarIconView btnOuterRight = null;
    TextView tvTitle = null;
    FrameLayout flRoot = null;
    PopupWindow menuPopup = null;
    TextView tvAnimationHint = null;
    public UrlEditText txtUrl = null;
    boolean darkMode = false;

    // UI model
    AlphaAnimation onGoingProgressAnimation = null;

    // Model
    DappBrowserDialog dialog = null;
    String appId = null;
    boolean isLauncher = false;
    // Reference count for progress bar activity types. An app can start several
    // activities at the same time and the progress bar
    // keeps animating until no one else needs progress animations.
    HashMap<TitleBarActivityType, Integer> activityCounters = new HashMap<TitleBarActivityType, Integer>();
    HashMap<TitleBarActivityType, String> activityHintTexts = new HashMap<TitleBarActivityType, String>();
    ArrayList<TitleBarMenuItem> menuItems = new ArrayList<>();
    HashMap<String, OnIconClickedListener> onIconClickedListenerMap = new HashMap<>();
    boolean currentNavigationIconIsVisible = true;
    TitleBarNavigationMode currentNavigationMode = TitleBarNavigationMode.HOME;
    TitleBarIcon outerLeftIcon = null;
    TitleBarIcon innerLeftIcon = null;
    TitleBarIcon innerRightIcon = null;
    TitleBarIcon outerRightIcon = null;

    public TitleBar(Context context, AttributeSet attrs) {
        super(context, attrs);

        LayoutInflater inflater = LayoutInflater.from(getContext());
        inflater.inflate(R.layout.title_bar, this, true);
    }

    public void initialize(DappBrowserOptions options) {
        btnOuterLeft = findViewById(R.id.btnOuterLeft);
        btnInnerLeft = findViewById(R.id.btnInnerLeft);

        btnOuterRight = findViewById(R.id.btnOuterRight);
        tvTitle = findViewById(R.id.tvTitle);
        flRoot = findViewById(R.id.flRoot);

        txtUrl = findViewById(R.id.txtUrl);

        btnOuterLeft.setOnClickListener(v -> {
            handleOuterLeftClicked();
        });

        btnInnerLeft.setOnClickListener(v -> {
            handleInnerLeftClicked();
        });

        btnOuterRight.setOnClickListener(v -> {
            handleOuterRightClicked();
        });

        darkMode = options.darkmode;
        setTitle(options.title);
        updateIcons();
    }

    private boolean darkModeUsed() {
        return darkMode;
    }

    private void toggleMenu() {
        if (menuPopup == null) {
            LayoutInflater inflater = LayoutInflater.from(getContext());
            View menuView = inflater.inflate(R.layout.title_bar_menu, null);
            menuPopup = new PopupWindow(menuView, RelativeLayout.LayoutParams.MATCH_PARENT,
                    RelativeLayout.LayoutParams.MATCH_PARENT, true);

            menuPopup.setClippingEnabled(false);

            // Catch events to hide
            menuView.setOnClickListener(v -> {
                closeMenuPopup();
            });
            menuPopup.setOnDismissListener(() -> {
                menuPopup = null;
            });

            // Append menu items
            if (menuItems != null) {
                LinearLayout llMenuItems = menuView.findViewById(R.id.llMenuItems);
                for (TitleBarMenuItem mi : menuItems) {
                    View menuItemView = inflater.inflate(R.layout.title_bar_menu_item, llMenuItems, false);
                    menuItemView.setOnClickListener(v -> {
                        closeMenuPopup();
                        handleIconClicked(mi);
                    });

                    // Setup menu item content

                    // Icon
                    TitleBarIconView ivIcon = menuItemView.findViewById(R.id.ivIcon);
                    setImageViewFromIcon(ivIcon, mi);

                    // Icon - grayscale effect
                    if (mi.isBuiltInIcon()) {
                        ivIcon.setColorFilter(Color.parseColor("#444444"));
                    } else {
                        ColorMatrix matrix = new ColorMatrix();
                        matrix.setSaturation(0);

                        ColorMatrixColorFilter filter = new ColorMatrixColorFilter(matrix);
                        ivIcon.setColorFilter(filter);
                    }

                    // Title
                    ((TextView) menuItemView.findViewById(R.id.tvTitle)).setText(mi.title);

                    menuItemView.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));

                    llMenuItems.addView(menuItemView);
                }
            }

            // Make is touchable outside
            menuPopup.setBackgroundDrawable(new BitmapDrawable());
            menuPopup.setOutsideTouchable(true);
            menuPopup.setFocusable(true);

            // Animate
            menuPopup.setAnimationStyle(R.style.TitleBarMenuAnimation);

            // Show relatively to the title bar itself, to simulate it's stuck on the right
            // (didn't find a better way)
            menuView.measure(MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
                    MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED));
            menuPopup.showAsDropDown(this, 0, 0);
        } else {
            closeMenuPopup();
        }
    }

    private void closeMenuPopup() {
        menuPopup.dismiss();
        menuPopup = null;
    }

    public void setTitle(String title) {
        if (title != null) {
            tvTitle.setText(title);
            tvTitle.setVisibility(View.VISIBLE);
            txtUrl.setVisibility(View.GONE);
        }
        else {
            txtUrl.setVisibility(View.VISIBLE);
            tvTitle.setVisibility(View.GONE);
        }
    }

    public boolean setBackgroundColor(String backgroundColor) {
        try {
            int color = Color.parseColor(backgroundColor);
            flRoot.setBackgroundColor(color);
            return true;
        } catch (Exception e) {
            // Wrong color format?
            return false;
        }
    }

    public void setForeground(String backgroundColor) {
        int color  = Color.parseColor(backgroundColor);
    }

    public void setForegroundMode(TitleBarForegroundMode mode) {
        int color;

        if (mode == TitleBarForegroundMode.DARK) {
            color = Color.parseColor("#000000");
        } else {
            color = Color.parseColor("#F5F7FE");
        }

        tvTitle.setTextColor(color);
        btnOuterLeft.setColorFilter(color);
        btnInnerLeft.setColorFilter(color);
        btnOuterRight.setColorFilter(color);
    }

    public void setNavigationMode(TitleBarNavigationMode navigationMode) {

        currentNavigationMode = navigationMode;

        updateIcons();
    }

    public void setNavigationIconVisibility(boolean visible) {
        currentNavigationIconIsVisible = visible;
        setNavigationMode(currentNavigationMode);
    }

    public void setIcon(TitleBarIconSlot iconSlot, TitleBarIcon icon) {
        switch (iconSlot) {
            case OUTER_LEFT:
                outerLeftIcon = icon;
                break;
            case INNER_LEFT:
                innerLeftIcon = icon;
                break;
            case OUTER_RIGHT:
                outerRightIcon = icon;
                break;
            default:
                // Nothing to do, wrong info received
        }

        updateIcons();
    }

    public void setBadgeCount(TitleBarIconSlot iconSlot, int badgeCount) {
        switch (iconSlot) {
            case OUTER_LEFT:
                if (!currentNavigationIconIsVisible)
                    btnOuterLeft.setBadgeCount(badgeCount);
                break;
            case INNER_LEFT:
                btnInnerLeft.setBadgeCount(badgeCount);
                break;
            case OUTER_RIGHT:
                if (emptyMenuItems())
                    btnOuterRight.setBadgeCount(badgeCount);
                break;
            default:
                // Nothing to do, wrong info received
        }
    }

    public void addOnItemClickedListener(String functionString, OnIconClickedListener listener) {
        this.onIconClickedListenerMap.put(functionString, listener);
    }

    public void removeOnItemClickedListener(String functionString) {
        this.onIconClickedListenerMap.remove(functionString);
    }

    public void setupMenuItems(ArrayList<TitleBarMenuItem> menuItems) {
        this.menuItems = menuItems;

        updateIcons();
    }

    /**
     * Updates all icons according to the overall configuration
     */
    private void updateIcons() {
        if (darkMode) {
            setBackgroundColor("#000000");
            setForegroundMode(TitleBarForegroundMode.LIGHT);
        }
        else {
            setBackgroundColor("#F5F7FE");
            setForegroundMode(TitleBarForegroundMode.DARK);
        }
        txtUrl.setEditColor(darkMode);

        btnOuterLeft.setImageResource(darkMode ? R.drawable.ic_elastos_darkmode : R.drawable.ic_elastos);
        btnOuterLeft.setVisibility(View.VISIBLE);
        btnInnerLeft.setImageResource(darkMode ? R.drawable.ic_back_darkmode : R.drawable.ic_back);
        btnInnerLeft.setVisibility(View.VISIBLE);
        btnOuterRight.setImageResource(darkMode ? R.drawable.ic_vertical_menu_darkmode : R.drawable.ic_vertical_menu);
        btnOuterRight.setVisibility(View.VISIBLE);
    }

    /**
     * Ths icon path can be a capsule-relative path such as "assets/icons/pic.png",
     * or a built-in icon string such as "close" or "settings".
     */
    private void setImageViewFromIcon(TitleBarIconView iv, TitleBarIcon icon) {
        if (icon.iconPath == null)
            return;

            if (icon.isBuiltInIcon()) {
                // Use a built-in app icon
                switch (icon.builtInIcon) {
                    case BACK:
                        if (darkModeUsed()) {
                            iv.setImageResource(R.drawable.ic_back_darkmode);
                        } else {
                            iv.setImageResource(R.drawable.ic_back);
                        }
                        break;
                    case LOCK:
                        if (darkModeUsed()) {
                            iv.setImageResource(R.drawable.ic_url_lock_darkmode);
                        } else {
                            iv.setImageResource(R.drawable.ic_url_lock);
                        }
                        break;
                    case VERTICAL_MENU:
                        if (darkModeUsed()) {
                            iv.setImageResource(R.drawable.ic_vertical_menu_darkmode);
                        } else {
                            iv.setImageResource(R.drawable.ic_vertical_menu);
                        }
                        break;
                    case ELASTOS:
                        if (darkModeUsed()) {
                            iv.setImageResource(R.drawable.ic_elastos_darkmode);
                        } else {
                            iv.setImageResource(R.drawable.ic_elastos);
                        }
                        break;
                    case CLOSE:
                    default:
                        if (darkModeUsed()) {
                            iv.setImageResource(R.drawable.ic_close_darkmode);
                        } else {
                            iv.setImageResource(R.drawable.ic_close);
                        }
                }
            }
            else {
                // Custom app image, try to load it
    //            String iconPath = appManager.getAppPath(appInfo) + icon.iconPath;
    //            iv.setImageURI(Uri.parse(iconPath));
            }
    }

    private void handleIconClicked(TitleBarIcon icon) {
        for (OnIconClickedListener listenr : this.onIconClickedListenerMap.values()) {
            listenr.onIconCLicked(icon);
        }
    }

    public void handleOuterLeftClicked() {
        DappBrowserPlugin.getInstance().webViewHandler.goToLauncher();
    }

    private void handleInnerLeftClicked() {
        WebViewHandler webViewHandler = DappBrowserPlugin.getInstance().webViewHandler;
        if (webViewHandler.canGoBack()) {
            webViewHandler.goBack();
        }
        else {
            webViewHandler.close();
        }
    }

    private void handleInnerRightClicked() {
        handleIconClicked(innerRightIcon);
    }

    private void handleOuterRightClicked() {
        DappBrowserPlugin.getInstance().webViewHandler.setMenuEvent();
//        if (!emptyMenuItems()) {
//            // Title bar has menu items, so we open the menu
//            toggleMenu();
//        } else {
//            // No menu items: this is a custom icon
//            handleIconClicked(outerRightIcon);
//        }
    }

    private boolean emptyMenuItems() {
        return menuItems == null || menuItems.size() == 0;
    }

    private Activity getActivity() {
        return ((Activity) this.getContext());
    }

}
