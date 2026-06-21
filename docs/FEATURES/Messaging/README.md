# Messaging Module

> Purpose: Internal real-time messaging between school staff.

---

## Responsibilities
- Inter-staff messaging (teachers, admin, finance, etc.)
- Conversation management
- Message read tracking
- Real-time (or polling-based) message delivery

## Features
- Conversation creation with multiple participants
- Message sending and receiving
- Read receipts
- Message history
- Unread message count
- Integration with notification system

## Database Entities
- `Conversation` — id, schoolId, title, createdAt
- `ConversationParticipant` — id, conversationId, userId, lastReadAt
- `Message` — id, conversationId, senderId, body, createdAt
- `MessageRead` — id, messageId, userId, readAt

## Permissions
- All staff roles: Participate in conversations
- `ADMIN`: View all conversations (oversight)

## Related Documents
- `backend/src/messaging/`
- `frontend/src/lib/api/communications.ts`
- `frontend/src/app/(dashboard)/messages/`
- `docs/FEATURES/Communication/README.md`
