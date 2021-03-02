type AdvancedPopupConfirmCallback = ()=>void;
type AdvancedPopupCancelCallback = ()=>void;

export type AdvancedPopupConfig = {
    color: string,
    info?: {
        picture: string,
        title: string,
        content: string
    },
    prompt?: {
        title: string,
        confirmAction: string,
        cancelAction: string,
        confirmCallback: AdvancedPopupConfirmCallback
        cancelCallback?: AdvancedPopupCancelCallback
    }
}