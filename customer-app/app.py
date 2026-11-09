"""Smart Market - customer web app (Flask).

Serves the customer pages and two AI endpoints:
  POST /ai-search   natural-language product search
  POST /ai-product  questions about the product being viewed

Run from this folder with:  python app.py
Needs serviceAccountKey.json and the OPENAI_API_KEY environment variable.
"""
import json

import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, jsonify, redirect, render_template, request, url_for
from openai import OpenAI

# =====================
# APP INIT
# =====================
app = Flask(__name__)

# =====================
# FIREBASE INIT
# =====================
cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# =====================
# OPENAI INIT
# =====================
client = OpenAI()  # reads the OPENAI_API_KEY environment variable


# =====================
# AI SEARCH HELPER
# =====================
def chatgpt_search(query, product_names):
    """Ask the model which product names match the customer's query.

    Returns a list of product names (an empty list if the reply is not
    valid JSON).
    """
    prompt = f"""
You are a smart product search engine.

User query:
"{query}"

Products (by name only):
{product_names}

Task:
Select ONLY the products that truly match the user's intent.
Exclude products that contradict the intent.
Do not guess. If a product is not clearly suitable, exclude it.

Return ONLY valid JSON:
{{ "results": ["Product Name 1", "Product Name 2"] }}
"""

    response = client.responses.create(
        model="gpt-4.1",
        input=prompt
    )

    try:
        data = json.loads(response.output_text)
        return data.get("results", [])
    except Exception as e:
        print("❌ JSON parse error:", e)
        print(response.output_text)
        return []


# =====================
# PAGES
# =====================
@app.route("/")
def index():
    """The site starts at the login page."""
    return redirect(url_for("login"))


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/signup")
def signup():
    return render_template("signup.html")


@app.route("/customer")
def customer():
    return render_template("customer.html")


@app.route("/search")
def search_page():
    query = request.args.get("q", "").strip()
    return render_template("search_results.html", query=query)


@app.route("/category")
def category_page():
    category = request.args.get("category")
    return render_template(
        "search_categories.html",
        query=category
    )


@app.route("/product")
def product_page():
    """Product page: reads one item from Firestore and renders it."""
    category = request.args.get("category")
    item_id = request.args.get("item_id")

    if not category or not item_id:
        return "Missing parameters", 400

    doc = (
        db.collection("products")
        .document(category)
        .collection("items")
        .document(item_id)
        .get()
    )

    if not doc.exists:
        return "Product not found", 404

    return render_template(
        "product.html",
        product=doc.to_dict(),
        product_id=item_id
    )


@app.route("/cart")
def cart():
    return render_template("cart.html")


@app.route("/payment")
def payment():
    return render_template("payment.html")


@app.route("/my-orders")
def my_orders():
    return render_template("my_orders.html")


@app.route("/order-details")
def order_details():
    return render_template("order-details.html")


@app.route("/favorites")
def favorites():
    return render_template("favorites.html")


@app.route("/notifications")
def notifications():
    return render_template("notifications.html")


# =====================
# AI ENDPOINTS
# =====================
@app.route("/ai-search", methods=["POST"])
def ai_search():
    """Natural-language search: the model picks matching product names."""
    try:
        data = request.get_json(silent=True)
        if not data or "query" not in data:
            return jsonify([])

        query = data["query"].strip()
        if not query:
            return jsonify([])

        print("🔍 Query:", query)

        products_docs = list(db.collection_group("items").stream())

        product_names = []
        for doc in products_docs:
            p = doc.to_dict()
            if p.get("Name"):
                product_names.append(p["Name"])

        matched_names = chatgpt_search(query, product_names)

        results = []
        for doc in products_docs:
            p = doc.to_dict()
            if p.get("Name") in matched_names:
                results.append({
                    "item_id": doc.id,
                    "category": p.get("Category"),
                    "name": p.get("Name"),
                    "price": p.get("price", "N/A"),
                    "imageUrl": p.get("imageUrl")  # needed by the results page
                })

        return jsonify(results)

    except Exception as e:
        print("🔥 AI SEARCH CRASH:", e)
        return jsonify({"error": "internal error"}), 500


@app.route("/ai-product", methods=["POST"])
def ai_product():
    """Answer a customer's question about the product they are viewing."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "missing data"}), 400

    question = data.get("question", "").strip()
    product = data.get("product", {})

    if not question or not product:
        return jsonify({"error": "missing data"}), 400

    prompt = f"""
You are a helpful product advisor for an academic demo project.

Product name:
{product.get("name")}

Product description:
{product.get("description")}

User question:
"{question}"

Rules:
- Answer clearly
- No medical advice
- Answer in Hebrew
"""

    response = client.responses.create(
        model="gpt-4.1",
        input=prompt
    )

    return jsonify({
        "answer": response.output_text
    })


# =====================
# RUN
# =====================
if __name__ == "__main__":
    app.run(debug=True)  # development server only
