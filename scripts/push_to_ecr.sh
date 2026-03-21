#!/bin/bash

set -e

if ! aws sts get-caller-identity &>/dev/null; then
  echo "Error: not logged into AWS CLI. Run 'aws configure' or set AWS credentials."
  exit 1
fi

REGION="ap-southeast-2"
REPO_NAME="grocery-tracker-nightly-scrape"
IMAGE_NAME="nightly-price-scrape"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME"

cd "$(dirname "$0")/.." # build from project root

docker build --platform linux/amd64 -t $IMAGE_NAME:latest -f collector/nightly-price-scrape/Dockerfile .

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker tag $IMAGE_NAME:latest $ECR_URI:latest

docker push $ECR_URI:latest

echo "Pushed $ECR_URI:latest"