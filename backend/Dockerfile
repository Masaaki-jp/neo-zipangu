# 軽量でセキュアなAlpine Linuxベースを採用
FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Cloud Runの要件に従いポート8080で起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]