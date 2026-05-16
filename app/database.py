import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "tasked.db")
MIGRATIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "migrations")

def get_connection():
  """
  Acquires a connection to the TASKED database at $DATABASE_PATH.
  """
  conn = sqlite3.connect(DATABASE_PATH)

  # Row-as-dict so columns are accessible by name rather than index.
  conn.row_factory = sqlite3.Row

  return conn

def init_db():
  """
  Initializes the database by executing migration scripts in order.
  """
  conn = get_connection()

  for migration_file in sorted(filepath for filepath in os.listdir(MIGRATIONS_PATH) if filepath.endswith(".sql")):
    with open(os.path.join(MIGRATIONS_PATH, migration_file), "r") as migration_script:
      conn.executescript(migration_script.read())

  conn.commit()
  conn.close()
