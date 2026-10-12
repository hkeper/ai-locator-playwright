export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required env variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}
