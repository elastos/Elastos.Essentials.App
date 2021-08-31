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
    View progressBar;
    public TitleBarIconView btnOuterLeft = null;
    public TitleBarIconView btnInnerLeft = null;
    TitleBarIconView btnInnerRight = null;
    public TitleBarIconView btnOuterRight = null;
    TextView tvTitle = null;
    FrameLayout flRoot = null;
    PopupWindow menuPopup = null;
    TextView tvAnimationHint = null;
    public UrlEditText editUrl = null;
    boolean darkMode = false;

    // UI model
    AlphaAnimation onGoingProgressAnimation = null;

    // Model
    InAppBrowserDialog dialog = null;
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

        activityCounters.put(TitleBarActivityType.DOWNLOAD, 0);
        activityCounters.put(TitleBarActivityType.UPLOAD, 0);
        activityCounters.put(TitleBarActivityType.LAUNCH, 0);
        activityCounters.put(TitleBarActivityType.OTHER, 0);

        activityHintTexts.put(TitleBarActivityType.DOWNLOAD, null);
        activityHintTexts.put(TitleBarActivityType.UPLOAD, null);
        activityHintTexts.put(TitleBarActivityType.LAUNCH, null);
        activityHintTexts.put(TitleBarActivityType.OTHER, null);
    }

    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();

        LayoutInflater inflater = LayoutInflater.from(getContext());
        inflater.inflate(R.layout.title_bar, this, true);
    }

    public void initialize(InAppBrowserDialog dialog, String appId) {
        this.dialog = dialog;
        this.appId = appId;

        progressBar = findViewById(R.id.progressBar);
        btnOuterLeft = findViewById(R.id.btnOuterLeft);
        btnInnerLeft = findViewById(R.id.btnInnerLeft);

        // btnInnerRight = findViewById(R.id.btnInnerRight);
        btnOuterRight = findViewById(R.id.btnOuterRight);
        tvTitle = findViewById(R.id.tvTitle);
        flRoot = findViewById(R.id.flRoot);
        tvAnimationHint = findViewById(R.id.tvAnimationHint);

        editUrl = findViewById(R.id.txtUrl);

        btnOuterLeft.setOnClickListener(v -> {
            handleOuterLeftClicked();
        });

        btnInnerLeft.setOnClickListener(v -> {
            handleInnerLeftClicked();
        });

        // btnInnerRight.setOnClickListener(v -> {
        // handleInnerRightClicked();
        // });

        btnOuterRight.setOnClickListener(v -> {
            handleOuterRightClicked();
        });

//        btnOuterLeft.setPaddingDp(12);
//        btnInnerLeft.setPaddingDp(12);
        // btnInnerRight.setPaddingDp(12);
//        btnOuterRight.setPaddingDp(12);

        setAnimationHintText(null);

        updateIcons();
    }

    public void setDarkMode(boolean darkMode) {
        if (this.darkMode != darkMode) {
            this.darkMode = darkMode;
            updateIcons();
        }
    }

    private boolean darkModeUsed() {
        return darkMode;
    }

    private void goToLauncher() {
        this.dialog.inAppBrowser.goToLauncher();
    }

    private void closeApp() {
        this.dialog.close();
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

    public void showActivityIndicator(TitleBarActivityType activityType, String hintText) {
        // NOTE: NON SENSE ON ANDROID - just kept to keep aligned code on android and
        // ios.
        // Don't show activity indicators on ios/itunes

        // Increase reference count for this progress animation type
        activityCounters.put(activityType, activityCounters.get(activityType) + 1);
        activityHintTexts.put(activityType, hintText);
        updateAnimation();
    }

    public void hideActivityIndicator(TitleBarActivityType activityType) {
        // Decrease reference count for this progress animation type
        activityCounters.put(activityType, Math.max(0, activityCounters.get(activityType) - 1));
        updateAnimation();
    }

    public void setTitle(String title) {
        if (title != null)
            tvTitle.setText(title/* .toUpperCase() */);
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
        tvAnimationHint.setTextColor(color);
        btnOuterLeft.setColorFilter(color);
        btnInnerLeft.setColorFilter(color);
        // btnInnerRight.setColorFilter(color);
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
            case INNER_RIGHT:
                innerRightIcon = icon;
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
            // case INNER_RIGHT:
            // btnInnerRight.setBadgeCount(badgeCount);
            // break;
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
        editUrl.setEditColor(darkMode);

        btnOuterLeft.setImageResource(darkMode ? R.drawable.ic_elastos_darkmode : R.drawable.ic_elastos);
        btnOuterLeft.setVisibility(View.VISIBLE);
        btnInnerLeft.setImageResource(darkMode ? R.drawable.ic_back_darkmode : R.drawable.ic_back);
        btnInnerLeft.setVisibility(View.VISIBLE);
        btnOuterRight.setImageResource(darkMode ? R.drawable.ic_vertical_menu_darkmode : R.drawable.ic_vertical_menu);
        btnOuterRight.setVisibility(View.VISIBLE);

        // // Navigation icon / Outer left
        // if (currentNavigationIconIsVisible) {
        // btnOuterLeft.setVisibility(View.VISIBLE);
        // if (currentNavigationMode == TitleBarNavigationMode.CLOSE) {
        // btnOuterLeft.setImageResource(R.drawable.ic_close);
        // } else if (currentNavigationMode == TitleBarNavigationMode.ACCOUNT) {
        // btnOuterLeft.setImageResource(R.drawable.ic_account);
        // } else {
        // // Default = HOME
        // btnOuterLeft.setImageResource(R.drawable.ic_elastos_home);
        // }
        // }
        // else {
        // // Navigation icon not visible - check if there is a configured outer icon
        // if (outerLeftIcon != null) {
        // btnOuterLeft.setVisibility(View.VISIBLE);
        // setImageViewFromIcon(btnOuterLeft, outerLeftIcon);
        // }
        // else {
        // btnOuterLeft.setVisibility(View.GONE);
        // }
        // }
        //
        // // Inner left
        // if (innerLeftIcon != null) {
        // btnInnerLeft.setVisibility(View.VISIBLE);
        // setImageViewFromIcon(btnInnerLeft, innerLeftIcon);
        // }
        // else {
        // btnInnerLeft.setVisibility(View.GONE);
        // }
        //
        // // Inner right
        // if (innerRightIcon != null) {
        // btnInnerRight.setVisibility(View.VISIBLE);
        // setImageViewFromIcon(btnInnerRight, innerRightIcon);
        // }
        // else {
        // btnInnerRight.setVisibility(View.GONE);
        // }
        //
        // // Menu icon / Outer right
        // if (menuItems.size() > 0) {
        // btnOuterRight.setVisibility(View.VISIBLE);
        // btnOuterRight.setImageResource(R.drawable.ic_menu);
        // }
        // else {
        // if (outerRightIcon != null) {
        // btnOuterRight.setVisibility(View.VISIBLE);
        // setImageViewFromIcon(btnOuterRight, outerRightIcon);
        // }
        // else {
        // btnOuterRight.setVisibility(View.GONE);
        // }
        // }
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
        if (currentNavigationIconIsVisible) {
            // Action handled by runtime: minimize, or close
            if (currentNavigationMode == TitleBarNavigationMode.CLOSE) {
                closeApp();
            } else {
                // Default: HOME
                goToLauncher();
            }
        } else {
            // Action handled by the app
            handleIconClicked(outerLeftIcon);
        }
    }

    private void handleInnerLeftClicked() {
        if (currentNavigationIconIsVisible) {
            if (this.dialog.inAppBrowser.canGoBack()) {
                this.dialog.inAppBrowser.goBack();
            }
            else {
                closeApp();
            }
        } else {
            handleIconClicked(innerLeftIcon);
        }
    }

    private void handleInnerRightClicked() {
        handleIconClicked(innerRightIcon);
    }

    private void handleOuterRightClicked() {
        if (!emptyMenuItems()) {
            // Title bar has menu items, so we open the menu
            toggleMenu();
        } else {
            // No menu items: this is a custom icon
            handleIconClicked(outerRightIcon);
        }
    }

    private boolean emptyMenuItems() {
        return menuItems == null || menuItems.size() == 0;
    }

    public void changeVisibility(TitleBarVisibility titleBarVisibility,
            NativeStatusBarVisibility nativeStatusBarVisibility) {
        // Trinity title bar
        if (titleBarVisibility == TitleBarVisibility.VISIBLE)
            this.setVisibility(View.VISIBLE);
        else
            this.setVisibility(View.GONE);

        // Native status bar
        // if (nativeStatusBarVisibility == NativeStatusBarVisibility.VISIBLE)
        // getActivity().setNormalScreenMode();
        // else
        // getActivity().setImmersiveScreenMode();
    }

    private Activity getActivity() {
        return ((Activity) this.getContext());
    }

    private void setAnimationHintText(String text) {
        if (text == null) {
            tvAnimationHint.setVisibility(View.GONE);
        } else {
            tvAnimationHint.setVisibility(View.VISIBLE);
            tvAnimationHint.setText(text);
        }
    }

    /**
     * Based on the counters for each activity, determines which activity type has
     * the priority and plays the appropriate animation. If no more animation, the
     * animation is stopped
     */
    private void updateAnimation() {
        // Check if an animation should be launched, and which one
        String backgroundColor = null;
        if (activityCounters.get(TitleBarActivityType.LAUNCH) > 0) {
            if (darkModeUsed())
                backgroundColor = "#FFFFFF";
            else
                backgroundColor = "#444444";
            setAnimationHintText(activityHintTexts.get(TitleBarActivityType.LAUNCH));
        } else if (activityCounters.get(TitleBarActivityType.DOWNLOAD) > 0
                || activityCounters.get(TitleBarActivityType.UPLOAD) > 0) {
            backgroundColor = "#ffde6e";
            if (activityCounters.get(TitleBarActivityType.DOWNLOAD) > 0)
                setAnimationHintText(activityHintTexts.get(TitleBarActivityType.DOWNLOAD));
            else
                setAnimationHintText(activityHintTexts.get(TitleBarActivityType.UPLOAD));
        } else if (activityCounters.get(TitleBarActivityType.OTHER) > 0) {
            backgroundColor = "#20e3d2";
            setAnimationHintText(activityHintTexts.get(TitleBarActivityType.OTHER));
        } else {
            setAnimationHintText(null);
        }

        if (backgroundColor != null) {
            final String bgColor = backgroundColor;
            // Animation init delay/context switch seems to be needed otherwise changing
            // visibility or background color of the progress bar blocks the UI.
            // Unclear reason for now.
            new Handler().postDelayed(() -> {
                ((Activity) getContext()).runOnUiThread(() -> {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setBackgroundColor(Color.parseColor(bgColor));

                    // If an animation is already in progress, don't interrupt it and just change
                    // the background color instead.
                    // Otherwise, start an animation
                    if (onGoingProgressAnimation == null) {
                        animateProgressBarIn();
                    }
                });
            }, 100);
        } else {
            // Animation init delay/context switch seems to be needed otherwise changing
            // visibility or background color of the progress bar blocks the UI.
            // Unclear reason for now.
            new Handler().postDelayed(() -> {
                ((Activity) getContext()).runOnUiThread(() -> {
                    stopProgressAnimation();
                    progressBar.setVisibility(View.INVISIBLE);
                });
            }, 100);
        }
    }

    private boolean hasActiveAnimation() {
        return activityCounters.get(TitleBarActivityType.DOWNLOAD) > 0
                || activityCounters.get(TitleBarActivityType.UPLOAD) > 0
                || activityCounters.get(TitleBarActivityType.LAUNCH) > 0
                || activityCounters.get(TitleBarActivityType.OTHER) > 0;
    }

    private void animateProgressBarIn() {
        if (!hasActiveAnimation())
            return;

        onGoingProgressAnimation = new AlphaAnimation(0.0f, 1.0f);

        onGoingProgressAnimation.setDuration(1000);
        onGoingProgressAnimation.setStartOffset(300);
        onGoingProgressAnimation.setFillAfter(false);
        onGoingProgressAnimation.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {

            }

            @Override
            public void onAnimationEnd(Animation animation) {
                onGoingProgressAnimation = null;
                animateProgressBarOut();
            }

            @Override
            public void onAnimationRepeat(Animation animation) {

            }
        });

        progressBar.startAnimation(onGoingProgressAnimation);
    }

    private void animateProgressBarOut() {
        onGoingProgressAnimation = new AlphaAnimation(1.0f, 0.0f);

        onGoingProgressAnimation.setDuration(1000);
        onGoingProgressAnimation.setFillAfter(false);
        onGoingProgressAnimation.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {
            }

            @Override
            public void onAnimationEnd(Animation animation) {
                onGoingProgressAnimation = null;
                animateProgressBarIn();
            }

            @Override
            public void onAnimationRepeat(Animation animation) {

            }
        });

        progressBar.startAnimation(onGoingProgressAnimation);
    }

    private void stopProgressAnimation() {
        if (onGoingProgressAnimation != null) {
            progressBar.clearAnimation();
            progressBar.animate().cancel();
            onGoingProgressAnimation.cancel();
            onGoingProgressAnimation = null;
        }
    }
}
