type CookieWrite<TOptions extends { maxAge?: number }> = {
  name: string;
  value: string;
  options?: TOptions;
};

type CookieJar<TOptions extends { maxAge?: number }> = {
  getAll(): Array<{ name: string }>;
  set(name: string, value: string, options?: TOptions & { maxAge?: number }): unknown;
};

function chunkBase(name: string) {
  return name.replace(/\.\d+$/, "");
}

export function writeAuthCookieChunks<TOptions extends { maxAge?: number }>(
  jar: CookieJar<TOptions>,
  values: CookieWrite<TOptions>[],
) {
  const incomingNames = new Set(values.map(({ name }) => name));
  const optionsByBase = new Map<string, TOptions | undefined>();
  for (const cookie of values) optionsByBase.set(chunkBase(cookie.name), cookie.options);

  for (const { name } of jar.getAll()) {
    const options = optionsByBase.get(chunkBase(name));
    if (optionsByBase.has(chunkBase(name)) && !incomingNames.has(name)) {
      jar.set(name, "", Object.assign({}, options, { maxAge: 0 }));
    }
  }

  for (const { name, value, options } of values) jar.set(name, value, options);
}
