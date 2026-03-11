# Tap service for Railway deployment
#
# This is a thin wrapper around the official Tap image that allows
# Railway to inject environment variables at runtime.

FROM ghcr.io/bluesky-social/indigo/tap:latest

# Railway will inject these via environment variables
# No build-time configuration needed

# Tap listens on port 2480 by default
EXPOSE 2480

# The base image already has the correct CMD (/tap)
