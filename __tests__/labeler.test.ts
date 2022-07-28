import {describe, expect, test, beforeAll, afterAll} from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import nock from 'nock';
import {Inputs} from '../src/context.js';
import {Labeler, LabelStatus} from '../src/labeler.js';

process.env.GITHUB_REPOSITORY = 'crazy-max/ghaction-github-labeler';

const directory = path.dirname(url.fileURLToPath(import.meta.url));
const githubToken = process.env.GITHUB_TOKEN || 'test';

function configFixture(fileName: string) {
  return fs.readFileSync(`${directory}/../${fileName}`);
}

function labelsFixture() {
  const content = fs.readFileSync(`${directory}/../.res/labels.json`).toString();
  return JSON.parse(content);
}

const cases = [
  [
    'labels.update.yml',
    {
      githubToken,
      yamlFile: '.res/labels.update.yml',
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
      githubToken,
      yamlFile: '.res/labels.exclude1.yml',
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
      githubToken,
      yamlFile: '.res/labels.exclude2.yml',
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
  ]
];

describe('run', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    // nock.recorder.rec();
  });
  afterAll(() => {
    // nock.restore()
    nock.cleanAll();
    nock.enableNetConnect();
  });
  test.each(cases)('given %p', async (name, inputs, expected) => {
    const input = inputs as Inputs;

    nock('https://api.github.com').get('/repos/crazy-max/ghaction-github-labeler/labels').once().reply(200, labelsFixture());

    nock('https://api.github.com')
      .get(`/repos/crazy-max/ghaction-github-labeler/contents/${encodeURIComponent(input.yamlFile as string)}`)
      .once()
      .reply(200, configFixture(input.yamlFile as string));

    const labeler = new Labeler(input);
    await labeler.printRepoLabels();
    const labels = await labeler.labels;
    console.log(
      labels.map(label => {
        return label.ghaction_log;
      })
    );

    const actual = {
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
          actual.exclude++;
          break;
        }
        case LabelStatus.Create: {
          actual.create++;
          break;
        }
        case LabelStatus.Update: {
          actual.update++;
          break;
        }
        case LabelStatus.Rename: {
          actual.rename++;
          break;
        }
        case LabelStatus.Delete: {
          actual.delete++;
          break;
        }
        case LabelStatus.Skip: {
          actual.skip++;
          break;
        }
        case LabelStatus.Error: {
          actual.error++;
          break;
        }
      }
    }

    expect(actual).toEqual(expected);
    expect(() => labeler.run()).not.toThrow();
  });
  test('merge', async () => {
    const input = <Inputs>{
      githubToken,
      yamlFile: '.res/labels.merge2.yml',
      skipDelete: true,
      dryRun: true,
      exclude: []
    };
    nock('https://api.github.com').get('/repos/crazy-max/ghaction-github-labeler/labels').reply(200, labelsFixture());

    nock('https://api.github.com')
      .get(`/repos/crazy-max/ghaction-github-labeler/contents/${encodeURIComponent(input.yamlFile as string)}`)
      .reply(200, configFixture(input.yamlFile as string));

    nock('https://api.github.com')
      .get(`/repos/crazy-max/ghaction-github-labeler/contents/${encodeURIComponent('.res/labels.merge1.yml')}`)
      .reply(200, configFixture('.res/labels.merge1.yml'));

    const labeler = new Labeler(input);
    const fileLabels = await labeler.fileLabels;
    expect(fileLabels.length).toBe(18);
    expect(fileLabels).toEqual(expect.arrayContaining([expect.objectContaining({name: ':unicorn: Special'})]));
    expect(fileLabels).toEqual(expect.arrayContaining([expect.objectContaining({name: ':robot: bot', description: 'I am robot'})]));
    expect(fileLabels).toEqual(expect.arrayContaining([expect.objectContaining({name: ':bug: bug', description: 'Damn bugs'})]));
    expect(() => labeler.run()).not.toThrow();
  });
  test('extends', async () => {
    const input = <Inputs>{
      githubToken,
      yamlFile: '.res/labels.merge3.yml',
      skipDelete: true,
      dryRun: true,
      exclude: []
    };
    nock('https://api.github.com').get('/repos/crazy-max/ghaction-github-labeler/labels').reply(200, labelsFixture());

    nock('https://api.github.com')
      .get(`/repos/crazy-max/ghaction-github-labeler/contents/${encodeURIComponent(input.yamlFile as string)}`)
      .reply(200, configFixture(input.yamlFile as string));

    nock('https://api.github.com')
      .get(`/repos/crazy-max/ghaction-github-labeler/contents/${encodeURIComponent('.res/labels.merge1.yml')}`)
      .reply(200, configFixture('.res/labels.merge1.yml'));

    const labeler = new Labeler(input);
    const fileLabels = await labeler.fileLabels;
    expect(fileLabels.length).toBe(15);
    expect(() => labeler.run()).not.toThrow();
  });
});
