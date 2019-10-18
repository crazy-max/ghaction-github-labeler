"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const octokit = new github.GitHub(process.env['GITHUB_TOKEN'] || '');
let liveLabels;
let fileLabels;
var LabelStatus;
(function (LabelStatus) {
    LabelStatus[LabelStatus["Create"] = 0] = "Create";
    LabelStatus[LabelStatus["Update"] = 1] = "Update";
    LabelStatus[LabelStatus["Rename"] = 2] = "Rename";
    LabelStatus[LabelStatus["Delete"] = 3] = "Delete";
    LabelStatus[LabelStatus["Skip"] = 4] = "Skip";
    LabelStatus[LabelStatus["Error"] = 5] = "Error";
})(LabelStatus || (LabelStatus = {}));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const yaml_file = path.join(core.getInput('yaml_file') || '.github/labels.yml');
            const skip_delete = /true/i.test(core.getInput('skip_delete'));
            const dry_run = /true/i.test(core.getInput('dry_run'));
            if (!fs.existsSync(yaml_file)) {
                core.setFailed(`Cannot find YAML file ${yaml_file}`);
                return;
            }
            liveLabels = yield getLiveLabels();
            fileLabels = yield getFileLabels(yaml_file);
            yield displayLiveLabels();
            core.info(`🏃 Running GitHub Labeler`);
            let actionLabels = yield getActionLabels();
            for (const actionLabel of actionLabels) {
                switch (actionLabel.ghaction_status) {
                    case LabelStatus.Create: {
                        if (dry_run) {
                            core.info(`[dryrun] ${actionLabel.ghaction_log}`);
                            break;
                        }
                        try {
                            core.info(`${actionLabel.ghaction_log}`);
                            const params = Object.assign(Object.assign({}, github.context.repo), { name: actionLabel.name, color: actionLabel.color, description: actionLabel.description, mediaType: {
                                    previews: ['symmetra']
                                } });
                            yield octokit.issues.createLabel(params);
                        }
                        catch (err) {
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
                            const params = Object.assign(Object.assign({}, github.context.repo), { current_name: actionLabel.name, color: actionLabel.color, description: actionLabel.description, mediaType: {
                                    previews: ['symmetra']
                                } });
                            yield octokit.issues.updateLabel(params);
                        }
                        catch (err) {
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
                            const params = Object.assign(Object.assign({}, github.context.repo), { current_name: `${actionLabel.from_name}`, name: actionLabel.name, color: actionLabel.color, description: actionLabel.description, mediaType: {
                                    previews: ['symmetra']
                                } });
                            yield octokit.issues.updateLabel(params);
                        }
                        catch (err) {
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
                            const params = Object.assign(Object.assign({}, github.context.repo), { name: actionLabel.name });
                            yield octokit.issues.deleteLabel(params);
                        }
                        catch (err) {
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
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function getLiveLabels() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield octokit.issues.listLabelsForRepo(Object.assign(Object.assign({}, github.context.repo), { mediaType: {
                previews: ['symmetra']
            } }))).data;
    });
}
function getFileLabels(yamlFile) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield yaml.load(fs.readFileSync(yamlFile, { encoding: 'utf-8' })));
    });
}
function displayLiveLabels() {
    return __awaiter(this, void 0, void 0, function* () {
        let labels = Array();
        for (const liveLabel of liveLabels) {
            labels.push({
                name: liveLabel.name,
                color: liveLabel.color,
                description: liveLabel.description
            });
        }
        core.info(`👉 Current labels\n${yaml.safeDump(labels).toString()}`);
    });
}
function getActionLabels() {
    return __awaiter(this, void 0, void 0, function* () {
        let labels = Array();
        for (const fileLabel of fileLabels) {
            const liveLabel = yield getLiveLabel(fileLabel.name);
            // Rename
            if (fileLabel.from_name !== undefined) {
                if ((yield getLiveLabel(fileLabel.name)) !== undefined) {
                    labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Skip, ghaction_log: `⚠️ Skipping rename '${fileLabel.from_name}' label to '${fileLabel.name}'. Already exists` }));
                    continue;
                }
                const liveFromLabel = yield getLiveLabel(fileLabel.from_name);
                if (liveFromLabel !== undefined) {
                    labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Rename, ghaction_log: `✨ Renaming '${liveFromLabel.name}' label to '${fileLabel.name}' and set color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}` }));
                    continue;
                }
                labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Error, ghaction_log: `❌ Label '${fileLabel.from_name}' not found. Cannot rename` }));
                continue;
            }
            // Update
            if (liveLabel !== undefined) {
                if (fileLabel.color == liveLabel.color && fileLabel.description == liveLabel.description) {
                    labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Skip, ghaction_log: `⚠️ Skipping update for '${fileLabel.name}' label. Same color and description` }));
                    continue;
                }
                labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Update, ghaction_log: `🔨 Updating '${fileLabel.name}' label with color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}` }));
                continue;
            }
            // Create
            labels.push(Object.assign(Object.assign({}, fileLabel), { ghaction_status: LabelStatus.Create, ghaction_log: `🎨 Creating '${fileLabel.name}' label with color '${fileLabel.color}'${fileLabel.description !== undefined ? ` and desc '${fileLabel.description}'` : ''}` }));
        }
        // Delete
        for (const liveLabel of liveLabels) {
            if ((yield getFileLabel(liveLabel.name)) !== undefined) {
                continue;
            }
            labels.push(Object.assign(Object.assign({}, liveLabel), { ghaction_status: LabelStatus.Delete, ghaction_log: `🔫 Deleting '${liveLabel.name}'` }));
        }
        return labels;
    });
}
function getLiveLabel(name) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const liveLabel of liveLabels) {
            if (name == liveLabel.name) {
                return liveLabel;
            }
        }
        return undefined;
    });
}
function getFileLabel(nameOrFrom) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const fileLabel of fileLabels) {
            if (nameOrFrom == fileLabel.name || nameOrFrom == fileLabel.from_name) {
                return fileLabel;
            }
        }
        return undefined;
    });
}
run();
