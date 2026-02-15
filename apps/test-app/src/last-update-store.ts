/**
 * @fileoverview Implements last update store.
 */
const bootTime = new Date().toISOString();
let lastUpdateTime = bootTime;

const lastUpdateStore = {
  read() {
    return lastUpdateTime;
  },
  update(value: string) {
    lastUpdateTime = value;
  },
};

export { lastUpdateStore };
