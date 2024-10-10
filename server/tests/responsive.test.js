const { autoExpand, unhideUpdateElement } = require('./responsive');

describe('Responsive', () => {
  let textarea;

  beforeEach(() => {
    document.body.innerHTML = '<textarea id="textarea"></textarea><div id="update-element" hidden></div>';
    textarea = document.getElementById('textarea');
  });

  test('autoExpand should adjust the height of the textarea', () => {
    autoExpand(textarea);
    expect(textarea.style.height).not.toBe('inherit');
  });

  test('unhideUpdateElement should toggle hidden attribute', () => {
    const updateElement = document.getElementById('update-element');
    unhideUpdateElement();
    expect(updateElement.hasAttribute('hidden')).toBe(false);
    unhideUpdateElement();
    expect(updateElement.hasAttribute('hidden')).toBe(true);
  });
});