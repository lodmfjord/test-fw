const bootTime = new Date().toISOString();
let lastUpdateTime = bootTime;

export const lastUpdateStore = {
  read() {
    return lastUpdateTime;
  },
  update(value: string) {
    lastUpdateTime = value;
  },
};
