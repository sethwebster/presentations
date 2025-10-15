import React from 'react';
import type { ReactNode, ReactElement } from 'react';
import { Reveal } from '../components/Reveal';
import { FadeOut } from '../components/FadeOut';
import { StaggeredReveal } from '../components/StaggeredReveal';
import type { LumeElement, LumeBuildSequence, LumeAnimation } from './types';

interface ExtractedSlideContent {
  elements: LumeElement[];
  builds: LumeBuildSequence[];
}

type AnimationComponent = typeof Reveal | typeof FadeOut | typeof StaggeredReveal;

interface AnimationDescriptor {
  name: string;
  animationType: LumeAnimation['type'];
  sequence: 'build-in' | 'build-out' | 'emphasis';
  pickAnimation: (props: Record<string, unknown>, targetId: string) => LumeAnimation;
  pickProps: (props: Record<string, unknown>) => Record<string, unknown>;
}

const animationRegistry = new Map<AnimationComponent, AnimationDescriptor>([
  [
    Reveal,
    {
      name: 'Reveal',
      animationType: 'reveal',
      sequence: 'build-in',
      pickAnimation: (props, targetId) => ({
        id: `${targetId}-animation`,
        type: 'reveal',
        duration: (props.duration as number) ?? 600,
        delay: (props.delay as number) ?? 0,
        easing: 'ease-out',
        parameters: cleanObject({
          animation: props.animation,
        }),
      }),
      pickProps: (props) =>
        cleanObject({
          delay: props.delay,
          duration: props.duration,
          animation: props.animation,
          className: props.className,
        }),
    },
  ],
  [
    FadeOut,
    {
      name: 'FadeOut',
      animationType: 'fade-out',
      sequence: 'build-out',
      pickAnimation: (props, targetId) => ({
        id: `${targetId}-animation`,
        type: 'fade-out',
        duration: (props.duration as number) ?? 600,
        delay: (props.delay as number) ?? 0,
        easing: 'ease-in',
        parameters: {},
      }),
      pickProps: (props) =>
        cleanObject({
          delay: props.delay,
          duration: props.duration,
          className: props.className,
        }),
    },
  ],
  [
    StaggeredReveal,
    {
      name: 'StaggeredReveal',
      animationType: 'staggered-reveal',
      sequence: 'build-in',
      pickAnimation: (props, targetId) => ({
        id: `${targetId}-animation`,
        type: 'staggered-reveal',
        duration: ((props.initialDelay as number) ?? 0) + ((props.staggerDelay as number) ?? 100),
        delay: (props.initialDelay as number) ?? 0,
        easing: 'ease-out',
        parameters: cleanObject({
          initialDelay: props.initialDelay,
          staggerDelay: props.staggerDelay,
        }),
      }),
      pickProps: (props) =>
        cleanObject({
          initialDelay: props.initialDelay,
          staggerDelay: props.staggerDelay,
          className: props.className,
        }),
    },
  ],
]);

export function extractElementsFromSlideContent(content: ReactNode): ExtractedSlideContent {
  const elements: LumeElement[] = [];
  const builds: LumeBuildSequence[] = [];
  let elementCounter = 0;

  const addElement = (element: LumeElement) => {
    elements.push(element);
  };

  const createElementId = (prefix: string) => `${prefix}-${++elementCounter}`;

  const processNode = (node: ReactNode): LumeElement[] => {
    if (node == null || typeof node === 'boolean') {
      return [];
    }

    if (Array.isArray(node)) {
      return node.flatMap(processNode);
    }

    if (typeof node === 'string' || typeof node === 'number') {
      const text = normalizeText(String(node));
      if (!text) return [];
      const element: LumeElement = {
        id: createElementId('text'),
        type: 'text',
        content: text,
        position: defaultPosition(elementCounter - 1),
      };
      return [element];
    }

    if (!React.isValidElement(node)) {
      return [];
    }

    const { type, props } = node as ReactElement;
    const childrenArray = React.Children.toArray(props?.children ?? []);

    if (typeof type === 'string') {
      if (type === 'br') {
        return [
          {
            id: createElementId('text'),
            type: 'text',
            content: '\n',
            position: defaultPosition(elementCounter - 1),
          },
        ];
      }

      if (type === 'img') {
        const element: LumeElement = {
          id: createElementId('image'),
          type: 'image',
          assetRef: props.src,
          position: defaultPosition(elementCounter - 1),
          metadata: cleanObject({
            alt: props.alt,
            className: props.className,
          }),
        };
        return [element];
      }

      const text = collectText(childrenArray);
      if (text) {
        const element: LumeElement = {
          id: createElementId('text'),
          type: 'text',
          content: text,
          position: defaultPosition(elementCounter - 1),
          metadata: cleanObject({
            tagName: type.toUpperCase(),
            className: props.className,
          }),
        };
        return [element];
      }

      return childrenArray.flatMap(processNode);
    }

    const animationDescriptor = animationRegistry.get(type as AnimationComponent);
    if (animationDescriptor) {
      const childElements = childrenArray.flatMap(processNode);
      const groupId = createElementId(animationDescriptor.animationType);

      const groupElement: LumeElement = {
        id: groupId,
        type: 'group',
        children: childElements,
        position: defaultPosition(elementCounter - 1),
        animation: {
          type: animationDescriptor.animationType,
          props: animationDescriptor.pickProps(props),
        },
        metadata: {
          component: animationDescriptor.name,
        },
      };

      const build: LumeBuildSequence = {
        id: `${groupId}-build`,
        targetId: groupId,
        sequence: animationDescriptor.sequence,
        animation: animationDescriptor.pickAnimation(props, groupId),
      };

      builds.push(build);

      return [groupElement];
    }

    return childrenArray.flatMap(processNode);
  };

  processNode(content).forEach(addElement);

  return {
    elements,
    builds,
  };
}

function collectText(nodes: ReactNode[]): string {
  const parts: string[] = [];

  const visit = (node: ReactNode) => {
    if (node == null || typeof node === 'boolean') return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (typeof node === 'string' || typeof node === 'number') {
      parts.push(String(node));
      return;
    }

    if (!React.isValidElement(node)) {
      return;
    }

    if (node.type === 'br') {
      parts.push('\n');
      return;
    }

    visit(node.props?.children);
  };

  nodes.forEach(visit);
  return normalizeText(parts.join(''));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function defaultPosition(index: number) {
  const gap = 120;
  const top = 120 + index * gap;

  return {
    x: 120,
    y: top,
    width: 1280,
    height: 100,
    zIndex: index,
  };
}

function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && typeof value !== 'function') {
      result[key] = value;
    }
  }
  return result as T;
}
