import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

def main():
    docs = list(db.collection("products").stream())
    print(f"Checked {len(docs)} products")

    for doc in docs:
        p = doc.to_dict()
        print("OK:", p.get("Name", doc.id))

    print("DONE ✅")

if __name__ == "__main__":
    main()
