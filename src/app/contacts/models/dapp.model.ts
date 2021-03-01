export class DApp {
  constructor(
      public id: string,
      public version: string,
      public version_code: number,
      public name: string,
      public short_name: string,
      public short_description: string,
      public description: string,
      public start_url: string,
      public type: string,
      public category: string,
      public icons: [],
      public author: {},
      public default_locale: string,
      public plugins: [],
      public urls: [],
      public background_color: string,
      public theme_display: string,
      public theme_color: string,
      public intent_filters: [],
      public installed: boolean
  ) {}
}
