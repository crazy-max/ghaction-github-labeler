import {Inputs} from '../src/context';
import {Labeler, LabelStatus} from '../src/labeler';

const cases = [
  [
    'labels.update.yml',
    {
      githubToken: process.env.GITHUB_TOKEN || '',
      yamlFile: '.res/labels.update.yml',
      skipDelete: true,
      dryRun: true,
      exclude: []
    },
    {
      skip: 13,
      exclude: 0,
      create: 0,
      update: 2,
      rename: 1,
      delete: 3,
      error: 0
    }
  ],
  [
    'labels.exclude1.yml',
    {
      githubToken: process.env.GITHUB_TOKEN || '',
      yamlFile: '.res/labels.exclude1.yml',
      skipDelete: true,
      dryRun: true,
      exclude: ['* d*', '*enhancement', '*fix']
    },
    {
      skip: 12,
      exclude: 5,
      create: 0,
      update: 1,
      rename: 0,
      delete: 1,
      error: 0
    }
  ],
  [
    'labels.exclude2.yml',
    {
      githubToken: process.env.GITHUB_TOKEN || '',
      yamlFile: '.res/labels.exclude2.yml',
      skipDelete: true,
      dryRun: true,
      exclude: ['*fix']
    },
    {
      skip: 17,
      exclude: 1,
      create: 0,
      update: 0,
      rename: 0,
      delete: 1,
      error: 0
    }
  ]
];

describe('run', () => {
  test.each(cases)('given %p', async (name, inputs, expected) => {
    const labeler = new Labeler(inputs as Inputs);
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
    for (const label of await labeler.labels) {
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
  });
});
