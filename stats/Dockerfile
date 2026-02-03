FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY spotify_tokens.json .
COPY top4.json .

EXPOSE 5000

CMD ["python", "server.py"]