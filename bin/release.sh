#!/usr/bin/env bash

set -e  # Exit on any error

# Colors for output
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
BLUE=$'\033[0;34m'
NC=$'\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/verify-packed-manifest.sh"

print_status() {
    echo "${BLUE}🔄 $1...${NC}"
}

print_success() {
    echo "${GREEN}✅ $1${NC}"
}

print_error() {
    echo "${RED}❌ $1${NC}"
}

prompt_for_confirmation() {
    local message="$1"
    echo -n "$message (y/N): "
    read -r answer
    case "$answer" in
        [Yy]|[Yy][Ee][Ss]) return 0 ;;
        *) return 1 ;;
    esac
}

check_git_status() {
    local status
    status=$(git status --porcelain 2>/dev/null)

    if [ -n "$status" ]; then
        print_error "Working directory is not clean. Please commit or stash changes first."
        echo "Uncommitted changes:"
        echo "$status"
        exit 1
    fi
}

manifest_field() {
    node -e "console.log(require('./$1/package.json').$2)"
}

verify_published_package() {
    local package="$1" attempt output remaining max_attempts=41

    # npm scanning can exceed 15 minutes; wait up to 20 minutes plus request time without another upload.
    for ((attempt=1; attempt<=max_attempts; attempt++)); do
        if output=$(npm view "$package" version --prefer-online --fetch-retries=0 --fetch-timeout=10000 2>&1); then
            return 0
        fi
        if [ "$attempt" -lt "$max_attempts" ]; then
            if [ "$attempt" -eq 1 ]; then
                print_status "Waiting for registry availability of $package"
                echo "npm processing can take 5–15 minutes or longer. Checking every 30 seconds; no need to publish again."
            elif [ "$(( (attempt - 1) % 4 ))" -eq 0 ]; then
                print_status "Still waiting for registry confirmation of $package"
            fi
            if test -t 1; then
                for ((remaining=30; remaining>0; remaining--)); do
                    printf '\r\033[K⏳ Waiting for npm; next check in %2ss' "$remaining"
                    sleep 1
                done
                printf '\r\033[K'
            else
                sleep 30
            fi
        fi
    done

    printf '%s\n' "$output" >&2
    return 1
}

if [ "$#" -ne 2 ] || [ "$1" != --filter ]; then
    print_error "Usage: bash bin/release.sh --filter kirari|compat|compat-react|compat-rehype|rehype|react"
    exit 1
fi
case "$2" in
    kirari|compat|compat-react|compat-rehype|rehype|react) PACKAGE_DIR="packages/$2" ;;
    *) print_error "Unknown filter: $2. Use kirari, compat, compat-react, compat-rehype, rehype or react."; exit 1 ;;
esac
PUBLISH_TARGET=$(manifest_field "$PACKAGE_DIR" name)
echo "${BLUE}📦 Publish only: $PUBLISH_TARGET${NC}"

echo -e "${BLUE}🚀 Starting Kirari release...${NC}"
echo

print_status "Checking git status"
check_git_status

HAS_CHANGESETS=false
if find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' | grep -q .; then
    HAS_CHANGESETS=true
    print_status "Planning version updates for all pending packages"
    # The filter selects publishing; Changesets applies all pending changesets.
    CHANGESET_STATUS_DIR=$(mktemp -d)
    trap 'rm -rf "$CHANGESET_STATUS_DIR"' EXIT
    bunx changeset status --output="$CHANGESET_STATUS_DIR/status.json"
    node -e '
      const plan = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
      const explicitPackages = new Set(plan.changesets.flatMap(changeset =>
        changeset.releases.filter(release => release.type !== "none").map(release => release.name)
      ));
      const releases = plan.releases.filter(release => release.type !== "none");
      const implicitPackages = releases.filter(release => !explicitPackages.has(release.name));
      if (implicitPackages.length) {
        console.error("Changesets requires additional version bumps. Add an explicit changeset for: " +
          implicitPackages.map(release => release.name).join(", "));
        process.exit(1);
      }
      for (const release of releases) {
        console.log(`  ${release.name}: ${release.oldVersion} → ${release.newVersion}`);
      }
    ' "$CHANGESET_STATUS_DIR/status.json"
    rm -rf "$CHANGESET_STATUS_DIR"
    trap - EXIT
else
    print_status "No pending changesets - publishing the current version"
    echo "  $PUBLISH_TARGET@$(manifest_field "$PACKAGE_DIR" version)"
fi

if ! prompt_for_confirmation "🔥 Apply this release plan and publish $PUBLISH_TARGET?"; then
    print_error "Release cancelled."
    exit 1
fi

echo

# Changesets v3 exits 1 when there is nothing to version, which under 'set -e'
# stops a resumed release (changesets already consumed and committed) before
# it can publish.
if [ "$HAS_CHANGESETS" = true ]; then
    bunx changeset version
fi

# Also refresh on retries: a prior lockfile update may have failed after versioning.
node "$SCRIPT_DIR/lib/sync-workspace-versions.mjs"
bun install --lockfile-only --ignore-scripts

# Typechecks, tests, builds, the docs site, and the packed-consumer install check.
bun run check

git add -A
# A resumed release (publish failed after versioning was committed) has nothing
# left to stage, and an empty commit would stop the retry under 'set -e'.
if git diff --cached --quiet; then
    print_status "No version changes to commit - resuming an in-progress release"
else
    git commit -m 'chore: release'
fi

git push

print_status "Checking npm authentication"
if ! npm whoami &>/dev/null; then
    print_status "Authenticating with npm (will open browser for passkey)"
    npm login --auth-type=web
else
    print_success "Already authenticated with npm"
fi

PACKAGE_NAME=$(manifest_field "$PACKAGE_DIR" name)
PACKAGE_VERSION=$(manifest_field "$PACKAGE_DIR" version)

# A resumed release may already have published this version.
if npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}" version --prefer-online > /dev/null 2>&1; then
    print_success "${PACKAGE_NAME}@${PACKAGE_VERSION} is already on npm - skipping"
else
    print_status "Publishing ${PACKAGE_NAME}@${PACKAGE_VERSION}"
    pushd "$PACKAGE_DIR" > /dev/null
    verify_packed_manifest
    if ! bun publish --access public; then
        # An earlier lookup can miss a version that npm refuses to overwrite.
        print_status "Publish command failed; checking whether ${PACKAGE_NAME}@${PACKAGE_VERSION} already exists"
    fi
    popd > /dev/null

    # 'bun publish' can exit 0 after a failed browser authentication, leaving
    # the version unpublished. Without this check the script tags a release
    # that is not on the registry.
    print_status "Verifying ${PACKAGE_NAME}@${PACKAGE_VERSION} reached the registry"
    if ! verify_published_package "${PACKAGE_NAME}@${PACKAGE_VERSION}"; then
        print_error "Registry verification timed out for ${PACKAGE_NAME}@${PACKAGE_VERSION}; publication remains unconfirmed."
        print_error "npm may still be processing the upload. If npm reported processing, wait for visibility before rerunning; do not republish or bump the version yet."
        echo "Check availability later: npm view ${PACKAGE_NAME}@${PACKAGE_VERSION} version --prefer-online"
        exit 1
    fi
    print_success "Published and available on npm: ${PACKAGE_NAME}@${PACKAGE_VERSION}"
fi

TAG="${PACKAGE_NAME}@${PACKAGE_VERSION}"
git rev-parse -q --verify "refs/tags/$TAG" > /dev/null || git tag "$TAG"

git push --tags

echo
print_success "Release of ${PACKAGE_NAME}@${PACKAGE_VERSION} completed successfully!"
echo "📦 Package available: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${PACKAGE_VERSION}"
echo "🏷️ Git tag pushed: $TAG"
