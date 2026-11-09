import firebase_admin
from firebase_admin import credentials, firestore
from openai import OpenAI

cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

client = OpenAI()  # uses OPENAI_API_KEY

def get_embedding(text: str):
    res = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return res.data[0].embedding

def main():
    products = db.collection_group("items").stream()

    for doc in products:
        p = doc.to_dict()

        description = p.get("Description")
        if not description:
            print("⏭️ Skipped:", doc.id)
            continue

        emb = get_embedding(description)

        doc.reference.update({
            "embedding": emb
        })

        print("✅ Embedded:", p.get("Name", doc.id))

    print("🎉 DONE")

if __name__ == "__main__":
    main()
