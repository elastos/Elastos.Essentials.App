/*
* Copyright (c) 2020 Elastos Foundation
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import Foundation

public class TitleBarIconView: UIView {
    // UI
    @IBOutlet var iconView: AdvancedButton!
    @IBOutlet weak var badgeView: UIImageView!
    
    private var onClickListener: (()->Void)? = nil
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        
        let view = loadViewFromNib()
        self.translatesAutoresizingMaskIntoConstraints = false
        view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(view)
        self.addMatchChildConstraints(child: view)
        
        setup()
    }

    required convenience init?(coder aDecoder: NSCoder) {
        self.init(frame: CGRect.null)
    }
    
    private func setup() {
        setBadgeCount(0)
    }
    
    /*public func setPaddingDp(int dpPadding) {
        int paddingPx = (int) Utility.convertDpToPx(getContext(), dpPadding);
        ivMainIcon.setPadding(paddingPx, paddingPx, paddingPx, paddingPx);
    }

    public func setImageResource(int resId) {
        ivMainIcon.setImageResource(resId);
    }

    public func setImageURI(Uri uri) {
        ivMainIcon.setImageURI(uri);
    }

    public func setColorFilter(int color) {
        ivMainIcon.setColorFilter(color);
    }

    public func setColorFilter(ColorMatrixColorFilter filter) {
        ivMainIcon.setColorFilter(filter);
    }*/

    public func setOnClickListener(_ listener: @escaping ()->Void) {
        onClickListener = listener
    }

    @IBAction func mainIconClicked(_ sender: Any) {
        onClickListener?()
    }
    
    /**
     * For now, just a on/off toggle, no real count used.
     */
    public func setBadgeCount(_ count: Int) {
        if (count == 0) {
            badgeView.isHidden = true
        }
        else {
            badgeView.isHidden = false
        }
    }
}
