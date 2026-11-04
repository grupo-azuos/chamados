#!/bin/sh
set -eu

docker buildx build --load --file docker/dockerfile --tag "$APP_IMAGE" .
