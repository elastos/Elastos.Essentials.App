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

public class TitleBarMenuView: UIView {
    private let titleBar: TitleBarView?
    private let appId: String
    private let menuItems: [TitleBarMenuItem]
    private var onMenuItemClickedListener: ((TitleBarMenuItem)->Void)?
    
    @IBOutlet var panelView: UIView!
    @IBOutlet var itemsStackView: UIStackView!
    
    init(titleBar: TitleBarView, frame: CGRect, appId: String, menuItems: [TitleBarMenuItem]) {
        self.titleBar = titleBar
        self.menuItems = menuItems
        self.appId = appId

        super.init(frame: frame)
        
        let view = loadViewFromNib()
        addSubview(view)
        self.addMatchChildConstraints(child: view)
        
        // UI customization
        view.backgroundColor = UIColor(hex: "#50000000")
        panelView.layer.cornerRadius = 5.0
        panelView.layer.shadowColor = UIColor.black.cgColor
        panelView.layer.shadowRadius = 10.0
        panelView.layer.shadowOpacity = 1.0
    }
    
    override init(frame: CGRect) {
        self.titleBar = nil
        self.appId = ""
        self.menuItems = []
        super.init(frame: frame)
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    public func show(inRootView: UIView) {
        // Add to root view
        inRootView.addSubview(self)
        inRootView.addMatchChildConstraints(child: self)
        
        // Append menu items
        for v in itemsStackView.arrangedSubviews {
            itemsStackView.removeArrangedSubview(v)
        }
        for mi in menuItems {
            let itemView = TitleBarMenuItemView(frame: CGRect.null, titleBar: titleBar!, appId: appId, menuItem: mi)
            itemView.translatesAutoresizingMaskIntoConstraints = false
            itemsStackView.addArrangedSubview(itemView)
            
            let tapRecognizer = UITapGestureRecognizer { recognizer in
                self.dismiss()
                self.onMenuItemClickedListener?(mi)
            }
            itemView.addGestureRecognizer(tapRecognizer)
        }
        
        // Show with animation
        self.alpha = 0.0
        UIViewPropertyAnimator(duration: 0.3, curve: .easeOut, animations: {
            self.alpha = 1.0
        }).startAnimation()
    }
    
    public func setOnMenuItemClickedListened(_ listener: @escaping (TitleBarMenuItem)->Void) {
        onMenuItemClickedListener = listener
    }
    
    private func dismiss() {
        // Hide with animation
        let animation = UIViewPropertyAnimator(duration: 0.3, curve: .easeOut, animations: {
            self.alpha = 0.0
        })
        animation.addCompletion() { _ in
            self.removeFromSuperview()
        }
        animation.startAnimation()
    }
    
    @IBAction func backgroundTapped(_ sender: Any) {
        dismiss()
    }
}
