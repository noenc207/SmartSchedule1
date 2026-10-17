import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Magnetic } from './magnetic';
import { cn } from '@/lib/utils';
import * as motionReact from 'motion/react';

describe('Representative UI Component: Magnetic (motion/react + cn)', () => {
  it('exports Magnetic component and motion/react successfully', () => {
    expect(Magnetic).toBeDefined();
    expect(typeof Magnetic).toBe('function');
    expect(motionReact.motion).toBeDefined();
    expect(typeof motionReact.motion.div).toBe('object');
    expect(typeof motionReact.useMotionValue).toBe('function');
    expect(typeof motionReact.useSpring).toBe('function');
  });

  it('instantiates motion value correctly with motionValue constructor', () => {
    const val = motionReact.motionValue(0);
    expect(val.get()).toBe(0);
    val.set(42);
    expect(val.get()).toBe(42);
  });

  it('verifies cn utility standard behavior', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-red-500', { 'text-white': true, 'hidden': false })).toBe('bg-red-500 text-white');
  });

  it('renders Magnetic component into DOM/HTML string in isolated test environment', () => {
    const html = renderToStaticMarkup(
      <Magnetic className="demo-magnetic-wrapper" intensity={0.5} range={80}>
        <button id="test-btn" className="px-4 py-2 bg-orange-500 text-white font-semibold">
          Interactive Button
        </button>
      </Magnetic>
    );

    expect(html).toBeDefined();
    expect(html).toContain('demo-magnetic-wrapper');
    expect(html).toContain('Interactive Button');
    expect(html).toContain('id="test-btn"');
  });
});
