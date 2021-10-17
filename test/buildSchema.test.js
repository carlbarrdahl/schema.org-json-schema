import { buildSchema, generateSchemas } from "../src/buildSchema.mjs";
import schema from "../src/schema.json";

test("build schema", () => {
  const actual = generateSchemas(schema["@graph"]);

  console.log(JSON.stringify(actual, null, 2));
  // expect(actual).toBe({});
});
