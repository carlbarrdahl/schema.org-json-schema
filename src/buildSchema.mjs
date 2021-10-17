import { writeFile } from "node:fs/promises";

const schemaDraftVersion = "http://json-schema.org/draft-07/schema#";

function findNode(graph) {
  return (id) => graph.find((g) => g["@id"] === id);
}
function toArray(node) {
  return Object.values(node || {}).map((n) => n["@id"] || n);
}

export function buildSchema(schema, graph) {
  console.log("schema", schema);

  const id = schema["@id"];
  const title = schema["rdfs:label"];
  const description = schema["rdfs:comment"];
  const definitions = {};

  function buildNode(node) {
    const id = node["@id"];
    const title = node["rdfs:label"];
    const description = node["rdfs:comment"];
    definitions[id] = {};
    if (id === "schema:Text") {
      definitions[id] = { type: "string", title, description };
      return;
    }
    const properties = graph
      .filter((g) => toArray(g["schema:domainIncludes"]).some((p) => p === id))
      .reduce((props, n) => {
        let title = n["rdfs:label"];
        if (title["@value"]) {
          title = title["@value"];
        }
        const anyOf = toArray(n["schema:rangeIncludes"])
          .map(findNode(graph))
          .filter((n) => n["@type"] === "rdfs:Class")
          .map((n) => {
            if (!definitions[n["@id"]]) {
              buildNode(n);
            }

            return {
              title: n["rdfs:label"],
              description: n["rdfs:comment"],
              type: "array",
              items: { $ref: "#/definitions/" + n["@id"] },
            };
          });
        return {
          ...props,
          [n["@id"]]: {
            title,
            description: n["rdfs:comment"],
            type: anyOf.length ? "object" : "string",
            anyOf: anyOf.length ? anyOf : undefined,
          },
        };
      }, {});
    if (Object.values(properties).length) {
      definitions[id].properties = properties;
    }
    const allOf = toArray(node["rdfs:subClassOf"])
      .map(findNode(graph))
      .map((n) => {
        buildNode(n);

        return {
          title: n["rdfs:label"],
          $ref: "#/definitions/" + n["@id"],
        };
      });

    definitions[id].allOf = allOf;
  }

  buildNode(schema);

  return {
    $schema: schemaDraftVersion,
    $id: id,
    title,
    description,
    type: "object",
    allOf: [{ $ref: "#/definitions/" + id }],
    definitions,
  };
}

export function generateSchemas(graph) {
  return [graph.find((n) => n["@id"] === "schema:Person")].map((node) => {
    const schema = buildSchema(node, graph);

    writeFile("./out.json", JSON.stringify(schema, null, 2));

    return schema;
  });
}
