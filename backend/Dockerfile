FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# TODO(verify): package names against WeasyPrint install docs for Debian bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 libffi8 shared-mime-info fontconfig \
    && rm -rf /var/lib/apt/lists/*

ARG REQUIREMENTS=requirements.txt
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r ${REQUIREMENTS}

COPY . .
RUN chmod +x start.sh
EXPOSE 8000
CMD ["./start.sh"]
