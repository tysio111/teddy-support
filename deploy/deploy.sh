#!/usr/bin/env bash
# Deploys an API image on the EC2 host. Run as root from /opt/teddy-support:
#   ./deploy.sh <image-tag>
# Host settings (AWS_REGION, ECR_REPOSITORY_URL, DOMAIN, SSM_PATH) come from
# /etc/teddy-support.env, written by the instance user data.
set -euo pipefail

TAG="${1:?usage: deploy.sh <image-tag>}"
cd "$(dirname "$0")"

set -a
# shellcheck disable=SC1091
source /etc/teddy-support.env
set +a

export API_IMAGE="${ECR_REPOSITORY_URL}:${TAG}"
compose() { docker compose -f docker-compose.prod.yaml "$@"; }

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ECR_REPOSITORY_URL%%/*}"

./render-env.sh .env.prod

compose pull api
# Migrations run before the new version starts; a failure aborts the deploy
# and leaves the running version untouched.
compose run --rm --no-deps api npm run migration:run:prod
compose up -d --remove-orphans

# Remember what is running, for rollbacks: ./deploy.sh "$(cat .previous-tag)"
[[ -f .current-tag ]] && cp .current-tag .previous-tag
echo "$TAG" > .current-tag

docker image prune -af --filter "until=168h" >/dev/null
echo "deploy: $API_IMAGE is up"
