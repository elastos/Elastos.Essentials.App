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

public class TitleBarMenuItemView: UIView {
    // UI
    @IBOutlet var iconView: TitleBarIconView!
    @IBOutlet var titleView: UILabel!
    
    // Model
    let titleBar: TitleBarView
    let menuItem: TitleBarMenuItem
    let appId: String
    
    init(frame: CGRect, titleBar: TitleBarView, appId: String, menuItem: TitleBarMenuItem) {
        self.titleBar = titleBar
        self.appId = appId
        self.menuItem = menuItem
        
        super.init(frame: frame)
        
        let view = loadViewFromNib()
        addSubview(view)
        self.addMatchChildConstraints(child: view)
        
        setup()
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setup() {
        iconView.iconView.leftImageWidth = 20
        iconView.iconView.leftImageHeight = 20
        
        titleBar.setImageViewFromIcon(iv: iconView, icon: menuItem)
        
        iconView.iconView.leftImageColor = UIColor.gray
        
        titleView.text = menuItem.title
    }
}
