FROM python:3.12-slim

WORKDIR /app

# Dependencies first: this layer is cached as long as requirements.txt doesn't change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Then the source code
COPY . .

EXPOSE 5000
CMD ["python", "app.py"]
