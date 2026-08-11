import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanDocument } from './scan-document';

const visibleRect: DOMRect = {
  x: 0,
  y: 0,
  width: 100,
  height: 24,
  top: 0,
  right: 100,
  bottom: 24,
  left: 0,
  toJSON: () => ({}),
};

describe('scanDocument', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(visibleRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts normalized rendered colors without page text', () => {
    document.body.innerHTML = `
      <div id="status" role="status" style="
        color: rgb(12, 34, 56);
        background-color: rgba(120, 40, 20, 0.5);
        border-top: 2px solid #ff0000;
      ">Sensitive status text</div>
    `;

    const result = scanDocument('scan-a');
    const status = result.elements.find((element) => element.tagName === 'div');

    expect(status).toMatchObject({ tagName: 'div', role: 'status' });
    expect(status?.colors).toEqual(
      expect.arrayContaining([
        {
          property: 'text',
          color: { red: 12, green: 34, blue: 56, alpha: 1, css: 'rgba(12, 34, 56, 1)' },
        },
        {
          property: 'background',
          color: { red: 120, green: 40, blue: 20, alpha: 0.5, css: 'rgba(120, 40, 20, 0.5)' },
        },
        {
          property: 'border-top',
          color: { red: 255, green: 0, blue: 0, alpha: 1, css: 'rgba(255, 0, 0, 1)' },
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('Sensitive status text');
    expect(document.querySelector('#status')).toHaveAttribute('data-colorsense-ref', status?.ref);
  });

  it('extracts SVG fill and stroke values', () => {
    document.body.innerHTML = `
      <svg><circle style="fill: rgb(0 128 255 / 50%); stroke: #1234"></circle></svg>
    `;

    const result = scanDocument('scan-svg');
    const circle = result.elements.find((element) => element.tagName === 'circle');

    expect(circle?.colors).toEqual(
      expect.arrayContaining([
        {
          property: 'svg-fill',
          color: { red: 0, green: 128, blue: 255, alpha: 0.5, css: 'rgba(0, 128, 255, 0.5)' },
        },
        {
          property: 'svg-stroke',
          color: { red: 17, green: 34, blue: 51, alpha: 0.267, css: 'rgba(17, 34, 51, 0.267)' },
        },
      ]),
    );
  });

  it('emits enumerated ARIA and nearby-text signals without raw content', () => {
    document.body.innerHTML = `
      <div><span id="dot" role="status" aria-invalid="true" aria-label="Server status" style="background: red"></span><span>Offline</span></div>
    `;
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(function (this: Element) {
      return this.id === 'dot'
        ? ({ ...visibleRect, width: 16, height: 16, right: 16, bottom: 16 } as DOMRect)
        : visibleRect;
    });

    const result = scanDocument('scan-signals');
    const dot = result.elements.find((element) => element.role === 'status');

    expect(dot?.signals).toMatchObject({
      ariaStates: ['invalid'],
      nearbyText: ['error-keyword'],
      hasAccessibleName: true,
      coloredShape: true,
    });
    expect(JSON.stringify(result)).not.toContain('Offline');
    expect(JSON.stringify(result)).not.toContain('Server status');
  });

  it('excludes hidden, zero-size, editable, and extension-owned elements', () => {
    document.body.innerHTML = `
      <div id="hidden" style="display:none;color:red">hidden</div>
      <div id="zero" style="color:red">zero</div>
      <input id="input" value="private" style="background:red" />
      <div id="editable" contenteditable="true" style="color:red">private</div>
      <aside data-colorsense-owned="true"><span id="owned" style="color:red">owned</span></aside>
    `;
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(function (this: Element) {
      return this.id === 'zero' ? ({ ...visibleRect, width: 0 } as DOMRect) : visibleRect;
    });

    const result = scanDocument('scan-sensitive');
    const serialized = JSON.stringify(result.elements);

    expect(serialized).not.toContain('private');
    expect(document.querySelector('#input')).not.toHaveAttribute('data-colorsense-ref');
    expect(document.querySelector('#editable')).not.toHaveAttribute('data-colorsense-ref');
    expect(document.querySelector('#owned')).not.toHaveAttribute('data-colorsense-ref');
  });

  it('removes stale references and reports bounded scans', () => {
    document.body.innerHTML = `
      <div data-colorsense-ref="old:1" style="color:rgb(1,2,3)">one</div>
      <div style="color:rgb(4,5,6)">two</div>
      <div style="color:rgb(7,8,9)">three</div>
    `;

    const result = scanDocument('scan-bounded', 2);

    expect(result.truncated).toBe(true);
    expect(document.querySelector('[data-colorsense-ref="old:1"]')).toBeNull();
    expect(result.elements.every((element) => element.ref.startsWith('scan-bounded:'))).toBe(true);
  });

  it('ignores transparent colors and counts unsupported computed values safely', () => {
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    const getComputedStyle = vi.spyOn(window, 'getComputedStyle');
    getComputedStyle.mockImplementation((element) => {
      const originalStyle = originalGetComputedStyle(element);
      const style = {
        ...originalStyle,
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        color: 'lab(50% 20 30)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        fill: 'none',
        stroke: 'none',
        getPropertyValue: () => '',
      };
      return style as CSSStyleDeclaration;
    });
    document.body.innerHTML = '<p>unsupported</p>';

    const result = scanDocument('scan-unsupported');

    expect(result.unsupportedColorValues).toBeGreaterThan(0);
    expect(result.elements).toEqual([]);
  });
});
