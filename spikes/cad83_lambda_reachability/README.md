# CAD-83 spike: do COROS and Speediance accept calls from AWS Lambda?

Throwaway. This folder proves (or disproves) that the unofficial COROS and
Speediance APIs work from AWS data-centre IPs, before we build the nightly job on
Lambda. It is **not** the real handler: nothing in `backend/` uses it. Delete the
AWS resources when you're done (see [Teardown](#teardown)).

The Lambda:

1. Logs in to COROS (web login only, so your phone app should stay logged in) and
   reads today's schedule (Melbourne date).
2. Runs `speediance-cli login` from a bundled linux/arm64 binary, with its token
   cache in `/tmp/speediance/token.json`.
3. Returns and logs one JSON line: the public IP it called from, then for each
   service `ok`, where it failed (`stage`), the error type/message (with every
   credential replaced by `***`) and how long it took. No schedule contents, no
   tokens.

We run it in **both** candidate regions, Sydney (`ap-southeast-2`) and Melbourne
(`ap-southeast-4`), because the region is still an open question.

> **Heads-up:** a login from a new IP may trigger a security email from COROS or
> Speediance, or end an existing web session. Note anything like that in the
> results table.

## Prerequisites

- AWS CLI with a profile that can create IAM roles, Lambda, Secrets Manager and
  CloudWatch Logs (`export AWS_PROFILE=...`).
- Terraform ≥ 1.5.
- Python 3.12 with `pip`, plus `zip` and `file`.
- A **linux/arm64** build of `speediance-cli` saved as `bin/speediance-cli` in this
  folder. Get it as described on the Notion page *Speediance GM2 Integration —
  Technical Findings*. `bin/` is gitignored.
- From the same page, check how `speediance-cli login` takes credentials. The
  Lambda passes them as `SPEEDIANCE_EMAIL` and `SPEEDIANCE_PASSWORD` environment
  variables and runs `speediance-cli login`. If it needs different arguments, set
  the `SPEEDIANCE_ARGS` environment variable on the function (for example
  `login --non-interactive`). If it only works interactively (asks for input),
  that is a spike finding in itself: record it.

## 1. Build the package

```sh
cd spikes/cad83_lambda_reachability
./build.sh
```

This makes `build/spike.zip`: the handler, coros-mcp (pinned commit), the arm64
wheels it needs and the Speediance binary. It stops with a clear error if the
binary is missing or isn't arm64, or if the zip is over 50 MB.

- **Zip over 50 MB?** Upload it to an S3 bucket and point the function at it
  (replace `filename` with `s3_bucket`/`s3_key` in `main.tf`), or trim the package.
- **A wheel won't install/build?** Build inside the Lambda build image instead:
  `docker run --rm -v "$PWD":/work -w /work public.ecr.aws/sam/build-python3.12:latest-arm64 ./build.sh`.

## 2. Deploy (Sydney first)

```sh
terraform init
terraform workspace new ap-southeast-2
terraform apply -var region=ap-southeast-2
```

Each region gets its own Terraform workspace, which means its own local state file.

## 3. Put the credentials in the secret

Create `creds.json` **outside the repo** (for example `~/cad83-creds.json`) in an
editor, not with `echo`, so passwords don't land in your shell history:

```json
{
  "COROS_EMAIL": "...",
  "COROS_PASSWORD": "...",
  "SPEEDIANCE_EMAIL": "...",
  "SPEEDIANCE_PASSWORD": "..."
}
```

```sh
aws secretsmanager put-secret-value --region ap-southeast-2 \
  --secret-id "$(terraform output -raw secret_id)" \
  --secret-string file://$HOME/cad83-creds.json
```

Keep the file until you've done both regions, then delete it.

## 4. Invoke and read the result

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-read-timeout 200 out.json
cat out.json
```

The same JSON line is in CloudWatch Logs under `/aws/lambda/<function name>`.
To re-run one check only, pass a payload:

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-binary-format raw-in-base64-out \
  --payload '{"only": "coros"}' out.json   # or "speediance"
```

Reading the result:

- `coros.ok: true` → login and schedule read both worked.
- `coros.stage: "login"` with an HTTP status or a message about captcha,
  verification or "access denied" → probably **blocked**. A message about a wrong
  password means the credentials are wrong, not a block.
- `coros.stage: "import"` with `ImportError` / `ModuleNotFoundError` → the package
  is missing a module. Add it to `requirements.txt`, rebuild, `terraform apply`
  again.
- `speediance.ok: true` → the binary exited 0. Otherwise read `returncode` and
  `stderr_tail`. `error_type: "FileNotFoundError"` or `PermissionError` means the
  binary wasn't bundled or isn't executable; `TimeoutExpired` means it hung
  (possibly waiting for input).

**Then check your phone:** open the COROS app and confirm you're still logged in.
Record it in the table (this confirms the web-only login didn't log the app out).

## 5. Repeat for Melbourne

```sh
terraform workspace new ap-southeast-4
terraform apply -var region=ap-southeast-4
```

Then steps 3 and 4 again with `--region ap-southeast-4`. (Melbourne is an opt-in
region: enable it on the account first if `apply` says it's not available.)

## 6. Record the results on CAD-83

Paste this table into the card, one row per region:

| Region | Egress IP | COROS login | COROS schedule | Speediance exit code | Errors (type / message) | COROS app still logged in? | Security emails / logouts noticed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ap-southeast-2 | | | | | | | |
| ap-southeast-4 | | | | | | | |

## If it's blocked

Stop. Don't continue with Lambda-based cards. Raise it on the board with the
results table, so the runtime decision can be revisited. The fallback is running
the nightly job on the Pi.

## Teardown

Each region has its own local state, so destroy **once per region**:

```sh
terraform workspace select ap-southeast-2
terraform destroy -var region=ap-southeast-2
terraform workspace select ap-southeast-4
terraform destroy -var region=ap-southeast-4
```

Check nothing is left, in **each** region (both should print empty lists):

```sh
for r in ap-southeast-2 ap-southeast-4; do
  aws resourcegroupstaggingapi get-resources --region "$r" \
    --tag-filters Key=purpose,Values=cad-83-spike \
    --query 'ResourceTagMappingList[].ResourceARN'
  aws secretsmanager list-secrets --region "$r" \
    --filters Key=name,Values=cadence-spike-cad83 --query 'SecretList[].Name'
done
```

(The IAM role is global; check with
`aws iam list-roles --query "Roles[?starts_with(RoleName, 'cadence-spike-cad83')].RoleName"`.)

Finally clean up locally:

```sh
rm -rf .terraform .terraform.lock.hcl terraform.tfstate* terraform.tfstate.d \
  build package wheels out.json
rm ~/cad83-creds.json
```
