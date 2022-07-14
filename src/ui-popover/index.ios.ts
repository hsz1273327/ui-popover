import { Color, IOSHelper, Screen, Trace, Utils, View } from '@nativescript/core';
import { HorizontalPosition, PopoverOptions, VerticalPosition } from '.';

export * from './index.common';

@NativeClass
class UIPopoverPresentationControllerDelegateImpl extends NSObject implements UIPopoverPresentationControllerDelegate {
    static ObjCProtocols = [UIPopoverPresentationControllerDelegate];
    private _options: any;

    static initWithOptions(options) {
        const delegate = new UIPopoverPresentationControllerDelegateImpl();
        delegate._options = options;
        return delegate;
    }

    adaptivePresentationStyleForPresentationController?(controller: UIPresentationController): UIModalPresentationStyle {
        return UIModalPresentationStyle.None;
    }

    popoverPresentationControllerDidDismissPopover(popoverPresentationController: UIPopoverPresentationController): void {
        console.log('popoverPresentationControllerDidDismissPopover', this._options);
        if (this._options.onDismiss) {
            this._options.onDismiss();
        }
    }

    popoverPresentationControllerShouldDismissPopover(popoverPresentationController: UIPopoverPresentationController): any {
        console.log('popoverPresentationControllerShouldDismissPopover', this._options);
        return !this._options?.outsideTouchable;
    }
}

@NativeClass
class PopoverViewController extends UIViewController {
    public owner: WeakRef<View>;

    public static initWithOwner(owner: WeakRef<View>): PopoverViewController {
        const controller = PopoverViewController.new() as PopoverViewController;
        controller.owner = owner;

        return controller;
    }
    loadView(): void {
        this.view = createUIViewAutoSizeUIViewAutoSize(this.owner.get());
    }
    viewDidLoad(): void {
        super.viewDidLoad();
        const size = this.view.systemLayoutSizeFittingSize(UILayoutFittingCompressedSize);
        this.preferredContentSize = size;
    }
}

@NativeClass
class UIViewAutoSizeUIViewAutoSize extends UIView {
    _view: WeakRef<View>;
    systemLayoutSizeFittingSize(boundsSize: CGSize) {
        const view = this._view?.get();
        if (!view) {
            return CGSizeZero;
        }
        const actualWidth = Math.min(boundsSize.width, Screen.mainScreen.widthPixels);
        const widthSpec = Utils.layout.makeMeasureSpec(Utils.layout.toDevicePixels(actualWidth), Utils.layout.EXACTLY);
        const heighthSpec = Utils.layout.makeMeasureSpec(Utils.layout.toDevicePixels(boundsSize.height), Utils.layout.UNSPECIFIED);
        const measuredSize = View.measureChild(null, view, widthSpec, heighthSpec);
        const newWidth = Utils.layout.toDevicePixels(actualWidth);
        view.setMeasuredDimension(newWidth, measuredSize.measuredHeight);
        const size = CGSizeMake(Utils.layout.toDeviceIndependentPixels(measuredSize.measuredWidth), Utils.layout.toDeviceIndependentPixels(measuredSize.measuredHeight));
        return size;
    }
    layoutSubviews() {
        const view = this._view?.get();
        if (!view) {
            return;
        }
        const size = this.frame.size;
        View.layoutChild(null, view, 0, 0, Utils.layout.toDevicePixels(size.width), Utils.layout.toDevicePixels(size.height));
    }
}

function createUIViewAutoSizeUIViewAutoSize(view: View) {
    const self = UIViewAutoSizeUIViewAutoSize.new() as UIViewAutoSizeUIViewAutoSize;
    view._setupAsRootView({});
    view._isAddedToNativeVisualTree = true;
    view.callLoaded();
    self._view = new WeakRef(view);
    self.backgroundColor = UIColor.redColor;
    self.addSubview(view.nativeViewProtected);
    (view.nativeViewProtected as UIView).autoresizingMask = UIViewAutoresizing.FlexibleWidth | UIViewAutoresizing.FlexibleHeight;
    return self;
}

export function showPopover(
    view: View,
    {
        anchor,
        vertPos = VerticalPosition.BELOW,
        horizPos = HorizontalPosition.CENTER,
        x = 0,
        y = 0,
        fitInScreen = true,
        transparent = false,
        onDismiss,
        outsideTouchable = false,
        context = {},
        hideArrow = false
    }: PopoverOptions
) {
    const parentWithController = IOSHelper.getParentWithViewController(anchor);
    if (!parentWithController) {
        Trace.write(`Could not find parent with viewController for ${parent} while showing bottom sheet view.`, Trace.categories.ViewHierarchy, Trace.messageType.error);
        return;
    }

    const parentController = parentWithController.viewController;
    if (parentController.presentedViewController) {
        Trace.write('Parent is already presenting view controller. Close the current bottom sheet page before showing another one!', Trace.categories.ViewHierarchy, Trace.messageType.error);
        return;
    }

    if (!parentController.view || !parentController.view.window) {
        Trace.write('Parent page is not part of the window hierarchy.', Trace.categories.ViewHierarchy, Trace.messageType.error);
        return;
    }
    const controller = PopoverViewController.initWithOwner(new WeakRef(view));
    view.viewController = controller;
    function _onDismiss() {
        console.log('onDismiss');
        onDismiss?.();
        controller.popoverPresentationController.delegate = null;
        if (view && view.isLoaded) {
            view.callUnloaded();
        }
        view._isAddedToNativeVisualTree = false;
        view._tearDownUI();
    }
    controller.modalPresentationStyle = UIModalPresentationStyle.Popover;
    if (!controller.popoverPresentationController.delegate) {
        controller.popoverPresentationController.delegate = UIPopoverPresentationControllerDelegateImpl.initWithOptions({
            outsideTouchable,
            onDismiss: _onDismiss
        });
    }
    if (hideArrow) {
        controller.popoverPresentationController.permittedArrowDirections = 0;
    }
    if (transparent) {
        controller.popoverPresentationController.backgroundColor = UIColor.clearColor;
    }
    controller.popoverPresentationController.sourceView = anchor.nativeViewProtected;
    controller.popoverPresentationController.sourceRect = anchor.nativeViewProtected.bounds;
    parentWithController.viewController.presentModalViewControllerAnimated(controller, true);
}
