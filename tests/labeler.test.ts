import {describe, expect, test, vi} from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {Inputs} from '../src/context';
import {Label, Labeler, LabelStatus} from '../src/labeler';

const fixturesDir = path.join(__dirname, 'fixtures');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(Labeler.prototype as any, 'getRepoLabels').mockImplementation((): Promise<Label[]> => {
  return <Promise<Label[]>>JSON.parse(fs.readFileSync(path.join(fixturesDir, 'repoLabels.json'), 'utf-8'));
});

const cases = [
  [
    'labels.update.yml',
    {
      githubToken: 'n/a',
      yamlFile: path.join(fixturesDir, 'labels.update.yml'),
      skipDelete: true,
      dryRun: true,
      exclude: []
    },
    {
      skip: 12,
      exclude: 0,
      create: 2,
      update: 2,
      rename: 1,
      delete: 6,
      error: 0
    }
  ],
  [
    'labels.exclude1.yml',
    {
      githubToken: 'n/a',
      yamlFile: path.join(fixturesDir, 'labels.exclude1.yml'),
      skipDelete: true,
      dryRun: true,
      exclude: ['* d*', '*enhancement', '*fix']
    },
    {
      skip: 11,
      exclude: 5,
      create: 1,
      update: 1,
      rename: 0,
      delete: 4,
      error: 0
    }
  ],
  [
    'labels.exclude2.yml',
    {
      githubToken: 'n/a',
      yamlFile: path.join(fixturesDir, 'labels.exclude2.yml'),
      skipDelete: true,
      dryRun: true,
      exclude: ['*fix']
    },
    {
      skip: 16,
      exclude: 1,
      create: 1,
      update: 0,
      rename: 0,
      delete: 4,
      error: 0
    }
  ],
  [
    'labels.hexcodes.yml',
    {
      githubToken: 'n/a',
      yamlFile: path.join(fixturesDir, 'labels.hexcodes.yml'),
      skipDelete: true,
      dryRun: true,
      exclude: []
    },
    {
      skip: 10,
      exclude: 0,
      create: 0,
      update: 0,
      rename: 0,
      delete: 11,
      error: 0
    }
  ],
  [
    'labels.failsafe_schema.yml',
    {
      githubToken: 'n/a',
      yamlFile: path.join(fixturesDir, 'labels.failsafe_schema.yml'),
      skipDelete: true,
      dryRun: true,
      exclude: []
    },
    {
      skip: 2,
      exclude: 0,
      create: 1,
      update: 2,
      rename: 1,
      delete: 16,
      error: 0
    }
  ]
];

describe('run', () => {
  test.each(cases)('given %p', async (name, inputs, expected) => {
    const labeler = new Labeler(inputs as Inputs);
    await labeler.printRepoLabels();
    console.log(
      (await labeler.labels).map(label => {
        return label.ghaction_log;
      })
    );

    const res = {
      skip: 0,
      exclude: 0,
      create: 0,
      update: 0,
      rename: 0,
      delete: 0,
      error: 0
    };
    const labels = await labeler.labels;
    for (const label of labels) {
      switch (label.ghaction_status) {
        case LabelStatus.Exclude: {
          res.exclude++;
          break;
        }
        case LabelStatus.Create: {
          res.create++;
          break;
        }
        case LabelStatus.Update: {
          res.update++;
          break;
        }
        case LabelStatus.Rename: {
          res.rename++;
          break;
        }
        case LabelStatus.Delete: {
          res.delete++;
          break;
        }
        case LabelStatus.Skip: {
          res.skip++;
          break;
        }
        case LabelStatus.Error: {
          res.error++;
          break;
        }
      }
    }

    expect(res).toEqual(expected);
    expect(() => labeler.run()).not.toThrow();
  });
});
