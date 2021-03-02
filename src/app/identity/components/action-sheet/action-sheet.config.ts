type ActionSheetCallback = (data?: any) => void;

export interface IActionSheetButtonConfig {
    title: string;
    description: string;
    icon: string;
    action(): void;
  }

export interface IActionSheetConfig {
  showCancelButton: boolean;
  cancelCallback(): void;
  buttons: IActionSheetButtonConfig[];
}

