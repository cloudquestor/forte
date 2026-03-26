FROM python:3.12-slim

# Non-root user
RUN useradd -m -u 1001 forte

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chown -R forte:forte /app

USER forte

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
