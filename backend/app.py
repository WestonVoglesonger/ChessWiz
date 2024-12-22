#!/usr/bin/env python3
"""
A Flask-based backend for a chess openings memorization app.
"""

import os
import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Dynamically configure CORS to allow your frontend URL
CORS(app, origins=["https://WestonVoglesonger.github.io/ChessWiz"])

OPENINGS_FILE = "openings.json"
PROGRESS_FILE = "progress.json"

openings_data = []
user_progress = {}


def load_openings():
    global openings_data
    if not os.path.exists(OPENINGS_FILE):
        print(f"[ERROR] {OPENINGS_FILE} not found.")
        openings_data = []
        return
    with open(OPENINGS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        openings_data = data.get("Openings", [])


def load_progress():
    global user_progress
    if not os.path.exists(PROGRESS_FILE):
        print(f"[INFO] {PROGRESS_FILE} not found. Starting with empty progress.")
        user_progress = {}
        return
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        user_progress = data.get("Progress", {})


def save_progress():
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"Progress": user_progress}, f, indent=2)


@app.route("/api/openings", methods=["GET"])
def get_openings():
    """
    Returns a list of all openings with basic info.
    """
    result = []
    for o in openings_data:
        var_names = [v["variationName"] for v in o["variations"]]
        result.append({
            "id": o["id"],
            "openingName": o["openingName"],
            "ecoCode": o["ecoCode"],
            "variations": var_names
        })
    return jsonify(result), 200


@app.route("/api/openings/<int:opening_id>/<variation_name>", methods=["GET"])
def get_variation_moves(opening_id, variation_name):
    """
    Returns the moves list for a specific variation of a specific opening.
    """
    for o in openings_data:
        if o["id"] == opening_id:
            for v in o["variations"]:
                if v["variationName"].lower() == variation_name.lower():
                    return jsonify(v["moves"]), 200
    return jsonify({"error": "Variation not found"}), 404


@app.route("/api/openings/<int:opening_id>", methods=["GET"])
def get_opening_detail(opening_id):
    """
    Returns the full details for a specific opening, including
    description, strategicIdeas, famousGames, and variations.
    """
    for o in openings_data:
        if o["id"] == opening_id:
            return jsonify(o), 200
    return jsonify({"error": "Opening not found"}), 404


@app.route("/api/practice/random", methods=["GET"])
def get_random_opening():
    """
    Returns a random opening/variation from the list.
    """
    if not openings_data:
        return jsonify({"error": "No openings available"}), 404

    opening = random.choice(openings_data)
    variation = random.choice(opening["variations"])
    return jsonify({
        "openingId": opening["id"],
        "variationName": variation["variationName"],
        "moves": variation["moves"]
    }), 200


@app.route("/api/practice/checkMove", methods=["POST"])
def check_move():
    """
    Checks if the user's move is correct.
    """
    data = request.get_json()
    opening_id = data.get("openingId")
    variation_name = data.get("variationName")
    current_index = data.get("currentIndex", 0)
    user_move = data.get("userMove", "").strip().lower()

    found_opening, found_variation = None, None
    for o in openings_data:
        if o["id"] == opening_id:
            found_opening = o
            for v in o["variations"]:
                if v["variationName"].lower() == variation_name.lower():
                    found_variation = v
                    break

    if not found_opening or not found_variation:
        return jsonify({"error": "Invalid opening/variation"}), 400

    moves = found_variation["moves"]
    if current_index >= len(moves):
        return jsonify({"error": "Already at the end"}), 400

    correct_move = moves[current_index].lower()

    if user_move == correct_move:
        next_index = current_index + 1
        update_progress(opening_id, variation_name, next_index, current_index, success=True)
        return jsonify({"result": "correct", "nextIndex": next_index}), 200
    else:
        reset_index = max(0, current_index - 1)
        update_progress(opening_id, variation_name, reset_index, current_index, success=False)
        return jsonify({
            "result": "incorrect",
            "correctMove": correct_move,
            "nextIndex": reset_index
        }), 200


def update_progress(opening_id, variation_name, new_index, old_index, success=True):
    key = f"{opening_id}-{variation_name}"
    if key not in user_progress:
        user_progress[key] = {"moveIndex": 0, "failures": {}}

    if success:
        if new_index > user_progress[key]["moveIndex"]:
            user_progress[key]["moveIndex"] = new_index
    else:
        failures = user_progress[key]["failures"]
        failures[str(old_index)] = failures.get(str(old_index), 0) + 1

    save_progress()


@app.route("/")
def index():
    """
    Serve the frontend page if needed (for local dev).
    """
    return app.send_static_file("index.html")


if __name__ == "__main__":
    load_openings()
    load_progress()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 1600)), debug=False)
