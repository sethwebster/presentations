/**
 * Global type declarations
 */

import * as ReactNamespace from 'react';

declare global {
  /**
   * Make React namespace available globally for type annotations.
   * This is needed because Next.js auto-imports React for JSX,
   * but TypeScript still needs the namespace available for annotations like React.ReactNode
   */
  namespace React {
    export type FC<P = {}> = ReactNamespace.FC<P>;
    export type ReactNode = ReactNamespace.ReactNode;
    export type ReactElement = ReactNamespace.ReactElement;
    export type ComponentType<P = {}> = ReactNamespace.ComponentType<P>;
    export type RefObject<T> = ReactNamespace.RefObject<T>;
    export type MutableRefObject<T> = ReactNamespace.MutableRefObject<T>;
    export type CSSProperties = ReactNamespace.CSSProperties;
    export type HTMLAttributes<T> = ReactNamespace.HTMLAttributes<T>;
    export type PropsWithChildren<P = {}> = ReactNamespace.PropsWithChildren<P>;
  }
}

export {};
