import {describe, expect, it} from 'vitest';

import * as context from '../src/context';

describe('getInputList', () => {
  it('handles single line correctly', async () => {
    await setInput('foo', 'bar');
    const res = await context.getInputList('foo');
    expect(res).toEqual(['bar']);
  });

  it('handles multiple lines correctly', async () => {
    setInput('foo', 'bar\nbaz');
    const res = await context.getInputList('foo');
    expect(res).toEqual(['bar', 'baz']);
  });

  it('handles comma correctly', async () => {
    setInput('foo', 'bar,baz');
    const res = await context.getInputList('foo');
    expect(res).toEqual(['bar', 'baz']);
  });

  it('handles different new lines correctly', async () => {
    setInput('foo', 'bar\r\nbaz');
    const res = await context.getInputList('foo');
    expect(res).toEqual(['bar', 'baz']);
  });

  it('handles different new lines and comma correctly', async () => {
    setInput('foo', 'bar\r\nbaz,bat');
    const res = await context.getInputList('foo');
    expect(res).toEqual(['bar', 'baz', 'bat']);
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
