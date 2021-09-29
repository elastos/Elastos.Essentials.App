package org.elastos.essentials.plugins.dappbrowser;

import android.content.Context;

import android.graphics.Color;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

import org.elastos.essentials.app.R;

public class TitleBar extends FrameLayout {
    // UI
    public TitleBarIconView btnOuterLeft = null;
    public TitleBarIconView btnInnerLeft = null;
    public TitleBarIconView btnOuterRight = null;
    TextView tvTitle = null;
    FrameLayout flRoot = null;
    public UrlEditText txtUrl = null;
    boolean darkMode = false;

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

    public void setForegroundMode() {
        int color;

        if (!darkMode) {
            color = Color.parseColor("#000000");
        } else {
            color = Color.parseColor("#F5F7FE");
        }

        tvTitle.setTextColor(color);
        btnOuterLeft.setColorFilter(color);
        btnInnerLeft.setColorFilter(color);
        btnOuterRight.setColorFilter(color);
    }

    /**
     * Updates all icons according to the overall configuration
     */
    private void updateIcons() {
        if (darkMode) {
            setBackgroundColor("#000000");
        }
        else {
            setBackgroundColor("#F5F7FE");
        }
        setForegroundMode();
        txtUrl.setEditColor(darkMode);

        btnOuterLeft.setImageResource(darkMode ? R.drawable.ic_elastos_darkmode : R.drawable.ic_elastos);
        btnOuterLeft.setVisibility(View.VISIBLE);
        btnInnerLeft.setImageResource(darkMode ? R.drawable.ic_back_darkmode : R.drawable.ic_back);
        btnInnerLeft.setVisibility(View.VISIBLE);
        btnOuterRight.setImageResource(darkMode ? R.drawable.ic_vertical_menu_darkmode : R.drawable.ic_vertical_menu);
        btnOuterRight.setVisibility(View.VISIBLE);
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

    private void handleOuterRightClicked() {
        DappBrowserPlugin.getInstance().webViewHandler.setMenuEvent();
    }

}
