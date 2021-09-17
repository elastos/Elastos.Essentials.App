/*
* Copyright (c) 2021 Elastos Foundation
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

import UIKit


enum AnimationType {
    case present
    case dismiss
}

@objc(SlideAnimator)
class SlideAnimator: NSObject , UIViewControllerAnimatedTransitioning {

    let duration = 0.2
    var animationType: AnimationType?
    
    static var instance: SlideAnimator?;
    
    static func getInstance() -> SlideAnimator {
        if (instance == nil) {
            instance = SlideAnimator();
        }
        return instance!;
    }


    @objc func transitionDuration(using transitionContext: UIViewControllerContextTransitioning?) -> TimeInterval {
        return duration
    }

    @objc func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {

        guard let fromVC = transitionContext.viewController(forKey: .from),
            let toVC = transitionContext.viewController(forKey: .to) else {
                return
        }

        //
        var fromX: CGFloat, toX: CGFloat;
        var animatorVC: UIViewController;
        if (animationType == .present) {
            fromX = UIScreen.main.bounds.size.width;
            toX = 0;
            animatorVC = toVC;
        }
        else {
            fromX = 0;
            toX = UIScreen.main.bounds.size.width;
            animatorVC = fromVC;
        }

        let containerView = transitionContext.containerView
        containerView.addSubview(animatorVC.view)
        let duration = transitionDuration(using: transitionContext)
        animatorVC.view.frame.origin.x =  fromX;

        UIView.animate(withDuration: duration, animations: {
            animatorVC.view.frame.origin.x = toX;
        }) { (_) in
            transitionContext.completeTransition(!transitionContext.transitionWasCancelled)
        }
    }
}


extension SlideAnimator: UIViewControllerTransitioningDelegate {

    @objc func animationController(forPresented presented: UIViewController, presenting: UIViewController, source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
       self.animationType = AnimationType.present
       return self
   }

    @objc func animationController(forDismissed dismissed: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        self.animationType = AnimationType.dismiss;
        return self
   }

}
