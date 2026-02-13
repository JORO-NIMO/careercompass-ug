declare module 'express' {
  export interface Request {
    [key: string]: any;
  }

  export interface Response {
    [key: string]: any;
  }

  export type NextFunction = (...args: any[]) => any;

  export interface Router {
    [key: string]: any;
  }

  export function Router(): Router;

  export type ExpressApp = any;

  interface ExpressStatic {
    (): ExpressApp;
    json: (...args: any[]) => any;
    urlencoded: (...args: any[]) => any;
  }

  const express: ExpressStatic;
  export default express;
}

declare module 'he' {
  const he: {
    decode: (text: string, options?: any) => string;
    [key: string]: any;
  };

  export default he;
}

declare module 'node-cron' {
  namespace cron {
    interface ScheduledTask {
      start: () => void;
      stop: () => void;
      destroy: () => void;
    }
  }

  interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
    [key: string]: any;
  }

  const cron: {
    schedule: (
      expression: string,
      func: () => void | Promise<void>,
      options?: ScheduleOptions,
    ) => cron.ScheduledTask;
  };

  export = cron;
}
