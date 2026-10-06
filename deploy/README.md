# Production deployment (AWS EC2 + Docker Compose)

```
Internet ─ DNS ─ EC2 (Elastic IP, t4g.medium, Amazon Linux 2023)
                   ├─ caddy   :80/:443, automatic TLS ─▶ api:3001
                   ├─ api     image from ECR, env from .env.prod
                   └─ qdrant  data on its own EBS volume (/data/qdrant)
                 └─ RDS PostgreSQL 17 (private, TLS enforced)
S3 (uploaded files) · SES SMTP (mail) · SSM Parameter Store (config/secrets)
```

- Infrastructure: [`infra/`](../infra) (Terraform).
- Host files (this folder): `docker-compose.prod.yaml`, `Caddyfile`, `deploy.sh`, `render-env.sh`. They are synced to `/opt/teddy-support` on every deploy.
- Image: [`Dockerfile.prod`](../Dockerfile.prod).

## Configuration and secrets

All runtime configuration lives in SSM Parameter Store under `/teddy-support/prod/`, with one parameter per environment variable:

- Secrets are `SecureString`, using the AWS managed `aws/ssm` key. The instance role only needs `ssm:GetParametersByPath`.
- On every deploy, `render-env.sh` writes them to `/opt/teddy-support/.env.prod` (mode 600). To change a value, update the parameter and redeploy.
- Terraform creates the infrastructure-derived values, plus generated `DATABASE_PASSWORD` and `AUTH_*` secrets. That means the Terraform state contains secrets, so keep it in a private, encrypted backend (see `infra/versions.tf`).

Set third-party secrets by hand, so they never end up in the state:

```sh
P=/teddy-support/prod
aws ssm put-parameter --type SecureString --name $P/ANTHROPIC_API_KEY --value '...'
aws ssm put-parameter --type SecureString --name $P/VOYAGE_API_KEY    --value '...'
aws ssm put-parameter --type SecureString --name $P/MAIL_USER         --value '<SES SMTP user>'
aws ssm put-parameter --type SecureString --name $P/MAIL_PASSWORD     --value '<SES SMTP password>'
# Feature flags and other settings from env-example-relational, e.g.:
aws ssm put-parameter --type String --name $P/INTENT_RECOGNITION_ENABLED --value true
aws ssm put-parameter --type String --name $P/KNOWLEDGE_ENABLED          --value true
```

Values must not contain single quotes, backslashes or newlines; `render-env.sh` refuses them.

## First-time setup

1. **Terraform state**: create a private, versioned S3 bucket for state, then fill in the `backend "s3"` block in `infra/versions.tf`.
2. **Apply**:
   ```sh
   cd infra
   cp terraform.tfvars.example terraform.tfvars   # edit
   terraform init && terraform apply
   ```
3. **DNS**: point an A record for `domain` at the `elastic_ip` output. Caddy gets the certificate on the first request.
4. **SES**: verify the domain in SES, create SMTP credentials, and request production access (leave the sandbox). Then store `MAIL_USER` and `MAIL_PASSWORD` as above.
5. **Third-party secrets**: put them in SSM as above.
6. **GitHub**: add these repository variables from `terraform output`:
   - `AWS_REGION`
   - `AWS_DEPLOY_ROLE_ARN`
   - `ECR_REPOSITORY_URL`
   - `DEPLOY_BUCKET`
   - `INSTANCE_ID`
7. **First deploy**: run the **Deploy** workflow (Actions → Deploy → Run workflow), or push to `main`.
8. **Seed once**: open a session with `aws ssm start-session --target <instance_id>`, then run:
   ```sh
   cd /opt/teddy-support && set -a && . /etc/teddy-support.env && set +a
   export API_IMAGE=$ECR_REPOSITORY_URL:$(cat .current-tag)
   docker compose -f docker-compose.prod.yaml run --rm --no-deps api npm run seed:run:relational:prod
   ```
   ⚠️ The seed creates `admin@example.com` and `john.doe@example.com` with the password `secret`. Change both passwords (or delete the users) right away.

## Day to day

- **Deploy**: every push to `main` deploys once CI passes. The deploy runs the migrations first; if they fail, the running version stays up.
- **Rollback**: on the host, run `cd /opt/teddy-support && ./deploy.sh "$(cat .previous-tag)"`, or pass any earlier git SHA. Database migrations are not rolled back.
- **Logs**: `docker compose -f docker-compose.prod.yaml logs -f api`. Set `DOMAIN` and `API_IMAGE` first, as in the seed step.
- **Shell access**: `aws ssm start-session --target <instance_id>`. Port 22 is closed.
- **Backups**:
  - RDS keeps 7 days of automated backups.
  - The Qdrant volume gets a daily snapshot, kept for 14 days. Qdrant can also be rebuilt by re-indexing the knowledge resources.

## Scaling note

Run exactly one API instance. Rate limiting, message debouncing and the data retention job all keep state in process memory.
