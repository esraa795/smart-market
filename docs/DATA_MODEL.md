# Firestore data model

Inferred from the application code. Collection and field names are case-sensitive.

| Path | Purpose | Fields |
|---|---|---|
| `products/{category}` | One document per category; the document ID is the category name shown to customers | `image` (category card image: URL or static path) |
| `products/{category}/items/{itemId}` | Products of a category | `Name`, `Category` (lower-case), `Description`, `price` (number), `imageUrl` (Firebase Storage download URL), `embedding` (optional array written by `embed_products.py`) |
| `users/{uid}` | Profile and role of every account (`uid` = Firebase Auth UID) | `firstName`, `lastName`, `email`, `phone`, `address`, `role` (`customer`, `worker` or `admin`), `admin` (boolean, `true` opens the admin panel), `createdAt` |
| `users/{uid}/cart/{productId}` | Cart lines of a customer | `productId`, `name`, `price`, `imageUrl`, `qty`, `addedAt`, `updatedAt` |
| `users/{uid}/favorites/{productId}` | Wishlist of a customer | `productId`, `name`, `price`, `imageUrl`, `addedAt` |
| `orders/{orderId}` | Orders created at checkout | `userId`, `items` (array of cart lines), `total`, `status`, `createdAt`; optional `customerName`, `externalOrderId`, `source` (orders created through the staff app's sync/demo endpoints) |
| `notifications/{id}` | Messages shown to a customer when staff update an order | `userId`, `orderId`, `message`, `type` (`ready_for_pickup` or `delivered`), `read`, `createdAt` |
| `contact_requests/{id}` | "Contact us" requests and complaints | `fullName`, `phone`, `email`, `reason`, `status` (`new` or `handled`), `createdAt`; set by admins: `adminNote`, `noteUpdatedAt`, `noteUpdatedBy`, `handledAt`, `handledBy` |

**Order status flow:** `paid` (or `pending`) → `ready_for_pickup` → `delivered`.
The staff app only accepts a transition from the expected previous status.

**Firebase Storage:** product images are uploaded from the admin panel to `products/{category}/{productId}.{ext}`.

## Minimal sample data

Enough to see the customer app working (create it in the Firestore console):

```text
products/baby                      image: "/static/images/category-1.png"
products/baby/items/baby-wipes-001 Name: "Baby Wipes"
                                   Category: "baby"
                                   Description: "Gentle wipes for sensitive skin"
                                   price: 12.9
                                   imageUrl: "https://example.com/baby-wipes.jpg"
```

Use made-up names and e-mail addresses for test accounts: never real customer data.
