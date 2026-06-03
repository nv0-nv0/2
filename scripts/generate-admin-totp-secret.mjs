import crypto from 'node:crypto';

function base32Secret(bytes = 20) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const data = crypto.randomBytes(bytes);
  let bits = '';
  let out = '';
  for (const byte of data) bits += byte.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += alphabet[Number.parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}

const secret = base32Secret(20);
const args = new Set(process.argv.slice(2));
if (args.has('--value-only')) {
  process.stdout.write(`${secret}\n`);
} else if (args.has('--env-line')) {
  process.stdout.write(`NV0_ADMIN_TOTP_SECRET=${secret}\n`);
} else {
  process.stdout.write('Dedicated TOTP Base32 secret generated locally.\n');
  process.stdout.write('Normal View value: copy the raw value emitted by --value-only.\n');
  process.stdout.write('Developer View line: use --env-line.\n');
}
