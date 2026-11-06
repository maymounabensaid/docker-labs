"""To-Do web app — Flask + PostgreSQL (Docker lab 04)."""
import os

import psycopg2
from flask import Flask, redirect, render_template, request, url_for

app = Flask(__name__)


def get_connection():
    """Open a connection using the environment variables passed to the container."""
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "db"),
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
    )


def run(query, params=(), fetch=False):
    """Run one SQL statement; return the rows when fetch=True."""
    conn = get_connection()
    try:
        with conn:  # commits on success, rolls back on error
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchall() if fetch else None
    finally:
        conn.close()


@app.route("/")
def index():  # READ
    tasks = run(
        "SELECT id, title, done, created_at FROM tasks ORDER BY done, id DESC",
        fetch=True,
    )
    return render_template("index.html", tasks=tasks, db_host=os.environ.get("DB_HOST", "db"))


@app.route("/add", methods=["POST"])
def add():  # CREATE
    title = request.form.get("title", "").strip()
    if title:
        run("INSERT INTO tasks (title) VALUES (%s)", (title,))
    return redirect(url_for("index"))


@app.route("/toggle/<int:task_id>", methods=["POST"])
def toggle(task_id):  # UPDATE
    run("UPDATE tasks SET done = NOT done WHERE id = %s", (task_id,))
    return redirect(url_for("index"))


@app.route("/delete/<int:task_id>", methods=["POST"])
def delete(task_id):  # DELETE
    run("DELETE FROM tasks WHERE id = %s", (task_id,))
    return redirect(url_for("index"))


@app.errorhandler(psycopg2.OperationalError)
def db_unavailable(error):
    return (
        "<h1>Database unavailable</h1>"
        f"<p>Cannot reach PostgreSQL on host <b>{os.environ.get('DB_HOST', 'db')}</b>.</p>"
        f"<pre>{error}</pre>",
        503,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
