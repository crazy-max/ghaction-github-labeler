[![GitHub release](https://img.shields.io/github/release/crazy-max/ghaction-github-labeler.svg?style=flat-square)](https://github.com/crazy-max/ghaction-github-labeler/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-github--labeler-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/github-labeler)
[![Test workflow](https://img.shields.io/github/workflow/status/crazy-max/ghaction-github-labeler/test?label=test&logo=github&style=flat-square)](https://github.com/crazy-max/ghaction-github-labeler/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/crazy-max/ghaction-github-labeler?logo=codecov&style=flat-square)](https://codecov.io/gh/crazy-max/ghaction-github-labeler)
[![Become a sponsor](https://img.shields.io/badge/sponsor-crazy--max-181717.svg?logo=github&style=flat-square)](https://github.com/sponsors/crazy-max)
[![Paypal Donate](https://img.shields.io/badge/donate-paypal-00457c.svg?logo=paypal&style=flat-square)](https://www.paypal.me/crazyws)

## About

GitHub Action to manage labels on GitHub (create/rename/update/delete) as code.

If you are interested, [check out](https://git.io/Je09Y) my other :octocat: GitHub Actions!

![GitHub Labeler](.res/ghaction-github-labeler.png)

___

* [Usage](#usage)
  * [YAML configuration](#yaml-configuration)
  * [Workflow](#workflow)
* [Customizing](#customizing)
  * [inputs](#inputs)
* [Keep up-to-date with GitHub Dependabot](#keep-up-to-date-with-github-dependabot)
* [How can I help?](#how-can-i-help)
* [License](#license)

## Usage

### YAML configuration

In the repository where you want to perform this action, create the YAML file `.github/labels.yml` (you can also set a [custom filename](#customizing)) that looks like:

```yaml
- name: "bug"
  color: "d73a4a"
  description: "Something isn't working"
- name: "documentation"
  color: "0075ca"
  description: "Improvements or additions to documentation"
- name: "duplicate"
  color: "cfd8d7"
  description: "This issue or pull request already exists"
- name: "enhancement"
  color: "a22eef"
- name: "wontfix_it"
  color: "000000"
  description: "This will not be worked on"
  from_name: "wontfix"
```

* `name`, `color` and `description` are the main [GitHub label fields](https://developer.github.com/v3/issues/labels/#parameters)
* `description` can be omit if your want to keep the current one
* `from_name` allow to rename a label from one currently available on your repository

### Workflow

```yaml
name: github

on: push

jobs:
  labeler:
    runs-on: ubuntu-latest
    steps:
      -
        name: Checkout
        uses: actions/checkout@v2
      -
        name: Run Labeler
        if: success()
        uses: crazy-max/ghaction-github-labeler@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          yaml-file: .github/labels.yml
          skip-delete: false
          dry-run: false
          exclude: |
            help*
            *issue
```

With this workflow, the YAML configuration above on a [fresh repository](.res/samples/original.yml), this will:

* Skip `bug` (because same `color` and `description`)
* Skip `documentation` (because same `color` and `description`)
* Update `duplicate` (`color` is different)
* Update `enhancement` (`color` is different, keep current `description`)
* Leave `good first issue` alone (because it matches an `exclude` pattern)
* Leave `help wanted` alone (because it matches an `exclude` pattern)
* Delete `invalid`
* Delete `question`
* Rename `wontfix` to `wontfix_it` and set `color` and `description`

## Customizing

### inputs

Following inputs can be used as `step.with` keys

| Name             | Type    | Default                | Description                        |
|------------------|---------|------------------------|------------------------------------|
| `github-token`   | String  | `${{ github.token }}`  | [GitHub Token](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token) as provided by `secrets` |
| `yaml-file`      | String  | `.github/labels.yml`   | Path to YAML file containing labels definitions |
| `skip-delete`    | Bool    | `false`                | If enabled, labels will not be deleted if not found in YAML file |
| `dry-run`        | Bool    | `false`                | If enabled, changes will not be applied |
| `exclude`        | List    |                        | Newline delimited list of labels pattern(s)/matcher to exclude |

## Keep up-to-date with GitHub Dependabot

Since [Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot)
has [native GitHub Actions support](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#package-ecosystem),
to enable it on your GitHub repo all you need to do is add the `.github/dependabot.yml` file:

```yaml
version: 2
updates:
  # Maintain dependencies for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "daily"
```

## How can I help?

All kinds of contributions are welcome :raised_hands:! The most basic way to show your support is to star :star2: the project, or to raise issues :speech_balloon: You can also support this project by [**becoming a sponsor on GitHub**](https://github.com/sponsors/crazy-max) :clap: or by making a [Paypal donation](https://www.paypal.me/crazyws) to ensure this journey continues indefinitely! :rocket:

Thanks again for your support, it is much appreciated! :pray:

## License

MIT. See `LICENSE` for more details.
