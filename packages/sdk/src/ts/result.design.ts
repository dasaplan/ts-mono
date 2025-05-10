// @ts-nocheck

const a: Result<string, Error> = Result.try(() => "1");
const b: Result<number, Error> = a.onOk((str) => Number.parseInt(str));
const c: Result<number, "foo"> = b.onErr((err) => err.message);

// async
const a: Result<Promise<string>, Error> = Result.try(() => Promise.resolve("1"));
const b: Result<Promise<number>, Error> = a.onOk(async (str: Promise<string>) => {
  const awaited = await str;
  return Number.parseInt(awaited);
});

if (await b.success) {
  /* do stuff*/
}
const c: number = await b.unsafeGet();
const d: Result<Promise<number>, string> = b.onErr((err) => err.message);
