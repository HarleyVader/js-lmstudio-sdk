import readline from 'readline';

export function initReadline() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.setMaxListeners(20);
  return rl;
}