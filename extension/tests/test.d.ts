declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string | Buffer, options?: any);
    window: any;
  }
}
