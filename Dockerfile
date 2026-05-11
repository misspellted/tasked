FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

# Despite being a command that is executable, the EXPOSE command legacy is only for documentation.
# So... future me - don't bang your head on the desk when it doesn't work! Because it won't.
# Instead, it is used to inform you of the `p` option in the `docker run` command:
#
#   docker run -p 8000:8000 ...
#
# It is also a reference for future docker-compose.yml usage, where the port is indeed exposed there
# (as a kind of encapsulation of the run subcommand above).
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
