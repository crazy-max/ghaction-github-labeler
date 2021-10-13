variable "GITHUB_REPOSITORY" {
  default = "crazy-max/ghaction-github-labeler"
}
variable "NODE_VERSION" {
  default = "12"
}

target "_common" {
  args = {
    NODE_VERSION = NODE_VERSION
    GITHUB_REPOSITORY = GITHUB_REPOSITORY
  }
}

group "default" {
  targets = ["build"]
}

group "pre-checkin" {
  targets = ["vendor-update", "format", "build"]
}

group "validate" {
  targets = ["vendor-validate", "format-validate", "build-validate"]
}

target "vendor-update" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "vendor-update"
  output = ["."]
}

target "vendor-validate" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "vendor-validate"
}

target "build" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "build-update"
  output = ["."]
}

target "build-validate" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "build-validate"
}

target "format" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "format-update"
  output = ["."]
}

target "format-validate" {
  inherits = ["_common"]
  dockerfile = "./hack/build.Dockerfile"
  target = "format-validate"
}

target "test" {
  inherits = ["_common"]
  dockerfile = "./hack/test.Dockerfile"
  secret = ["id=GITHUB_TOKEN,env=GITHUB_TOKEN"]
  target = "test-coverage"
  output = ["./coverage"]
}

target "test-local" {
  inherits = ["test"]
  secret = ["id=GITHUB_TOKEN,src=.dev/.ghtoken"]
}
