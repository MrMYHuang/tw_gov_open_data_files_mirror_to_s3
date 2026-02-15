#!/usr/bin/env bash

set -euo pipefail
rm -f a.zip
zip -r a.zip params.json package.json index.js dist node_modules

REGION="${AWS_REGION:-ap-northeast-1}"
FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-MirroringTwOpenDataToS3}"
ZIP_PATH="${1:-a.zip}"

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI is not installed." >&2
  exit 1
fi

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Error: zip file not found: $ZIP_PATH" >&2
  exit 1
fi

echo "Deploying $ZIP_PATH to Lambda function '$FUNCTION_NAME' in region '$REGION'..."

aws lambda update-function-code \
  --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_PATH"

echo "Deployment request submitted."
