FROM python:3.11-slim

# Buat non-root user sesuai standar keamanan Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Salin dan install dependencies
COPY --chown=user:user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Salin seluruh source code
COPY --chown=user:user . .

# Port default Hugging Face Spaces
EXPOSE 7860

# Jalankan uvicorn FastAPI di port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
