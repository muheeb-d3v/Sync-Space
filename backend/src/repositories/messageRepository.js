import Message from "../schema/message.js";
import crudRepository from "./crudRepository.js";


const messageRepository = {
    ...crudRepository(Message),
    getPaginatedMessages: async (messageParams , page ,limit) => {
        const messages  = await Message.find(messageParams)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('senderId', 'username email avatar')
        .populate('channelId', 'name')
        .populate('workspaceId')
        return messages;
    },

    /**
     * Atomically toggle one user's reaction on a message.
     *
     * The operation is expressed as targeted updates so two people reacting at
     * the same time cannot overwrite each other's reaction list.
     */
    toggleReaction: async (messageId, userId, emoji) => {
        const populateSender = (query) =>
            query.populate('senderId', 'username email avatar');

        // 1. Already reacted → remove it.
        const removed = await populateSender(
            Message.findOneAndUpdate(
                {
                    _id: messageId,
                    reactions: { $elemMatch: { emoji, users: userId } }
                },
                { $pull: { 'reactions.$.users': userId } },
                { new: true, timestamps: false }
            )
        );
        if (removed) {
            // Drop buckets that no longer have any users (condition is
            // re-evaluated by Mongo, so a concurrent add is preserved).
            const cleaned = await populateSender(
                Message.findOneAndUpdate(
                    { _id: messageId },
                    { $pull: { reactions: { users: { $size: 0 } } } },
                    { new: true, timestamps: false }
                )
            );
            return cleaned ?? removed;
        }

        // 2. Existing bucket for this emoji → add the user.
        const added = await populateSender(
            Message.findOneAndUpdate(
                { _id: messageId, 'reactions.emoji': emoji },
                { $addToSet: { 'reactions.$.users': userId } },
                { new: true, timestamps: false }
            )
        );
        if (added) return added;

        // 3. First reaction with this emoji → create the bucket.
        const created = await populateSender(
            Message.findOneAndUpdate(
                { _id: messageId, 'reactions.emoji': { $ne: emoji } },
                { $push: { reactions: { emoji, users: [userId] } } },
                { new: true, timestamps: false }
            )
        );
        if (created) return created;

        // 4. Lost a race creating the bucket → add to the one just created.
        return populateSender(
            Message.findOneAndUpdate(
                { _id: messageId, 'reactions.emoji': emoji },
                { $addToSet: { 'reactions.$.users': userId } },
                { new: true, timestamps: false }
            )
        );
    }
}

export default messageRepository;