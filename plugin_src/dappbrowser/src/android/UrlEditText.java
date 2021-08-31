package org.elastos.essentials.plugins.dappbrowser;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.MotionEvent;
import android.widget.EditText;

import org.elastos.essentials.app.R;

@SuppressLint("AppCompatCustomView")
public class UrlEditText extends EditText {
	private final String TAG = "UrlEditText";
	private Drawable dRight;
	private Rect rBounds;

	public UrlEditText(Context paramContext) {
		super(paramContext);
		initEditText();
	}

	public UrlEditText(Context paramContext, AttributeSet paramAttributeSet) {
		super(paramContext, paramAttributeSet);
		initEditText();
	}

	public UrlEditText(Context paramContext, AttributeSet paramAttributeSet, int paramInt) {
		super(paramContext, paramAttributeSet, paramInt);
		initEditText();
	}

	private void initEditText() {
		this.setTextSize(TypedValue.COMPLEX_UNIT_SP, (float) 14);
		addTextChangedListener(new TextWatcher() {
			@Override
			public void afterTextChanged(Editable paramEditable) {
			}

			@Override
			public void beforeTextChanged(CharSequence paramCharSequence, int paramInt1, int paramInt2, int paramInt3) {
			}

			@Override
			public void onTextChanged(CharSequence paramCharSequence, int paramInt1, int paramInt2, int paramInt3) {
				UrlEditText.this.setEditTextDrawable();
			}
		});
	}

	public void setEditTextDrawable() {
		if (getText().toString().length() == 0) {
			setCompoundDrawables(null, null, null, null);
		} else {
			setCompoundDrawables(null, null, this.dRight, null);
		}
	}

	@Override
	protected void onDetachedFromWindow() {
		super.onDetachedFromWindow();
		this.dRight = null;
		this.rBounds = null;

	}


	@Override
	public boolean onTouchEvent(MotionEvent paramMotionEvent) {
		if ((this.dRight != null) && (paramMotionEvent.getAction() == 1)) {
			this.rBounds = this.dRight.getBounds();
			int i = (int) paramMotionEvent.getRawX();
			// int i = (int) paramMotionEvent.getX();
			if (i > getRight() - 3 * this.rBounds.width()) {
				setText("");
				paramMotionEvent.setAction(MotionEvent.ACTION_CANCEL);
			}
		}
		return super.onTouchEvent(paramMotionEvent);
	}

	@Override
	public void setCompoundDrawables(Drawable paramDrawable1, Drawable paramDrawable2, Drawable paramDrawable3, Drawable paramDrawable4) {
		if (paramDrawable3 != null)
			this.dRight = paramDrawable3;
		super.setCompoundDrawables(paramDrawable1, paramDrawable2, paramDrawable3, paramDrawable4);
	}

	public void setEditColor(Boolean darkMode) {
		this.setTextColor(Color.parseColor(darkMode ? "#FFFFFF" : "#000000" ));
		GradientDrawable bgShape = (GradientDrawable) this.getBackground();
		bgShape.setColor(Color.parseColor(darkMode ? "#212021" : "#FFFFFF" ));
		this.setCompoundDrawablesWithIntrinsicBounds(0, 0, darkMode ? R.drawable.ic_clear_input_darkmode : R.drawable.ic_clear_input, 0);
//		this.setCompoundDrawablePadding(10);
	}
}
