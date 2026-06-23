type Listener = (...args: any[]) => void;

class CustomEventEmitter {
  private events: { [key: string]: Listener[] } = {};

  public on(event: string, listener: Listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  public off(event: string, listener?: Listener) {
    if (!this.events[event]) return this;
    if (listener === undefined) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    }
    return this;
  }

  public emit(event: string, ...args: any[]) {
    if (!this.events[event]) return false;
    this.events[event].forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error(`Error in event listener for ${event}`, e);
      }
    });
    return true;
  }
}

export const EventBus = new CustomEventEmitter();
export default EventBus;
