import {describe, expect, it, beforeEach} from '@jest/globals';
import path from 'node:path';
import {getInputList, getInputs} from '../src/context.js';

describe('getInputList', () => {
  it('handles single line correctly', async () => {
    await setInput('foo', 'bar');
    const actual = await getInputList('foo');
    expect(actual).toEqual(['bar']);
  });

  it('handles multiple lines correctly', async () => {
    setInput('foo', 'bar\nbaz');
    const actual = await getInputList('foo');
    expect(actual).toEqual(['bar', 'baz']);
  });

  it('handles comma correctly', async () => {
    setInput('foo', 'bar,baz');
    const actual = await getInputList('foo');
    expect(actual).toEqual(['bar', 'baz']);
  });

  it('handles different new lines correctly', async () => {
    setInput('foo', 'bar\r\nbaz');
    const actual = await getInputList('foo');
    expect(actual).toEqual(['bar', 'baz']);
  });

  it('handles different new lines and comma correctly', async () => {
    setInput('foo', 'bar\r\nbaz,bat');
    const actual = await getInputList('foo');
    expect(actual).toEqual(['bar', 'baz', 'bat']);
  });

  it('handles empty lines correctly', async () => {
    setInput('foo', '');
    const actual = await getInputList('foo');
    expect(actual).toEqual([]);
  });
});
describe('getInputs', () => {
  beforeEach(() => {
    setInput('skip-delete', 'false');
    setInput('dry-run', 'false');
  });
  it('handles inputs correctly', async () => {
    const actual = await getInputs();
    expect(actual).toEqual({
      dryRun: false,
      exclude: [],
      githubToken: '',
      skipDelete: false,
      yamlFile: path.join('.github/labels.yml')
    });
  });

  it('handles github token', async () => {
    setInput('github-token', 'foo');
    const actual = await getInputs();
    expect(actual).toEqual({
      dryRun: false,
      exclude: [],
      githubToken: 'foo',
      skipDelete: false,
      yamlFile: path.join('.github/labels.yml')
    });
    setInput('github-token', '');
  });

  it('handles multiple lines correctly', async () => {
    setInput('exclude', 'foo\nbar');
    const actual = await getInputs();
    expect(actual).toEqual({
      dryRun: false,
      exclude: ['foo', 'bar'],
      githubToken: '',
      skipDelete: false,
      yamlFile: path.join('.github/labels.yml')
    });
    setInput('exclude', '');
  });

  it('handles boolean inputs correctly', async () => {
    setInput('skip-delete', 'true');
    setInput('dry-run', 'true');
    const actual = await getInputs();
    expect(actual).toEqual({
      dryRun: true,
      exclude: [],
      githubToken: '',
      skipDelete: true,
      yamlFile: path.join('.github/labels.yml')
    });
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
