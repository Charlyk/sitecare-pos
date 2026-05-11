# Notifications Reference

Two real-time notification mechanisms are active in the Central API:

| Mechanism | Transport | When received | Requires auth |
|-----------|-----------|---------------|---------------|
| SSE | HTTP persistent connection | Only while connected | Session cookie (owner / kitchen / cashier / courier) |
| FCM push | Firebase Cloud Messaging | Foreground and background | No (token registered at login) |

---

## SSE Events

**Endpoint:** `GET /v1/sse/orders`

The stream opens with a snapshot of all non-terminal orders (each emitted as `order_new`), then stays open for live events. All registered restaurant clients (desktop, mobile, kitchen display) receive the same broadcast.

### `order_new`

Fired when a new order appears in the restaurant's queue.

**Triggers:**
- Customer places an order via `POST /v1/orders` (public endpoint)
- Staff creates a walk-in order via `POST /v1/kitchen/orders`

**Payload:** full order object (same shape as `GET /v1/orders/:id`)

```
event: order_new
data: { ...fullOrder }
```

### `order_status_changed`

Fired whenever a status transition is applied by staff.

**Triggers:**
- `PATCH /v1/orders/:id/status`

**Payload:**

```
event: order_status_changed
data: {
  "orderId":    "<uuid>",
  "fromStatus": "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED",
  "toStatus":   "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED",
  "updatedAt":  "<ISO 8601>"
}
```

### `ping`

Keepalive emitted every 30 seconds to maintain the connection through proxies and load balancers.

```
event: ping
data: ""
```

---

## FCM Push Notifications

Push is dispatched fire-and-forget from `src/lib/push-service.ts`. All registered tokens for the restaurant receive the notification (android and iOS, up to 500 per batch). Stale tokens (`UNREGISTERED`, `INVALID_ARGUMENT`, `INVALID_REGISTRATION_TOKEN`) are automatically deleted. Transient errors are logged and the token is retained.

Both a `notification` object (shown by the OS) and a `data` object (available to the app) are included. All `data` values are strings (FCM requirement).

---

### `order_new` push

Sent when a customer places an order via `POST /v1/orders`.

> Walk-in orders created via `POST /v1/kitchen/orders` do **not** trigger an FCM push — only SSE.

**Notification (displayed by OS):**

| Field | Value |
|-------|-------|
| `title` | `Comandă nouă #<dailyNumber>` (or `Comandă nouă` if number unavailable) |
| `body` | `<customerName> · <total / 100> RON` |

**Android extras:** `android.priority = "high"`

**iOS extras:** `apns.payload.aps.contentAvailable = true`, `sound = "default"`

**Data payload (strings):**

| Key | Example |
|-----|---------|
| `type` | `"order_new"` |
| `orderId` | `"clxyz..."` |
| `restaurantId` | `"clr123..."` |
| `orderType` | `"delivery"` |
| `customerName` | `"Ion Popescu"` |
| `dailyNumber` | `"42"` |
| `estimatedMinutes` | `"30"` (empty string if not set) |
| `totalAmount` | `"4500"` (bani, divide by 100 for RON) |

---

### `order_status_changed` push

Sent whenever staff transitions an order status via `PATCH /v1/orders/:id/status`.

**Notification (displayed by OS):**

| `toStatus` | `title` |
|------------|---------|
| `ACCEPTED` | `Comandă #<N> acceptată` |
| `PREPARING` | `Comandă #<N> în preparare` |
| `READY` | `Comandă #<N> gata` |
| `OUT_FOR_DELIVERY` | `Comandă #<N> la livrare` |
| `COMPLETED` | `Comandă #<N> finalizată` |
| `CANCELLED` | `Comandă #<N> anulată` |

`body`: `<customerName> · <total / 100> RON` (same format as `order_new`)

**Android extras:** `android.priority = "high"`

**iOS extras:** `apns.payload.aps.contentAvailable = true`, `sound = "default"`

**Data payload (strings):**

| Key | Example |
|-----|---------|
| `type` | `"order_status_changed"` |
| `orderId` | `"clxyz..."` |
| `restaurantId` | `"clr123..."` |
| `orderType` | `"delivery"` |
| `customerName` | `"Ion Popescu"` |
| `dailyNumber` | `"42"` |
| `fromStatus` | `"NEW"` |
| `toStatus` | `"ACCEPTED"` |
| `totalAmount` | `"4500"` (bani) |

---

## Token registration

Mobile apps register their FCM token after login:

```
POST /v1/admin/push-tokens
Authorization: <session cookie or bearer token>
Body: { "fcmToken": "<token>", "platform": "android" | "ios", "deviceId": "<stable device id>" }
```

Tokens are scoped to `(userId, restaurantId, deviceId)`. Re-registering an existing token is safe (upsert). Tokens are deleted automatically on repeated FCM rejection.

---

## Trigger matrix

| Action | SSE `order_new` | SSE `order_status_changed` | FCM `order_new` | FCM `order_status_changed` |
|--------|:-:|:-:|:-:|:-:|
| Customer places order (`POST /v1/orders`) | ✓ | | ✓ | |
| Staff creates walk-in (`POST /v1/kitchen/orders`) | ✓ | | | |
| Staff updates status (`PATCH /v1/orders/:id/status`) | | ✓ | | ✓ |
| SSE snapshot on connect | ✓ (all active orders) | | | |
