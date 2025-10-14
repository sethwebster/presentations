// In-memory pub/sub for local development (when KV is not available)
const subscribers = new Map(); // channel -> Set of controllers
const state = new Map(); // deck state storage

export const devPubSub = {
  async hset(key, value) {
    state.set(key, { ...state.get(key), ...value });
  },

  async hgetall(key) {
    return state.get(key) || {};
  },

  async publish(channel, message) {
    const subs = subscribers.get(channel);
    if (subs) {
      subs.forEach(controller => {
        try {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch (e) {
          // Controller might be closed
        }
      });
    }
  },

  subscribe(channel, controller) {
    if (!subscribers.has(channel)) {
      subscribers.set(channel, new Set());
    }
    subscribers.get(channel).add(controller);

    return {
      unsubscribe: () => {
        const subs = subscribers.get(channel);
        if (subs) {
          subs.delete(controller);
        }
      }
    };
  }
};
