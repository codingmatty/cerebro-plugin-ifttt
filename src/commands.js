const cache = require('./cache');

const commands = [];

export function initialize() {
  cache.load().then(({ commands: savedCommands }) => {
    Object.assign(commands, savedCommands);
  });
}

export function register(command) {
  commands.push(command);
  cache.save({ commands })
    .then(() => new Notification(`Command ${command.slug} Registered`));
}

export function unregister(command) {
  const commandIndex = commands.map(({ slug }) => slug).indexOf(command);
  if (commandIndex > 0) {
    commands.splice(commandIndex, 1);
  }
  cache.save({ commands })
    .then(() => new Notification(`Command ${command} Deleted`));
}

export function clear() {
  commands.length = 0;
  cache.save({ commands })
    .then(() => new Notification(`Registered Commands Cleared`));
}

export function search(command, { exact } = {}) {
  return commands.filter(({ slug }) => exact ? slug === command : slug.startsWith(command));
}
