// src/core/GameScheduler.js
// Game-time timers: advance only while gameplay runs, so an admin pause freezes them too

export class GameScheduler {
  constructor() {
    this.tasks = [];
  }

  after(seconds, fn) {
    this.tasks.push({ remaining: seconds, fn });
  }

  update(dt) {
    if (this.tasks.length === 0) return;
    const due = [];
    this.tasks = this.tasks.filter((task) => {
      task.remaining -= dt;
      if (task.remaining <= 0) {
        due.push(task.fn);
        return false;
      }
      return true;
    });
    due.forEach((fn) => fn());
  }

  clear() {
    this.tasks = [];
  }
}
