// TODO: ALL THIS FILE MUST DISAPPEAR AND BE REPLACED BY THE NEW APP MANAGER PLUGIN

/**
 * Object received when receiving a message.
 */
export type ReceivedMessage = {
  /** The message receive */
  message: string;
  /** The message type */
  type: Number;
  /** The message from */
  from: string;
}

export interface CordovaPlugins {
  printer: PrinterPlugin.Printer;
}

export interface Cordova {
  plugins: CordovaPlugins;
}

export interface Window {
  cordova: Cordova;
}

export namespace PrinterPlugin {
  export interface FontOptions {
      /** The name of the font family. Only supported on iOS */
      name: string;
      /** The size of the font. Only supported on iOS, Android */
      size: number;
      /** Set to true to enable these font traits. Only supported on iOS */
      italic: boolean;
      /** Set to true to enable these font traits. Only supported on iOS */
      bold: boolean;
      /** Possible alignments are left, right, center and justified. Only supported on iOS */
      align: 'left' | 'right' | 'center' | 'justified';
      /** The color of the font in hexa-decimal RGB format - "FF0000" means red. Only supported on iOS */
      color: string;
  }

  export interface HeaderFooterLabelOptions {
      /** The plain text to display. Use %ld to indicate where to insert the page index. For example "Page %ld" would result into "Page 1", "Page 2", .... Only supported on iOS */
      text: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      top: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      right: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      left: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      bottom: string;
      /** The font attributes for the label. Only supported on iOS */
      font: FontOptions;
      /** Set to true if you want to display the page index. Only supported on iOS */
      showPageIndex: boolean;
  }

  export interface PrintOptions {
      /**
       * The name of the print job and the document
       */
      name?: string;

      /**
       * The number of copies for the print task.
       * Only supported on iOS, Windows
       */
      copies?: number;

      /**
       * Limits the pages to print even the document contains more.
       * To skip the last n pages you can assign a negative value on iOS.
       * Only supported on iOS, Android
       */
      pageCount?: number;

      /**
       * Specifies the duplex mode to use for the print job.
       * Either double-sided on short site (duplex:'short'),
       * double-sided on long site (duplex:'long') or single-sided (duplex:'none').
       */
      duplex?: boolean;

      /**
       * The orientation of the printed content, portrait or landscape
       * Portrait by default.
       */
      orientation?: 'landscape' | 'portrait';

      /**
       * If your application only prints black text, setting this property to true can result in better performance in many cases.
       * False by default.
       */
      monochrome?: boolean;

      /**
       * If your application only prints black text, setting this property to true can result in better performance in many cases.
       * False by default.
       * Only supported on iOS, Windows
       */
      photo?: boolean;

      /**
       * Set to false to disable downscaling the image to fit into the content aread.
       * Only supported on Android
       */
      autoFit?: boolean;

      /**
       * The network URL to the printer.
       * Only supported on iOS
       */
      printer?: string;

      /**
       * Defines the maximum size of the content area.
       * Only supported on iOS
       */
      maxHeight?: string;

      /**
       * Defines the maximum size of the content area.
       * Only supported on iOS
       */
      maxWidth?: string;

      /**
       * Set to false to avoid margins.
       * The margins for each printed page. Each printer might have its own minimum margins depends on media type and paper format.
       */
      margin?: boolean | {
          top?: string;
          left?: string;
          right?: string;
          bottom?: string;
      };

      ui?: {
          /** Set to true to hide the control for the number of copies. Only supported on iOS */
          hideNumberOfCopies?: string;
          /** Set to true to hide the control for the paper format. Only supported on iOS */
          hidePaperFormat?: string;
          /** The position of the printer picker. Only supported on iPad */
          top?: number;
          /** The position of the printer picker. Only supported on iPad */
          left?: number;
          /** The size of the printer picker. Only supported on iPad */
          height?: number;
          /** The size of the printer picker. Only supported on iPad */
          width?: number;
      };

      paper?: {
          /** The dimensions of the paper – iOS will will try to choose a format which fits bests. Only supported on iOS */
          width: string;
          /** The dimensions of the paper – iOS will will try to choose a format which fits bests. Only supported on iOS */
          height: string;
          /** The name of the format like IsoA4 or Roll22Inch. https://docs.microsoft.com/en-us/uwp/api/windows.graphics.printing.printmediasize. Only supported on Windows */
          name: string;
          /** On roll-fed printers you can decide when the printer cuts the paper. https://docs.microsoft.com/en-us/uwp/api/windows.graphics.printing.printmediasize. Only supported on iOs */
          length: string;
      };

      font?: FontOptions;

      header?: {
          /** The height of the header or footer on each page. Only supported on iOS */
          height: string;
          /** An array of labels to display. Only use if there are more then one. Only supported on iOS */
          labels: string[];
          label: HeaderFooterLabelOptions;
      };

      footer?: {
          /** The height of the header or footer on each page. Only supported on iOS */
          height: string;
          /** An array of labels to display. Only use if there are more then one. Only supported on iOS */
          labels: string[];
          label: HeaderFooterLabelOptions;
      };
  }

  export interface Printer {
      /**
       * Returns a list of all printable document types.
       */
      getPrintableTypes(callback: (printableTypes: string[]) => void);

      /**
       * Sends the content to the printer.
       *
       * @param content The plain/html text or a file URI.
       */
      print(content: string | HTMLElement, options: PrintOptions, callback: (printed: boolean) => void);
  }
}



