import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';

export interface Inputs {
  githubToken: string;
  yamlFile: fs.PathLike;
  skipDelete: boolean;
  dryRun: boolean;
  exclude: string[];
}

export async function getInputs(): Promise<Inputs> {
  return {
    githubToken: core.getInput('github-token'),
    yamlFile: path.join(core.getInput('yaml-file') || '.github/labels.yml'),
    skipDelete: core.getBooleanInput('skip-delete'),
    dryRun: core.getBooleanInput('dry-run'),
    exclude: await getInputList('exclude')
  };
}

export async function getInputList(name: string): Promise<string[]> {
  const items = core.getInput(name);
  if (items == '') {
    return [];
  }
  return items.split(/\r?\n/).reduce<string[]>(
    (acc, line) =>
      acc
        .concat(line.split(','))
        .filter(pat => pat)
        .map(pat => pat.trim()),
    []
  );
}
