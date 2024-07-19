/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, test } from "vitest";
import { EndpointDefinition } from "../endpoint-definition.js";

describe("express endpoint generator", () => {
  test("compiles types without error", async () => {
    interface GetPetEndpoint
      extends EndpointDefinition<
        {
          200: { message: string };
          201: undefined;
        },
        undefined,
        undefined
      > {
      name: "getPet";
      operation: "get";
      path: `/pets/{:petId}`;
    }

    interface UpdatePetEndpointDefinition
      extends EndpointDefinition<
        {
          200: { message: string };
          201: undefined;
        },
        undefined,
        undefined
      > {
      name: "updatePet";
      operation: "put";
      path: `/pets/{:petId}`;
    }

    // no error
    const _a: GetPetEndpoint = {
      name: "getPet",
      operation: "get",
      path: `/pets/{:petId}`,
      response: {
        201: {
          payload: undefined,
          format: undefined,
        },
        200: {
          payload: {
            message: "",
          },
          format: undefined,
        },
      },
    };
  });
});
