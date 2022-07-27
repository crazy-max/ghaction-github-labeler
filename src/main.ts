import * as core from '@actions/core';
import {getInputs, Inputs} from './context';
import {Labeler} from './labeler';

async function run() {
  try {
    const inputs: Inputs = await getInputs();

    const labeler = new Labeler(inputs);
    await labeler.printRepoLabels();

    core.info(`🏃 Running GitHub Labeler`);
    await labeler.run();
  } catch (error) {
    core.setFailed(error.message);
  }
}

await run();
