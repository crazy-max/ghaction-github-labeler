import * as fs from 'fs';
import * as yaml from 'js-yaml';
import matcher from 'matcher';
import * as core from '@actions/core';
import * as github from '@actions/github';
import {getInputs, Inputs} from './context';

let inputs: Inputs;
let octokit;
let liveLabels: Array<Label>;
let fileLabels: Array<Label>;
let exclusions: Array<string>;

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
    inputs = await getInputs();
    octokit = github.getOctokit(inputs.githubToken);

    if (!fs.existsSync(inputs.yamlFile)) {
      core.setFailed(`Cannot find YAML file ${inputs.yamlFile}`);
      return;
    }

    liveLabels = await getLiveLabels();
    fileLabels = await getFileLabels(inputs.yamlFile);
    await displayLiveLabels();

    core.info(`🏃 Running GitHub Labeler`);
    let actionLabels = await getActionLabels();
    let hasError: boolean = false;
    for (const actionLabel of actionLabels) {
      switch (actionLabel.ghaction_status) {
        case LabelStatus.Exclude: {
          core.info(`${inputs.dryRun ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          break;
        }
        case LabelStatus.Create: {
          if (inputs.dryRun) {
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
            core.error(`Cannot create "${actionLabel.name}" label: ${err.message}`);
            hasError = true;
          }
          break;
        }
        case LabelStatus.Update: {
          if (inputs.dryRun) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              current_name: actionLabel.name,
              name: actionLabel.name,
              color: actionLabel.color,
              description: actionLabel.description,
              mediaType: {
                previews: ['symmetra']
              }
            };
            await octokit.issues.updateLabel(params);
          } catch (err) {
            core.error(`Cannot update "${actionLabel.name}" label: ${err.message}`);
            hasError = true;
          }
          break;
        }
        case LabelStatus.Rename: {
          if (inputs.dryRun) {
            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
            break;
          }
          try {
            core.info(`${actionLabel.ghaction_log}`);
            const params = {
              ...github.context.repo,
              current_name: actionLabel.from_name,
              name: actionLabel.name,
              color: actionLabel.color,
              description: actionLabel.description,
              mediaType: {
                previews: ['symmetra']
              }
            };
            await octokit.issues.updateLabel(params);
          } catch (err) {
            core.error(`Cannot rename "${actionLabel.from_name}" label: ${err.message}`);
            hasError = true;
          }
          break;
        }
        case LabelStatus.Delete: {
          if (inputs.skipDelete) {
            core.info(`${inputs.dryRun ? '[dryrun] ' : ''}⛔️ Skipping delete for '${actionLabel.name}' (inputs.skipDelete on)`);
            break;
          }
          if (inputs.dryRun) {
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
            core.error(`Cannot delete "${actionLabel.name}" label: ${err.message}`);
            hasError = true;
          }
          break;
        }
        case LabelStatus.Skip: {
          core.info(`${inputs.dryRun ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          break;
        }
        case LabelStatus.Error: {
          core.error(`${inputs.dryRun ? '[dryrun] ' : ''}${actionLabel.ghaction_log}`);
          hasError = true;
          break;
        }
        default: {
          core.error(`${inputs.dryRun ? '[dryrun] ' : ''}🚫 '${actionLabel.name}' not processed`);
          hasError = true;
          break;
        }
      }
    }
    if (hasError) {
      core.setFailed('Errors have occurred. Please check generated annotations.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getLiveLabels(): Promise<Array<Label>> {
  return (
    await octokit.paginate(octokit.issues.listLabelsForRepo, {
      ...github.context.repo
    })
  ).map(label => {
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

async function getExclusions(): Promise<string[]> {
  if (inputs.exclude.length == 0) {
    return [];
  }
  return matcher(
    liveLabels.map(label => label.name),
    inputs.exclude
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
        if (exclusions.includes(liveFromLabel.name)) {
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
      if (exclusions.includes(liveLabel.name)) {
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
    if (exclusions.includes(liveLabel.name)) {
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
