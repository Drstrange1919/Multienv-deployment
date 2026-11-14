import logging
import os
from datetime import datetime, timezone
from itertools import count

from flask import Flask, jsonify, request

app = Flask(__name__)
APP_ENV = os.getenv("APP_ENV", "production")
PORT = int(os.getenv("PORT", "3002"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Demonstration data only. Tickets are held in memory and reset when this
# container is recreated. Replace this with your real database integration.
_ticket_ids = count(4)
TICKETS = [
    {
        "id": 101,
        "title": "Production: Payment status monitoring",
        "description": "Review payment status alerts after deployment.",
        "status": "In Progress",
        "priority": "High",
        "environment": "production",
    },
    {
        "id": 102,
        "title": "Production: User access request",
        "description": "Validate a user access request.",
        "status": "Open",
        "priority": "Medium",
        "environment": "production",
    },
    {
        "id": 103,
        "title": "Production: Archive completed tickets",
        "description": "Confirm the ticket archive process.",
        "status": "Resolved",
        "priority": "Low",
        "environment": "production",
    },
]


@app.get("/api/health")
def health():
    return jsonify(
        status="healthy",
        environment=APP_ENV,
        service="backend-prod",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/api/info")
def info():
    return jsonify(
        application="Multi-environment ticket management",
        environment=APP_ENV,
        server="Gunicorn",
        port=PORT,
    )


@app.route("/api/tickets", methods=["GET", "POST"])
def tickets():
    if request.method == "GET":
        return jsonify(items=TICKETS, count=len(TICKETS), environment=APP_ENV)

    body = request.get_json(silent=True) or {}
    title = str(body.get("title", "")).strip()
    description = str(body.get("description", "")).strip()
    priority = str(body.get("priority", "Medium")).strip()

    if not title:
        return jsonify(error="The ticket title is required."), 400
    if priority not in {"Low", "Medium", "High"}:
        return jsonify(error="Priority must be Low, Medium, or High."), 400

    ticket = {
        "id": 100 + next(_ticket_ids),
        "title": title,
        "description": description,
        "status": "Open",
        "priority": priority,
        "environment": APP_ENV,
    }
    TICKETS.insert(0, ticket)
    logger.info("Created production ticket id=%s", ticket["id"])
    return jsonify(item=ticket), 201


@app.errorhandler(404)
def not_found(_error):
    return jsonify(error="API endpoint not found."), 404


@app.errorhandler(500)
def internal_error(_error):
    logger.exception("Unexpected application error")
    return jsonify(error="Internal server error."), 500
