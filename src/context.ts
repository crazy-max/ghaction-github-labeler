import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';

export interface Inputs {
  githubToken: string;
  yamlFile: fs.PathLike;
  skipDelete: boolean;
  dryRun: boolean;
}

export async function getInputs(): Promise<Inputs> {
  return {
    githubToken: core.getInput('github-token'),
    yamlFile: path.join(core.getInput('yaml_file') || '.github/labels.yml'),
    skipDelete: /true/i.test(core.getInput('skip_delete')),
    dryRun: /true/i.test(core.getInput('dry_run'))
  };
}
