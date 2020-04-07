import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import matcher from 'matcher';
import * as core from '@actions/core';
import * as github from '@actions/github';

const octokit = new github.GitHub(process.env['GITHUB_TOKEN'] || '');
let liveLabels: Array<Label>;
let fileLabels: Array<Label>;
let exclusions: Set<string>;

type Label = {
  name: string;
  color: string;
  description?: string;
  from_name?: string;
  ghaction_status?: LabelStatus;
  ghaction_log?: string;
};

enum LabelStatus {
  Create,
  Update,
  Rename,
  Delete,
  Skip,
  Exclude,
  Error
}

async function run() {
  try {
    const yaml_file: fs.PathLike = path.join(core.getInput('yaml_file') || '.github/labels.yml');
    const skip_delete: boolean = /true/i.test(core.getInput('skip_delete'));
    const dry_run: boolean = /true/i.test(core.getInput('dry_run'));

    if (!fs.existsSync(yaml_file)) {
      core.setFailed(`Cannot find YAML file ${yaml_file}`);
      return;
    }

    liveLabels = await getLiveLabels();
    fileLabels = await getFileLabels(yaml_file);
    await displayLiveLabels();

    core.info(`🏃 Running GitHub Labeler`);
    let actionLabels = await getActionLabels();
    for (const actionLabel of actionLabels) {
      switch (actionLabel.ghaction_status) {
        case LabelStatus.Exclude: {
          core.info(`${dry_run ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          break;
        }
        case LabelStatus.Create: {
          if (dry_run) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              name: actionLabel.name,
              color: actionLabel.color,
              description: actionLabel.description,
              mediaType: {
                previews: ['symmetra']
              }
            };
            await octokit.issues.createLabel(params);
          } catch (err) {
            core.error(err.message);
          }
          break;
        }
        case LabelStatus.Update: {
          if (dry_run) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              current_name: actionLabel.name,
              color: actionLabel.color,
              description: actionLabel.description,
              mediaType: {
                previews: ['symmetra']
              }
            };
            await octokit.issues.updateLabel(params);
          } catch (err) {
            core.error(err.message);
          }
          break;
        }
        case LabelStatus.Rename: {
          if (dry_run) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              current_name: `${actionLabel.from_name}`,
              name: actionLabel.name,
              color: actionLabel.color,
              description: actionLabel.description,
              mediaType: {
                previews: ['symmetra']
              }
            };
            await octokit.issues.updateLabel(params);
          } catch (err) {
            core.error(err.message);
          }
          break;
        }
        case LabelStatus.Delete: {
          if (skip_delete) {
            core.info(`${dry_run ? '[dryrun] ' : ''}⛔️ Skipping delete for '${actionLabel.name}' (skip_delete on)`);
            break;
          }
          if (dry_run) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              name: actionLabel.name
            };
            await octokit.issues.deleteLabel(params);
          } catch (err) {
            core.error(err.message);
          }
          break;
        }
        case LabelStatus.Skip: {
          core.info(`${dry_run ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          break;
        }
        case LabelStatus.Error: {
          core.error(`${dry_run ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          break;
        }
        default: {
          core.error(`${dry_run ? '[dryrun] ' : ''}🚫 '${actionLabel.name}' not processed`);
          break;
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getLiveLabels(): Promise<Array<Label>> {
  const res = await octokit.paginate(
    octokit.issues.listLabelsForRepo.endpoint.merge({
      ...github.context.repo
    })
  );
  return res.map(label => {
    return {
      name: label.name,
      color: label.color,
      description: label.description || ''
    };
  }) as Array<Label>;
}

async function getFileLabels(yamlFile: fs.PathLike): Promise<Array<Label>> {
  return (await yaml.load(fs.readFileSync(yamlFile, {encoding: 'utf-8'}))) as Array<Label>;
}

async function displayLiveLabels() {
  let labels = Array<Label>();
  for (const liveLabel of liveLabels) {
    labels.push({
      name: liveLabel.name,
      color: liveLabel.color,
      description: liveLabel.description
    });
  }
  core.info(`👉 Current labels\n${yaml.safeDump(labels).toString()}`);
}

async function getExclusions(): Promise<Set<string>> {
  const raw = core.getInput('exclude') || '[]';
  let patterns: Array<string>;

  if (raw.trimLeft().startsWith('[')) {
    patterns = await yaml.load(raw);
  } else {
    patterns = [raw];
  }

  if (patterns === undefined || patterns.length === 0) {
    return new Set();
  }

  return new Set(
    matcher(
      liveLabels.map(label => label.name),
      patterns
    )
  );
}

async function getActionLabels(): Promise<Array<Label>> {
  let labels = Array<Label>();
  exclusions = await getExclusions();

  for (const fileLabel of fileLabels) {
    const liveLabel = await getLiveLabel(fileLabel.name);

    // Rename
    if (fileLabel.from_name !== undefined) {
      if ((await getLiveLabel(fileLabel.name)) !== undefined) {
        labels.push({
          ...fileLabel,
          ghaction_status: LabelStatus.Skip,
          ghaction_log: `⚠️ Skipping rename '${fileLabel.from_name}' label to '${fileLabel.name}'. Already exists`
        });
        continue;
      }

      const liveFromLabel = await getLiveLabel(fileLabel.from_name);
      if (liveFromLabel !== undefined) {
        if (exclusions.has(liveFromLabel.name)) {
          labels.push({
            ...liveFromLabel,
            ghaction_status: LabelStatus.Exclude,
            ghaction_log: `🚫️ Excluding '${liveFromLabel.name}' from rename.`
          });
          continue;
        }
        labels.push({
          ...fileLabel,
          ghaction_status: LabelStatus.Rename,
          ghaction_log: `✨ Renaming '${liveFromLabel.name}' label to '${fileLabel.name}' and set color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}`
        });
        continue;
      }

      labels.push({
        ...fileLabel,
        ghaction_status: LabelStatus.Error,
        ghaction_log: `❌ Label '${fileLabel.from_name}' not found. Cannot rename`
      });
      continue;
    }

    // Update
    if (liveLabel !== undefined) {
      if (exclusions.has(liveLabel.name)) {
        labels.push({
          ...fileLabel,
          ghaction_status: LabelStatus.Exclude,
          ghaction_log: `🚫️ Excluding '${fileLabel.name}' from update.`
        });
        continue;
      }

      if (fileLabel.color == liveLabel.color && fileLabel.description == liveLabel.description) {
        labels.push({
          ...fileLabel,
          ghaction_status: LabelStatus.Skip,
          ghaction_log: `⚠️ Skipping update for '${fileLabel.name}' label. Same color and description`
        });
        continue;
      }

      labels.push({
        ...fileLabel,
        ghaction_status: LabelStatus.Update,
        ghaction_log: `🔨 Updating '${fileLabel.name}' label with color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}`
      });
      continue;
    }

    // Create
    labels.push({
      ...fileLabel,
      ghaction_status: LabelStatus.Create,
      ghaction_log: `🎨 Creating '${fileLabel.name}' label with color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}`
    });
  }

  // Delete
  for (const liveLabel of liveLabels) {
    if ((await getFileLabel(liveLabel.name)) !== undefined) {
      continue;
    }
    if (exclusions.has(liveLabel.name)) {
      labels.push({
        ...liveLabel,
        ghaction_status: LabelStatus.Exclude,
        ghaction_log: `🚫️ Excluding '${liveLabel.name}' from deletion.`
      });
      continue;
    }
    labels.push({
      ...liveLabel,
      ghaction_status: LabelStatus.Delete,
      ghaction_log: `🔫 Deleting '${liveLabel.name}'`
    });
  }

  return labels;
}

async function getLiveLabel(name: string): Promise<Label | undefined> {
  for (const liveLabel of liveLabels) {
    if (name == liveLabel.name) {
      return liveLabel;
    }
  }
  return undefined;
}

async function getFileLabel(nameOrFrom: string): Promise<Label | undefined> {
  for (const fileLabel of fileLabels) {
    if (nameOrFrom == fileLabel.name || nameOrFrom == fileLabel.from_name) {
      return fileLabel;
    }
  }
  return undefined;
}

run();
